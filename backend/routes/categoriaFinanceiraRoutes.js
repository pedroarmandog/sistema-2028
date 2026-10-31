const express = require("express");
const router = express.Router();
const CategoriaFinanceira = require("../models/CategoriaFinanceira");

// GET /api/categorias-financeiras
router.get("/", async (req, res) => {
  try {
    const { q } = req.query;
    let where = {};
    if (q) {
      const { Op } = require("sequelize");
      where = { descricao: { [Op.like]: `%${q}%` } };
    }
    const limit = Math.min(parseInt(req.query.limit, 10) || 1000, 5000);
    const offset = parseInt(req.query.offset, 10) || 0;
    const rows = await CategoriaFinanceira.findAll({
      attributes: ["id", "descricao", "tipo", "ativo"],
      where,
      order: [["descricao", "ASC"]],
      limit,
      offset,
    });
    res.json(rows);
  } catch (e) {
    console.error("GET /categorias-financeiras", e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/categorias-financeiras/:id
router.get("/:id", async (req, res) => {
  try {
    const row = await CategoriaFinanceira.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Não encontrada" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/categorias-financeiras
router.post("/", async (req, res) => {
  try {
    const { descricao, tipo, ativo } = req.body;
    if (!descricao || !tipo)
      return res
        .status(400)
        .json({ error: "descricao e tipo são obrigatórios" });
    const row = await CategoriaFinanceira.create({
      descricao: descricao.trim(),
      tipo: tipo.toUpperCase(),
      ativo: ativo !== false,
    });
    res.status(201).json(row);
  } catch (e) {
    console.error("POST /categorias-financeiras", e);
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/categorias-financeiras/:id
router.put("/:id", async (req, res) => {
  try {
    const row = await CategoriaFinanceira.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Não encontrada" });
    const { descricao, tipo, ativo } = req.body;
    await row.update({
      descricao: descricao ? descricao.trim() : row.descricao,
      tipo: tipo ? tipo.toUpperCase() : row.tipo,
      ativo: ativo !== undefined ? ativo : row.ativo,
    });
    res.json(row);
  } catch (e) {
    console.error("PUT /categorias-financeiras/:id", e);
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/categorias-financeiras/:id
router.delete("/:id", async (req, res) => {
  try {
    const row = await CategoriaFinanceira.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Não encontrada" });
    await row.destroy();
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /categorias-financeiras/:id", e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
