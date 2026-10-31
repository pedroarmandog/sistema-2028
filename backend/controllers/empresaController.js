// Buscar última chave Pix da empresa
exports.getUltimaChavePix = async (req, res) => {
  try {
    const empresaId = req.user?.empresaId;
    if (!empresaId) {
      return res
        .status(400)
        .json({ erro: "Empresa não identificada no token" });
    }
    const empresa = await Empresa.findByPk(empresaId);
    if (!empresa) {
      return res.status(404).json({ erro: "Empresa não encontrada" });
    }
    res.json({ ultimaChavePix: empresa.ultimaChavePix || "" });
  } catch (error) {
    console.error("Erro ao buscar última chave Pix:", error);
    res.status(500).json({ erro: "Erro ao buscar última chave Pix" });
  }
};

// Atualizar última chave Pix da empresa
exports.setUltimaChavePix = async (req, res) => {
  try {
    const empresaId = req.user?.empresaId;
    if (!empresaId) {
      return res
        .status(400)
        .json({ erro: "Empresa não identificada no token" });
    }
    const { ultimaChavePix } = req.body;
    if (typeof ultimaChavePix !== "string") {
      return res.status(400).json({ erro: "Chave Pix inválida" });
    }
    const empresa = await Empresa.findByPk(empresaId);
    if (!empresa) {
      return res.status(404).json({ erro: "Empresa não encontrada" });
    }
    empresa.ultimaChavePix = ultimaChavePix;
    await empresa.save();
    res.json({ sucesso: true, ultimaChavePix });
  } catch (error) {
    console.error("Erro ao atualizar última chave Pix:", error);
    res.status(500).json({ erro: "Erro ao atualizar última chave Pix" });
  }
};
const { Empresa, Usuario, sequelize } = require("../models");
const { Op, QueryTypes } = require("sequelize");
const fs = require("fs");
const path = require("path");

// Listar todas as empresas
exports.listarEmpresas = async (req, res) => {
  try {
    // DEBUG: mostrar quem está requisitando
    try {
      console.log(
        "[empresaController.listarEmpresas] req.user:",
        JSON.stringify(req.user),
      );
    } catch (e) {
      console.log(
        "[empresaController.listarEmpresas] req.user (non-serializable)",
      );
    }

    // Se usuário for master/admin, retornar todas as empresas
    const grupo =
      req.user && req.user.grupoUsuario
        ? String(req.user.grupoUsuario).toLowerCase()
        : "";
    const isMaster =
      grupo.includes("admin") ||
      grupo.includes("acesso total") ||
      grupo.includes("master");

    const empresaId = req.user?.empresaId;
    console.log(
      `[empresaController.listarEmpresas] isMaster=${isMaster} empresaId=${empresaId}`,
    );

    const where = {};

    // Sempre tentar restringir pelo registro `Usuario.empresas` quando possível,
    // mesmo que o token declare o usuário como 'admin'. Isso evita que um token
    // com grupo 'admin' acabe vendo todas as empresas na interface do app.
    try {
      const usuarioDb =
        req.user && req.user.id
          ? await Usuario.findByPk(req.user.id, {
              attributes: ["empresas", "grupoUsuario"],
            })
          : null;
      let allowedEmpresaIds = [];
      if (
        usuarioDb &&
        Array.isArray(usuarioDb.empresas) &&
        usuarioDb.empresas.length
      ) {
        allowedEmpresaIds = usuarioDb.empresas
          .map((item) => {
            if (item == null) return null;
            if (typeof item === "number") return Number(item);
            if (typeof item === "string") return parseInt(item, 10) || null;
            if (typeof item === "object") {
              const raw = item.id !== undefined ? item.id : item.empresaId;
              return raw != null ? parseInt(raw, 10) || null : null;
            }
            return null;
          })
          .filter((v) => v != null);
      }

      if (allowedEmpresaIds.length > 0) {
        where.id = { [Op.in]: allowedEmpresaIds };
        console.log(
          `[empresaController.listarEmpresas] restringindo por Usuario.empresas -> [${allowedEmpresaIds.join(",")}]`,
        );
      } else if (!isMaster) {
        // Se não for master e não há empresas vinculadas no registro, usar empresaId do token como fallback
        if (empresaId) {
          where.id = empresaId;
        } else {
          // Tentar ler coluna `empresa_id` diretamente do banco (migração gradual)
          let usuarioEmpresaId = null;
          try {
            const rows = await sequelize.query(
              "SELECT empresa_id FROM usuarios WHERE id = :id LIMIT 1",
              { replacements: { id: req.user.id }, type: QueryTypes.SELECT },
            );
            if (rows && rows.length > 0 && rows[0].empresa_id) {
              usuarioEmpresaId = Number(rows[0].empresa_id) || null;
            }
          } catch (e) {
            console.warn(
              "[empresaController.listarEmpresas] erro ao buscar usuarios.empresa_id:",
              e && e.message,
            );
          }

          if (usuarioEmpresaId) {
            where.id = usuarioEmpresaId;
            console.log(
              `[empresaController.listarEmpresas] usando Usuario.empresa_id -> ${usuarioEmpresaId}`,
            );
          } else {
            console.log(
              "[empresaController.listarEmpresas] usuário sem empresas vinculadas — retornando []",
            );
            return res.json([]);
          }
        }
      } else {
        // isMaster && sem empresas vinculadas -> retornar todas (comportamento existente)
      }
    } catch (err) {
      console.warn(
        "[empresaController.listarEmpresas] erro ao buscar empresas do usuário, fallback para req.user.empresaId",
        err && err.message,
      );
      if (!empresaId && !isMaster) return res.json([]);
      if (empresaId) where.id = empresaId;
    }

    const empresas = await Empresa.findAll({ where, order: [["nome", "ASC"]] });
    console.log(
      `[empresaController.listarEmpresas] retornando ${empresas.length} empresas`,
    );
    res.json(empresas);
  } catch (error) {
    console.error("Erro ao listar empresas:", error);
    res.status(500).json({ erro: "Erro ao listar empresas" });
  }
};

