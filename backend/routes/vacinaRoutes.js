const express = require("express");
const router = express.Router();
const Produto = require("../models/Produto");

// Helper: somente vacinas (usamos campo `tipo` = 'vacina')
function baseWhere() {
  return { tipo: "vacina" };
}

// Listar vacinas
router.get("/", async (req, res) => {
  try {
    const { q } = req.query;
    const { Op } = require("sequelize");
    const where = baseWhere();
    if (q) {
      where.nome = { [Op.like]: `%${q}%` };
    }
    const limit = Math.min(parseInt(req.query.limit, 10) || 1000, 5000);
    const offset = parseInt(req.query.offset, 10) || 0;
    const vacinas = await Produto.findAll({
      where,
      order: [["nome", "ASC"]],
      attributes: ["id", "nome", "codigo", "estoqueAtual"],
      limit,
      offset,
    });
    return res.json(vacinas.map((v) => (v.get ? v.get({ plain: true }) : v)));
  } catch (err) {
    console.error("Erro GET /api/vacinas", err && err.message);
    return res.status(500).json({ error: "Erro interno" });
  }
});

// Buscar por id
router.get("/:id", async (req, res) => {
  try {
    const id = String(req.params.id);
    const vac = await Produto.findOne({
      where: Object.assign({ id }, baseWhere()),
    });
    if (!vac) return res.status(404).json({ error: "Vacina não encontrada" });
    return res.json(vac.get ? vac.get({ plain: true }) : vac);
  } catch (err) {
    console.error("Erro GET /api/vacinas/:id", err && err.message);
    return res.status(500).json({ error: "Erro interno" });
  }
});

// Criar vacina
router.post("/", async (req, res) => {
  try {
    const data = Object.assign({}, req.body || {});
    // forçar tipo
    data.tipo = "vacina";
    if (!data.nome && data.descricao) data.nome = data.descricao;
    if (!data.nome)
      return res
        .status(400)
        .json({ error: "Campo nome/descricao é obrigatório" });

    // garantir codigo não nulo
    if (!data.codigo) data.codigo = String(Date.now()).slice(-8);

    // gerar id sequencial se não informado
    if (!data.id) {
      try {
        const [[row]] = await Produto.sequelize.query(
          "SELECT MAX(CAST(id AS UNSIGNED)) AS maxId FROM itens",
        );
        const maxId =
          row && row.maxId !== null && row.maxId !== undefined
            ? Number(row.maxId)
            : 0;
        data.id = String((maxId || 0) + 1);
      } catch (qerr) {
        data.id = String(Date.now()).slice(-8);
      }
    }

    const created = await Produto.create(data);
    const saved = await Produto.findByPk(created.id);
    return res.status(201).json(saved.get ? saved.get({ plain: true }) : saved);
  } catch (err) {
    console.error("Erro POST /api/vacinas", err && err.message);
    return res.status(500).json({ error: "Erro ao criar vacina" });
  }
});

// Atualizar vacina
router.put("/:id", async (req, res) => {
  try {
    const id = String(req.params.id);
    const data = Object.assign({}, req.body || {});
    // garantir tipo
    data.tipo = "vacina";
    const vac = await Produto.findOne({
      where: Object.assign({ id }, baseWhere()),
    });
    if (!vac) return res.status(404).json({ error: "Vacina não encontrada" });
    await vac.update(data);
    const saved = await Produto.findByPk(vac.id);
    return res.json(saved.get ? saved.get({ plain: true }) : saved);
  } catch (err) {
    console.error("Erro PUT /api/vacinas/:id", err && err.message);
    return res.status(500).json({ error: "Erro ao atualizar vacina" });
  }
});

// Deletar vacina
router.delete("/:id", async (req, res) => {
  try {
    const id = String(req.params.id);
    const vac = await Produto.findOne({
      where: Object.assign({ id }, baseWhere()),
    });
    if (!vac) return res.status(404).json({ error: "Vacina não encontrada" });
    await vac.destroy();
    return res.json({ success: true });
  } catch (err) {
    console.error("Erro DELETE /api/vacinas/:id", err && err.message);
    return res.status(500).json({ error: "Erro ao deletar vacina" });
  }
});

module.exports = router;
