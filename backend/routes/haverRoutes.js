const express = require("express");
const router = express.Router();
const { authUser } = require("../middleware/authUser");
const { Cliente } = require("../models/Cliente");
const MovimentoHaver = require("../models/MovimentoHaver");
const { sequelize } = require("../models/Cliente");

// Interpreta data como Brasília (UTC-3) quando não há fuso explícito
function parseDateBrasilia(data) {
  if (!data) return new Date();
  // Já tem fuso (Z, +, ou -XX:XX no final) → parse direto
  if (/Z$|[+-]\d{2}:\d{2}$/.test(String(data))) return new Date(data);
  // Sem fuso → assumir Brasília UTC-3
  return new Date(String(data) + "-03:00");
}

router.use(authUser);

// GET /api/haver/:clienteId - listar movimentos e saldo
router.get("/:clienteId", async (req, res) => {
  try {
    const { clienteId } = req.params;
    const empresaId = req.user?.empresaId;

    const cliente = await Cliente.findOne({
      where: { id: clienteId, ...(empresaId ? { empresa_id: empresaId } : {}) },
      attributes: ["id", "nome", "saldo_haver"],
    });

    if (!cliente) {
      return res
        .status(404)
        .json({ success: false, error: "Cliente não encontrado" });
    }

    const movimentos = await MovimentoHaver.findAll({
      where: { clienteId, ...(empresaId ? { empresa_id: empresaId } : {}) },
      order: [["data", "DESC"]],
      limit: 200,
    });

    return res.json({
      success: true,
      saldo: parseFloat(cliente.saldo_haver) || 0,
      movimentos: movimentos.map((m) => m.toJSON()),
    });
  } catch (err) {
    console.error("Erro GET /api/haver/:clienteId", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/haver/:clienteId/adiantamento - lançar adiantamento (crédito)
router.post("/:clienteId/adiantamento", async (req, res) => {
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

    const saldoAtual = parseFloat(cliente.saldo_haver) || 0;
    const valorNum = parseFloat(valor);
    const novoSaldo = saldoAtual + valorNum;

    await cliente.update({ saldo_haver: novoSaldo }, { transaction: t });

    const mov = await MovimentoHaver.create(
      {
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        tipo: "entrada",
        operacao: "Adiantamento",
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
      message: "Adiantamento registrado com sucesso",
      saldo: novoSaldo,
      movimento: mov.toJSON(),
    });
  } catch (err) {
    await t.rollback();
    console.error("Erro POST /api/haver/:clienteId/adiantamento", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/haver/:clienteId/utilizar - debitar haver (utilizado em venda)
// Chamado internamente pelo criarVenda quando forma de pagamento inclui 'haver'
router.post("/:clienteId/utilizar", async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { clienteId } = req.params;
    const { valor, observacao, vendaId } = req.body;
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

    const saldoAtual = parseFloat(cliente.saldo_haver) || 0;
    const valorNum = parseFloat(valor);

    if (valorNum > saldoAtual) {
      await t.rollback();
      return res
        .status(400)
        .json({ success: false, error: "Saldo insuficiente de haver" });
    }

    const novoSaldo = saldoAtual - valorNum;
    await cliente.update({ saldo_haver: novoSaldo }, { transaction: t });

    const mov = await MovimentoHaver.create(
      {
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        tipo: "saida",
        operacao: vendaId
          ? `Utilizado em Venda #${vendaId}`
          : "Utilizado em venda",
        valor: valorNum,
        saldoApos: novoSaldo,
        observacao: observacao || null,
        usuarioId: usuarioId || null,
        usuarioNome: usuarioNome,
        vendaId: vendaId || null,
        empresa_id: empresaId || null,
        data: new Date(),
      },
      { transaction: t },
    );

    await t.commit();

    return res.json({
      success: true,
      saldo: novoSaldo,
      movimento: mov.toJSON(),
    });
  } catch (err) {
    await t.rollback();
    console.error("Erro POST /api/haver/:clienteId/utilizar", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
