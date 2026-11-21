const { Orcamento } = require("../models/Orcamento");
const { Op } = require("sequelize");
const { Cliente } = require("../models");
async function validarCliente(dados, empresaId) {
  if (dados.clienteId != null) {
    const c = await Cliente.findOne({
      where: { id: dados.clienteId, empresa_id: empresaId },
    });
    if (!c)
      throw Object.assign(Error("Cliente não encontrado nesta empresa."), {
        status: 404,
      });
  }
}

const { calcularItens, totaisItens } = require("../services/orcamentoDados");

// Listar orçamentos com filtros
exports.listarOrcamentos = async (req, res) => {
  try {
    const { dataInicio, dataFim, status, q } = req.query;
    const where = { empresa_id: req.user.empresaId };

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
    res.status(error.status || 500).json({ erro: "Erro ao listar orçamentos" });
  }
};

// Buscar orçamento por ID
exports.buscarOrcamento = async (req, res) => {
  try {
    const orcamento = await Orcamento.findOne({
      where: { id: req.params.id, empresa_id: req.user.empresaId },
    });
    if (!orcamento) {
      return res.status(404).json({ erro: "Orçamento não encontrado" });
    }
    res.json(orcamento);
  } catch (error) {
    console.error("Erro ao buscar orçamento:", error);
    res.status(error.status || 500).json({ erro: "Erro ao buscar orçamento" });
  }
};

// Criar orçamento
exports.criarOrcamento = async (req, res) => {
  try {
    const dados = Object.fromEntries(
      [
        "cliente",
        "clienteId",
        "clienteTelefone",
        "profissional",
        "profissionalId",
        "condicaoPagamento",
        "informacoesAdicionais",
        "status",
        "itens",
      ]
        .filter((k) => req.body[k] !== undefined)
        .map((k) => [k, req.body[k]]),
    );

    await validarCliente(dados, req.user.empresaId);
    dados.empresa_id = req.user.empresaId;
    dados.itens = calcularItens(dados.itens || []);
    dados.totais = totaisItens(dados.itens);

    if (!dados.status) dados.status = "pendente";

    const orcamento = await Orcamento.create(dados);
    res.status(201).json(orcamento);
  } catch (error) {
    console.error("Erro ao criar orçamento:", error);
    res.status(error.status || 500).json({ erro: "Erro ao criar orçamento" });
  }
};

// Atualizar orçamento
exports.atualizarOrcamento = async (req, res) => {
  try {
    const orcamento = await Orcamento.findOne({
      where: { id: req.params.id, empresa_id: req.user.empresaId },
    });
    if (!orcamento) {
      return res.status(404).json({ erro: "Orçamento não encontrado" });
    }

    const dados = Object.fromEntries(
      [
        "cliente",
        "clienteId",
        "clienteTelefone",
        "profissional",
        "profissionalId",
        "condicaoPagamento",
        "informacoesAdicionais",
        "status",
        "itens",
      ]
        .filter((k) => req.body[k] !== undefined)
        .map((k) => [k, req.body[k]]),
    );

    await validarCliente(dados, req.user.empresaId);
    if (dados.itens !== undefined) {
      dados.itens = calcularItens(dados.itens);
      dados.totais = totaisItens(dados.itens);
    }
    await orcamento.update(dados);
    res.json(orcamento);
  } catch (error) {
    console.error("Erro ao atualizar orçamento:", error);
    res
      .status(error.status || 500)
      .json({ erro: "Erro ao atualizar orçamento" });
  }
};

// Deletar orçamento
exports.deletarOrcamento = async (req, res) => {
  try {
    const orcamento = await Orcamento.findOne({
      where: { id: req.params.id, empresa_id: req.user.empresaId },
    });
    if (!orcamento) {
      return res.status(404).json({ erro: "Orçamento não encontrado" });
    }
    await orcamento.destroy();
    res.json({ mensagem: "Orçamento excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar orçamento:", error);
    res.status(error.status || 500).json({ erro: "Erro ao deletar orçamento" });
  }
};