// Buscar empresa por ID
exports.buscarEmpresa = async (req, res) => {
  try {
    try {
      console.log(
        `[buscarEmpresa] req.user=${JSON.stringify(req.user)} requested=${req.params.id}`,
      );
    } catch (e) {}
    const empresa = await Empresa.findByPk(req.params.id);
    if (!empresa) {
      return res.status(404).json({ erro: "Empresa não encontrada" });
    }

    // verificar acesso do usuário
    const empresaId = req.user?.empresaId;
    const grupo =
      req.user && req.user.grupoUsuario
        ? String(req.user.grupoUsuario).toLowerCase()
        : "";
    const isMaster =
      grupo.includes("admin") ||
      grupo.includes("acesso total") ||
      grupo.includes("master");
    if (!isMaster && empresaId && Number(empresa.id) !== Number(empresaId)) {
      return res
        .status(403)
        .json({ erro: "Acesso negado à empresa solicitada" });
    }

    res.json(empresa);
  } catch (error) {
    console.error("Erro ao buscar empresa:", error);
    res.status(500).json({ erro: "Erro ao buscar empresa" });
  }
};

// Debug: retornar req.user e registro de Usuario (temporário)
exports.whoami = async (req, res) => {
  try {
    const usuario =
      req.user && req.user.id
        ? await Usuario.findByPk(req.user.id, {
            attributes: [
              "id",
              "nome",
              "usuario",
              "grupoUsuario",
              "empresas",
              "ativo",
            ],
          })
        : null;
    return res.json({ reqUser: req.user || null, usuarioDb: usuario });
  } catch (err) {
    console.error("Erro whoami:", err);
    return res.status(500).json({ error: "erro interno" });
  }
};

// Criar empresa
exports.criarEmpresa = async (req, res) => {
  try {
    const dados = req.body;

    // Se veio logo em base64, salvar como arquivo
    if (dados.logo && dados.logo.startsWith("data:image")) {
      const base64Data = dados.logo.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const fileName = `empresa_${timestamp}.png`;
      const uploadPath = path.join(__dirname, "../../uploads", fileName);

      // Criar diretório uploads se não existir
      const uploadsDir = path.join(__dirname, "../../uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Salvar arquivo
      fs.writeFileSync(uploadPath, buffer);

      // Substituir base64 pelo nome do arquivo
      dados.logo = fileName;
    }

    const empresa = await Empresa.create(dados);
    res.status(201).json(empresa);
  } catch (error) {
    console.error("Erro ao criar empresa:", error);
    res.status(500).json({ erro: "Erro ao criar empresa" });
  }
};

// Atualizar empresa
exports.atualizarEmpresa = async (req, res) => {
  try {
    const empresa = await Empresa.findByPk(req.params.id);
    if (!empresa) {
      return res.status(404).json({ erro: "Empresa não encontrada" });
    }

    const dados = req.body;

    // Se veio logo em base64, salvar como arquivo
    if (dados.logo && dados.logo.startsWith("data:image")) {
      const base64Data = dados.logo.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const fileName = `empresa_${timestamp}.png`;
      const uploadPath = path.join(__dirname, "../../uploads", fileName);

      // Criar diretório uploads se não existir
      const uploadsDir = path.join(__dirname, "../../uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Deletar logo antiga se existir
      if (empresa.logo && empresa.logo !== "") {
        const oldPath = path.join(__dirname, "../../uploads", empresa.logo);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      // Salvar novo arquivo
      fs.writeFileSync(uploadPath, buffer);

      // Substituir base64 pelo nome do arquivo
      dados.logo = fileName;
    }

    await empresa.update(dados);
    res.json(empresa);
  } catch (error) {
    console.error("Erro ao atualizar empresa:", error);
    res.status(500).json({ erro: "Erro ao atualizar empresa" });
  }
};

// Deletar empresa
exports.deletarEmpresa = async (req, res) => {
  try {
    const empresa = await Empresa.findByPk(req.params.id);
    if (!empresa) {
      return res.status(404).json({ erro: "Empresa não encontrada" });
    }

    // Deletar logo se existir
    if (empresa.logo && empresa.logo !== "") {
      const logoPath = path.join(__dirname, "../../uploads", empresa.logo);
      if (fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
      }
    }

    await empresa.destroy();
    res.json({ mensagem: "Empresa deletada com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar empresa:", error);
    res.status(500).json({ erro: "Erro ao deletar empresa" });
  }
};
