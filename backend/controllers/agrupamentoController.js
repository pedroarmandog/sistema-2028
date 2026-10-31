const { Agrupamento } = require("../models");

exports.getAll = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 1000, 1000);
    const offset = parseInt(req.query.offset, 10) || 0;
    const agrupamentos = await Agrupamento.findAll({
      attributes: ["id", "name"],
      order: [["name", "ASC"]],
      limit,
      offset,
    });
    res.json(agrupamentos);
  } catch (error) {
    console.error("Erro ao buscar agrupamentos:", error);
    res.status(500).json({ error: "Erro ao buscar agrupamentos" });
  }
};

exports.getById = async (req, res) => {
  try {
    const agrupamento = await Agrupamento.findByPk(req.params.id);
    if (!agrupamento) {
      return res.status(404).json({ error: "Agrupamento não encontrado" });
    }
    res.json(agrupamento);
  } catch (error) {
    console.error("Erro ao buscar agrupamento:", error);
    res.status(500).json({ error: "Erro ao buscar agrupamento" });
  }
};

exports.create = async (req, res) => {
  try {
    const agrupamento = await Agrupamento.create(req.body);
    res.status(201).json(agrupamento);
  } catch (error) {
    console.error("Erro ao criar agrupamento:", error);
    res.status(500).json({ error: "Erro ao criar agrupamento" });
  }
};

exports.update = async (req, res) => {
  try {
    const agrupamento = await Agrupamento.findByPk(req.params.id);
    if (!agrupamento) {
      return res.status(404).json({ error: "Agrupamento não encontrado" });
    }
    await agrupamento.update(req.body);
    res.json(agrupamento);
  } catch (error) {
    console.error("Erro ao atualizar agrupamento:", error);
    res.status(500).json({ error: "Erro ao atualizar agrupamento" });
  }
};

exports.delete = async (req, res) => {
  try {
    const agrupamento = await Agrupamento.findByPk(req.params.id);
    if (!agrupamento) {
      return res.status(404).json({ error: "Agrupamento não encontrado" });
    }
    await agrupamento.destroy();
    res.json({ message: "Agrupamento deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar agrupamento:", error);
    res.status(500).json({ error: "Erro ao deletar agrupamento" });
  }
};
