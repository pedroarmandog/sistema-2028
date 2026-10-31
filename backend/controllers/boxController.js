const Box = require("../models/Box");

// GET /api/boxes - Listar todos os boxes
exports.getAll = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 1000, 1000);
    const offset = parseInt(req.query.offset, 10) || 0;
    const boxes = await Box.findAll({
      attributes: ["id", "descricao", "abreviacao", "capacidade", "ativo"],
      order: [["descricao", "ASC"]],
      limit,
      offset,
    });
    res.json(boxes);
  } catch (error) {
    console.error("Erro ao buscar boxes:", error);
    res.status(500).json({ error: "Erro ao buscar boxes" });
  }
};

// GET /api/boxes/:id - Buscar box por ID
exports.getById = async (req, res) => {
  try {
    const box = await Box.findByPk(req.params.id);
    if (!box) {
      return res.status(404).json({ error: "Box não encontrado" });
    }
    res.json(box);
  } catch (error) {
    console.error("Erro ao buscar box:", error);
    res.status(500).json({ error: "Erro ao buscar box" });
  }
};

// POST /api/boxes - Criar novo box
exports.create = async (req, res) => {
  try {
    const { id, descricao, abreviacao, capacidade, ativo, pets } = req.body;
    const box = await Box.create({
      id: id || `box_${Date.now()}`,
      descricao,
      abreviacao,
      capacidade,
      ativo: ativo !== undefined ? ativo : true,
      pets: pets || [],
    });
    res.status(201).json(box);
  } catch (error) {
    console.error("Erro ao criar box:", error);
    res.status(500).json({ error: "Erro ao criar box" });
  }
};

// PUT /api/boxes/:id - Atualizar box
exports.update = async (req, res) => {
  try {
    const { descricao, abreviacao, capacidade, ativo, pets } = req.body;
    const box = await Box.findByPk(req.params.id);

    if (!box) {
      return res.status(404).json({ error: "Box não encontrado" });
    }

    const updateData = {};
    if (descricao !== undefined) updateData.descricao = descricao;
    if (abreviacao !== undefined) updateData.abreviacao = abreviacao;
    if (capacidade !== undefined) updateData.capacidade = capacidade;
    if (ativo !== undefined) updateData.ativo = ativo;
    if (pets !== undefined) updateData.pets = pets;

    await box.update(updateData);
    res.json(box);
  } catch (error) {
    console.error("Erro ao atualizar box:", error);
    res.status(500).json({ error: "Erro ao atualizar box" });
  }
};

// DELETE /api/boxes/:id - Deletar box
exports.delete = async (req, res) => {
  try {
    const box = await Box.findByPk(req.params.id);

    if (!box) {
      return res.status(404).json({ error: "Box não encontrado" });
    }

    await box.destroy();
    res.json({ message: "Box deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar box:", error);
    res.status(500).json({ error: "Erro ao deletar box" });
  }
};
