const express = require("express");
const router = express.Router();
const { authUser } = require("../middleware/authUser");
const { Cliente } = require("../models/Cliente");
const MovimentoCrediario = require("../models/MovimentoCrediario");
const { MovimentoCaixa } = require("../models/MovimentoCaixa");
const { sequelize } = require("../models/Cliente");

// Interpreta data como Brasília (UTC-3) quando não há fuso explícito
function parseDateBrasilia(data) {
  if (!data) return new Date();
  if (/Z$|[+-]\d{2}:\d{2}$/.test(String(data))) return new Date(data);
  return new Date(String(data) + "-03:00");
}

router.use(authUser);

// GET /api/crediario/:clienteId - listar movimentos e saldo
router.get("/:clienteId", async (req, res) => {
  try {
    const { clienteId } = req.params;
    const empresaId = req.user?.empresaId;

    const cliente = await Cliente.findOne({
      where: { id: clienteId, ...(empresaId ? { empresa_id: empresaId } : {}) },
      attributes: ["id", "nome", "saldo_crediario"],
    });

    if (!cliente) {
      return res
        .status(404)
        .json({ success: false, error: "Cliente não encontrado" });
    }

    const movimentos = await MovimentoCrediario.findAll({
      where: { clienteId, ...(empresaId ? { empresa_id: empresaId } : {}) },
      order: [["data", "DESC"]],
      limit: 200,
    });

    return res.json({
      success: true,
      saldo: parseFloat(cliente.saldo_crediario) || 0,
      movimentos: movimentos.map((m) => m.toJSON()),
    });
  } catch (err) {
    console.error("Erro GET /api/crediario/:clienteId", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/crediario/:clienteId/debito - lançar débito no crediário
router.post("/:clienteId/debito", async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { clienteId } = req.params;
    const { valor, observacao, data } = req.body;
    const empresaId = req.user?.empresaId;
    const usuarioId = req.user?.id;
    const usuarioNome = req.user?.nome || req.user?.email || null;

    if (!valor || isNaN(parseFloat(valor)) || parseFloat(valor) <= 0) {
      await t.rollback();
      return res.status(400).json({ success: false, error: "Valor inválido" });
    }

    const cliente = await Cliente.findOne({
      where: { id: clienteId, ...(empresaId ? { empresa_id: empresaId } : {}) },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!cliente) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, error: "Cliente não encontrado" });
    }

    const saldoAtual = parseFloat(cliente.saldo_crediario) || 0;
    const valorNum = parseFloat(valor);
    const novoSaldo = saldoAtual + valorNum;

    await cliente.update({ saldo_crediario: novoSaldo }, { transaction: t });

    const mov = await MovimentoCrediario.create(
      {
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        tipo: "debito",
        operacao: "Débito lançado",
        valor: valorNum,
        saldoApos: novoSaldo,
        observacao: observacao || null,
        usuarioId: usuarioId || null,
        usuarioNome: usuarioNome,
        empresa_id: empresaId || null,
        data: data ? parseDateBrasilia(data) : new Date(),
      },
      { transaction: t },
    );

    await t.commit();

    return res.json({
      success: true,
      message: "Débito registrado com sucesso",
      saldo: novoSaldo,
      movimento: mov.toJSON(),
    });
  } catch (err) {
    await t.rollback();
    console.error("Erro POST /api/crediario/:clienteId/debito", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/crediario/:clienteId/receber - receber/quitar valor do crediário
router.post("/:clienteId/receber", async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { clienteId } = req.params;
    const { valor, formaPagamento, observacao, data, caixaId } = req.body;
    const empresaId = req.user?.empresaId;
    const usuarioId = req.user?.id;
    const usuarioNome = req.user?.nome || req.user?.email || null;

    if (!valor || isNaN(parseFloat(valor)) || parseFloat(valor) <= 0) {
      await t.rollback();
      return res.status(400).json({ success: false, error: "Valor inválido" });
    }

    const cliente = await Cliente.findOne({
      where: { id: clienteId, ...(empresaId ? { empresa_id: empresaId } : {}) },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!cliente) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, error: "Cliente não encontrado" });
    }

    const saldoAtual = parseFloat(cliente.saldo_crediario) || 0;
    const valorNum = parseFloat(valor);

    if (valorNum > saldoAtual + 0.001) {
      await t.rollback();
      return res
        .status(400)
        .json({ success: false, error: "Valor maior que o saldo devedor" });
    }

    const novoSaldo = Math.max(0, saldoAtual - valorNum);
    await cliente.update({ saldo_crediario: novoSaldo }, { transaction: t });

    const formaLabel = (() => {
      const map = {
        dinheiro: "Dinheiro",
        pix: "PIX",
        debito: "Débito",
        credito: "Crédito",
        transferencia: "Transferência",
        cheque: "Cheque",
      };
      return (
        map[String(formaPagamento || "").toLowerCase()] ||
        formaPagamento ||
        "Outro"
      );
    })();

    const mov = await MovimentoCrediario.create(
      {
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        tipo: "credito",
        operacao: `Recebimento via ${formaLabel}`,
        formaPagamento: formaPagamento || null,
        valor: valorNum,
        saldoApos: novoSaldo,
        observacao: observacao || null,
        usuarioId: usuarioId || null,
        usuarioNome: usuarioNome,
        empresa_id: empresaId || null,
        data: data ? parseDateBrasilia(data) : new Date(),
      },
      { transaction: t },
    );

    // Registrar como movimento de caixa (entrada financeira) — mesmo fluxo da nova venda
    try {
      await MovimentoCaixa.create(
        {
          tipo: "entrada",
          observacao: `Recebimento crediário - ${cliente.nome} - ${formaLabel}${observacao ? " - " + observacao : ""}`,
          valor: valorNum,
          data: data ? parseDateBrasilia(data) : new Date(),
          usuarioId: usuarioId || null,
          caixaId: caixaId || null,
        },
        { transaction: t },
      );
    } catch (caixaErr) {
      // Não bloquear o recebimento se falhar o movimento de caixa
      console.warn(
        "[crediário receber] Falha ao registrar MovimentoCaixa:",
        caixaErr.message,
      );
    }

    await t.commit();

    return res.json({
      success: true,
      message: "Recebimento registrado com sucesso",
      saldo: novoSaldo,
      movimento: mov.toJSON(),
    });
  } catch (err) {
    await t.rollback();
    console.error("Erro POST /api/crediario/:clienteId/receber", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
