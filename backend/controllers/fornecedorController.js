const Fornecedor = require("../models/Fornecedor");
const { Op } = require("sequelize");

exports.getAllFornecedores = async (req, res) => {
  try {
    const { q } = req.query;
    const empresaId = req.user?.empresaId;
    let where = {};
    if (empresaId) where.empresa_id = empresaId;
    if (q) {
      where = {
        ...where,
        [Op.or]: [
          { nome: { [Op.like]: `%${q}%` } },
          { codigo: { [Op.like]: `%${q}%` } },
          { cnpj: { [Op.like]: `%${q}%` } },
        ],
      };
    }

    const fornecedores = await Fornecedor.findAll({
      where,
      attributes: [
        "id",
        "codigo",
        "nome",
        "telefone",
        "ativo",
        "cnpj",
        "razaoSocial",
      ],
      order: [["nome", "ASC"]],
      limit: 500,
    });
    res.json(fornecedores);
  } catch (err) {
    console.error("Erro getAllFornecedores", err);
    res.status(500).json({ error: "Erro ao buscar fornecedores" });
  }
};

exports.getFornecedorById = async (req, res) => {
  try {
    const { id } = req.params;
    const f = await Fornecedor.findByPk(id);
    if (!f) return res.status(404).json({ error: "Fornecedor não encontrado" });
    res.json(f);
  } catch (err) {
    console.error("Erro getFornecedorById", err);
    res.status(500).json({ error: "Erro ao buscar fornecedor" });
  }
};

exports.createFornecedor = async (req, res) => {
  try {
    const data = req.body || {};
    if (req.user?.empresaId) data.empresa_id = req.user.empresaId;
    const novo = await Fornecedor.create(data);
    res.status(201).json(novo);
  } catch (err) {
    console.error("Erro createFornecedor", err);
    res.status(500).json({ error: "Erro ao criar fornecedor" });
  }
};

exports.updateFornecedor = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const [updated] = await Fornecedor.update(updates, { where: { id } });
    if (!updated)
      return res.status(404).json({ error: "Fornecedor não encontrado" });
    const f = await Fornecedor.findByPk(id);
    res.json(f);
  } catch (err) {
    console.error("Erro updateFornecedor", err);
    res.status(500).json({ error: "Erro ao atualizar fornecedor" });
  }
};

exports.deleteFornecedor = async (req, res) => {
  try {
    const { id } = req.params;
    const f = await Fornecedor.findByPk(id);
    if (!f) return res.status(404).json({ error: "Fornecedor não encontrado" });
    await f.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error("Erro deleteFornecedor", err);
    res.status(500).json({ error: "Erro ao excluir fornecedor" });
  }
};
