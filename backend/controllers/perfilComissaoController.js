const { PerfilComissao } = require("../models");

// Helper: extrai empresa_id do cookie JWT
async function getEmpresaIdFromReq(req) {
  if (req.user && req.user.empresaId) return req.user.empresaId;
  try {
    const jwt = require("jsonwebtoken");
    const JWT_SECRET =
      process.env.JWT_USER_SECRET || "pethub_user_secret_2026_!@#$%";
    const cookieHeader = req.headers.cookie || "";
    const match = cookieHeader.match(/pethub_token=([^;]+)/);
    if (match) {
      const decoded = jwt.verify(match[1], JWT_SECRET);
      if (decoded.empresaId) return decoded.empresaId;
    }
  } catch (_) {}
  return null;
}

exports.getAll = async (req, res) => {
  try {
    const empresaId = await getEmpresaIdFromReq(req);
    if (!empresaId)
      return res.status(401).json({ error: "Empresa não identificada" });

    const where = { empresa_id: empresaId };
    if (req.query.tipo) where.tipo = req.query.tipo;
    const perfis = await PerfilComissao.findAll({
      where,
      order: [["perfilVendedor", "ASC"]],
    });
    res.json(perfis);
  } catch (error) {
    console.error("Erro ao buscar perfis de comissão:", error);
    res.status(500).json({ error: "Erro ao buscar perfis de comissão" });
  }
};

exports.getById = async (req, res) => {
  try {
    const perfil = await PerfilComissao.findByPk(req.params.id);
    if (!perfil) {
      return res
        .status(404)
        .json({ error: "Perfil de comissão não encontrado" });
    }
    res.json(perfil);
  } catch (error) {
    console.error("Erro ao buscar perfil de comissão:", error);
    res.status(500).json({ error: "Erro ao buscar perfil de comissão" });
  }
};

exports.create = async (req, res) => {
  try {
    const empresaId = await getEmpresaIdFromReq(req);
    if (!empresaId)
      return res.status(401).json({ error: "Empresa não identificada" });

    const perfil = await PerfilComissao.create({
      ...req.body,
      empresa_id: empresaId,
    });
    res.status(201).json(perfil);
  } catch (error) {
    console.error("Erro ao criar perfil de comissão:", error);
    res.status(500).json({ error: "Erro ao criar perfil de comissão" });
  }
};

exports.update = async (req, res) => {
  try {
    const perfil = await PerfilComissao.findByPk(req.params.id);
    if (!perfil) {
      return res
        .status(404)
        .json({ error: "Perfil de comissão não encontrado" });
    }
    await perfil.update(req.body);
    res.json(perfil);
  } catch (error) {
    console.error("Erro ao atualizar perfil de comissão:", error);
    res.status(500).json({ error: "Erro ao atualizar perfil de comissão" });
  }
};

exports.delete = async (req, res) => {
  try {
    const perfil = await PerfilComissao.findByPk(req.params.id);
    if (!perfil) {
      return res
        .status(404)
        .json({ error: "Perfil de comissão não encontrado" });
    }
    await perfil.destroy();
    res.json({ message: "Perfil de comissão deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar perfil de comissão:", error);
    res.status(500).json({ error: "Erro ao deletar perfil de comissão" });
  }
};
