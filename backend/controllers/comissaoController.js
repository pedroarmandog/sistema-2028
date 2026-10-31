const { Comissao } = require("../models");
const { Profissional } = require("../models/Profissional");
const { Op } = require("sequelize");
const { Empresa } = require("../models");

// Helper: extrai empresa_id do cookie JWT (mesmo pattern do relatoriosRoutes)
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

// Buscar profissionais e suas % para um perfil de produto
exports.porPerfil = async (req, res) => {
  try {
    const perfil = req.query.perfil;
    if (!perfil) return res.status(400).json({ error: "Informe o perfil" });

    const empresaId = await getEmpresaIdFromReq(req);
    if (!empresaId)
      return res.status(401).json({ error: "Empresa não identificada" });

    const comissoes = await Comissao.findAll({
      attributes: ["id", "perfilProduto", "perfilVendedor", "percentual"],
      where: { perfilProduto: perfil, empresa_id: empresaId },
      order: [["perfilVendedor", "ASC"]],
      limit: 1000,
    });

    // Enriquecer com o ID do profissional cujo nome bate
    const profissionais = await Profissional.findAll({
      where: { empresa_id: empresaId },
      attributes: ["id", "nome", "perfilComissao"],
      limit: 1000,
    });

    const result = comissoes.map((c) => {
      const prof = profissionais.find(
        (p) =>
          p.nome && p.nome.toLowerCase() === c.perfilVendedor.toLowerCase(),
      );
      return {
        perfilVendedor: c.perfilVendedor,
        percentual: parseFloat(c.percentual),
        profissionalId: prof ? prof.id : null,
        profissionalNome: prof ? prof.nome : c.perfilVendedor,
      };
    });

    res.json(result);
  } catch (error) {
    console.error("Erro ao buscar comissões por perfil:", error);
    res.status(500).json({ error: "Erro ao buscar comissões por perfil" });
  }
};

// Calcular o valor de comissão para um profissional numa venda
exports.calcular = async (req, res) => {
  try {
    const { perfilProduto, profissionalNome, valor } = req.query;
    if (!perfilProduto || !profissionalNome || !valor) {
      return res
        .status(400)
        .json({ error: "Informe perfilProduto, profissionalNome e valor" });
    }

    const empresaId = await getEmpresaIdFromReq(req);
    if (!empresaId)
      return res.status(401).json({ error: "Empresa não identificada" });

    const comissao = await Comissao.findOne({
      where: {
        perfilProduto,
        perfilVendedor: { [Op.like]: profissionalNome },
        empresa_id: empresaId,
      },
    });

    if (!comissao) {
      return res.json({ percentual: 0, valorComissao: 0 });
    }

    const percentual = parseFloat(comissao.percentual);
    const valorVenda = parseFloat(valor);
    const valorComissao = (percentual / 100) * valorVenda;

    res.json({
      percentual,
      valorComissao: parseFloat(valorComissao.toFixed(2)),
    });
  } catch (error) {
    console.error("Erro ao calcular comissão:", error);
    res.status(500).json({ error: "Erro ao calcular comissão" });
  }
};

exports.getAll = async (req, res) => {
  try {
    const empresaId = await getEmpresaIdFromReq(req);
    if (!empresaId)
      return res.status(401).json({ error: "Empresa não identificada" });

    const comissoes = await Comissao.findAll({
      attributes: [
        "id",
        "perfilProduto",
        "perfilVendedor",
        "percentual",
        "empresa_id",
      ],
      where: { empresa_id: empresaId },
      order: [
        ["perfilProduto", "ASC"],
        ["perfilVendedor", "ASC"],
      ],
      limit: 2000,
    });
    res.json(comissoes);
  } catch (error) {
    console.error("Erro ao buscar comissões:", error);
    res.status(500).json({ error: "Erro ao buscar comissões" });
  }
};

exports.getById = async (req, res) => {
  try {
    const comissao = await Comissao.findByPk(req.params.id);
    if (!comissao) {
      return res.status(404).json({ error: "Comissão não encontrada" });
    }
    res.json(comissao);
  } catch (error) {
    console.error("Erro ao buscar comissão:", error);
    res.status(500).json({ error: "Erro ao buscar comissão" });
  }
};

exports.create = async (req, res) => {
  try {
    const empresaId = await getEmpresaIdFromReq(req);
    if (!empresaId)
      return res.status(401).json({ error: "Empresa não identificada" });

    const comissao = await Comissao.create({
      ...req.body,
      empresa_id: empresaId,
    });
    res.status(201).json(comissao);
  } catch (error) {
    console.error("Erro ao criar comissão:", error);
    res.status(500).json({ error: "Erro ao criar comissão" });
  }
};

exports.update = async (req, res) => {
  try {
    const comissao = await Comissao.findByPk(req.params.id);
    if (!comissao) {
      return res.status(404).json({ error: "Comissão não encontrada" });
    }
    await comissao.update(req.body);
    res.json(comissao);
  } catch (error) {
    console.error("Erro ao atualizar comissão:", error);
    res.status(500).json({ error: "Erro ao atualizar comissão" });
  }
};

exports.delete = async (req, res) => {
  try {
    const comissao = await Comissao.findByPk(req.params.id);
    if (!comissao) {
      return res.status(404).json({ error: "Comissão não encontrada" });
    }
    await comissao.destroy();
    res.json({ message: "Comissão deletada com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar comissão:", error);
    res.status(500).json({ error: "Erro ao deletar comissão" });
  }
};
