const { Orcamento } = require("../models/Orcamento");
const { Op } = require("sequelize");

// Listar orçamentos com filtros
exports.listarOrcamentos = async (req, res) => {
  try {
    const { dataInicio, dataFim, status, q } = req.query;
    const where = {};

    if (dataInicio && dataFim) {
      where.data = {
        [Op.between]: [
          new Date(dataInicio + " 00:00:00"),
          new Date(dataFim + " 23:59:59"),
        ],
      };
    }

    if (status && status !== "todos") {
      where.status = status;
    }

    if (q) {
      where[Op.or] = [
        { cliente: { [Op.like]: `%${q}%` } },
        { id: isNaN(q) ? undefined : Number(q) },
      ].filter((c) => Object.values(c)[0] !== undefined);
    }

    const orcamentos = await Orcamento.findAll({
      where,
      order: [["data", "DESC"]],
    });

    res.json({ orcamentos });
  } catch (error) {
    console.error("Erro ao listar orçamentos:", error);
    res.status(500).json({ erro: "Erro ao listar orçamentos" });
  }
};

// Buscar orçamento por ID
exports.buscarOrcamento = async (req, res) => {
  try {
    const orcamento = await Orcamento.findByPk(req.params.id);
    if (!orcamento) {
      return res.status(404).json({ erro: "Orçamento não encontrado" });
    }
    res.json(orcamento);
  } catch (error) {
    console.error("Erro ao buscar orçamento:", error);
    res.status(500).json({ erro: "Erro ao buscar orçamento" });
  }
};

// Criar orçamento
exports.criarOrcamento = async (req, res) => {
  try {
    const dados = { ...req.body };

    // Calcular totais
    const itens = Array.isArray(dados.itens) ? dados.itens : [];
    let subtotal = 0;
    let totalDesconto = 0;

    itens.forEach((item) => {
      const qty = parseFloat(item.quantidade || 1);
      const preco = parseFloat(item.valorUnitario || 0);
      const desconto = parseFloat(item.desconto || 0);
      const bruto = qty * preco;
      const descVal = (bruto * desconto) / 100;
      subtotal += bruto;
      totalDesconto += descVal;
    });

    dados.totais = {
      subtotal: subtotal.toFixed(2),
      desconto: totalDesconto.toFixed(2),
      total: (subtotal - totalDesconto).toFixed(2),
    };

    if (!dados.status) dados.status = "pendente";

    const orcamento = await Orcamento.create(dados);
    res.status(201).json(orcamento);
  } catch (error) {
    console.error("Erro ao criar orçamento:", error);
    res.status(500).json({ erro: "Erro ao criar orçamento" });
  }
};

// Atualizar orçamento
exports.atualizarOrcamento = async (req, res) => {
  try {
    const orcamento = await Orcamento.findByPk(req.params.id);
    if (!orcamento) {
      return res.status(404).json({ erro: "Orçamento não encontrado" });
    }

    const dados = { ...req.body };

    // Recalcular totais se itens foram alterados
    if (dados.itens) {
      const itens = Array.isArray(dados.itens) ? dados.itens : [];
      let subtotal = 0;
      let totalDesconto = 0;

      itens.forEach((item) => {
        const qty = parseFloat(item.quantidade || 1);
        const preco = parseFloat(item.valorUnitario || 0);
        const desconto = parseFloat(item.desconto || 0);
        const bruto = qty * preco;
        const descVal = (bruto * desconto) / 100;
        subtotal += bruto;
        totalDesconto += descVal;
      });

      dados.totais = {
        subtotal: subtotal.toFixed(2),
        desconto: totalDesconto.toFixed(2),
        total: (subtotal - totalDesconto).toFixed(2),
      };
    }

    await orcamento.update(dados);
    res.json(orcamento);
  } catch (error) {
    console.error("Erro ao atualizar orçamento:", error);
    res.status(500).json({ erro: "Erro ao atualizar orçamento" });
  }
};

// Deletar orçamento
exports.deletarOrcamento = async (req, res) => {
  try {
    const orcamento = await Orcamento.findByPk(req.params.id);
    if (!orcamento) {
      return res.status(404).json({ erro: "Orçamento não encontrado" });
    }
    await orcamento.destroy();
    res.json({ mensagem: "Orçamento excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar orçamento:", error);
    res.status(500).json({ erro: "Erro ao deletar orçamento" });
  }
};
