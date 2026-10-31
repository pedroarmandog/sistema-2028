const {
  EmpresaPainel,
  PagamentoPainel,
  Empresa,
  Usuario,
  Admin,
  AdminImpersonationToken,
  sequelize,
} = require("../models");
const { Op, QueryTypes } = require("sequelize");
const { gerarTokenUsuario } = require("../middleware/authUser");

// GET /api/admin/empresas — listar todas
async function listar(req, res) {
  try {
    const { status, busca, ordenar } = req.query;
    const where = {};
    if (status && ["ATIVO", "VENCIDO", "BLOQUEADO"].includes(status)) {
      where.status = status;
    }

    // Determinar se a requisição é do painel (authAdmin) ou do app (authUser)
    const isAdminRequest = !!req.adminId; // setado por authAdmin
    // Determinar se o usuário é master/plataforma
    const grupo = isAdminRequest
      ? "admin"
      : req.user && req.user.grupoUsuario
        ? String(req.user.grupoUsuario).toLowerCase()
        : "";
    const isMaster =
      isAdminRequest ||
      grupo.includes("admin") ||
      grupo.includes("acesso total") ||
      grupo.includes("master");

    // Se não for master, limitar listagem à empresa vinculada ao token (somente para requests não-admin)
    if (!isMaster && !isAdminRequest) {
      const empresaId = req.user?.empresaId;
      if (!empresaId) return res.json([]);
      where.id = empresaId;
    }

    if (busca) {
      where[Op.or] = [
        { nome_fantasia: { [Op.like]: `%${busca}%` } },
        { cnpj: { [Op.like]: `%${busca}%` } },
      ];
    }

    const order = [];
    if (ordenar === "vencimento") {
      order.push(["data_vencimento", "ASC"]);
    } else if (ordenar === "nome") {
      order.push(["nome_fantasia", "ASC"]);
    } else {
      order.push(["createdAt", "DESC"]);
    }

    const empresas = await EmpresaPainel.findAll({ where, order });
    return res.json(empresas);
  } catch (err) {
    console.error("[admin/empresas] Erro ao listar:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// GET /api/admin/empresas/:id — detalhes
async function detalhes(req, res) {
  try {
    const empresa = await EmpresaPainel.findByPk(req.params.id, {
      include: [
        {
          model: PagamentoPainel,
          as: "pagamentos",
          order: [["data_pagamento", "DESC"]],
        },
      ],
    });
    if (!empresa) {
      return res.status(404).json({ error: "Empresa não encontrada" });
    }

    // Verificar acesso do usuário: permitir somente se for master ou a própria empresa
    const isAdminRequest = !!req.adminId;
    const grupo = isAdminRequest
      ? "admin"
      : req.user && req.user.grupoUsuario
        ? String(req.user.grupoUsuario).toLowerCase()
        : "";
    const isMaster =
      isAdminRequest ||
      grupo.includes("admin") ||
      grupo.includes("acesso total") ||
      grupo.includes("master");
    const empresaId = isAdminRequest ? null : req.user?.empresaId;
    if (!isMaster && empresaId && Number(empresa.id) !== Number(empresaId)) {
      return res
        .status(403)
        .json({ error: "Acesso negado à empresa solicitada" });
    }

    return res.json(empresa);
  } catch (err) {
    console.error("[admin/empresas] Erro ao buscar detalhes:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// POST /api/admin/empresas — criar
async function criar(req, res) {
  try {
    const {
      nome_fantasia,
      cnpj,
      cep,
      endereco,
      email,
      telefone,
      valor_mensalidade,
      data_vencimento,
    } = req.body;

    if (!nome_fantasia || !cnpj || !valor_mensalidade || !data_vencimento) {
      return res.status(400).json({
        error:
          "Campos obrigatórios: nome_fantasia, cnpj, valor_mensalidade, data_vencimento",
      });
    }

    const cnpjLimpo = cnpj.replace(/\D/g, "");
    if (cnpjLimpo.length !== 14) {
      return res.status(400).json({ error: "CNPJ inválido" });
    }

    const existente = await EmpresaPainel.findOne({
      where: { cnpj: cnpjLimpo },
    });
    if (existente) {
      return res.status(409).json({ error: "CNPJ já cadastrado" });
    }

    const emailClean =
      email && String(email).trim() ? String(email).trim() : null;

    const empresa = await EmpresaPainel.create({
      nome_fantasia,
      cnpj: cnpjLimpo,
      cep,
      endereco,
      email: emailClean,
      telefone,
      valor_mensalidade,
      data_vencimento,
      data_adesao: new Date(),
      status: "ATIVO",
    });

    return res.status(201).json(empresa);
  } catch (err) {
    console.error("[admin/empresas] Erro ao criar:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// PUT /api/admin/empresas/:id — atualizar
async function atualizar(req, res) {
  try {
    const empresa = await EmpresaPainel.findByPk(req.params.id);
    if (!empresa) {
      return res.status(404).json({ error: "Empresa não encontrada" });
    }

    const camposPermitidos = [
      "nome_fantasia",
      "cep",
      "endereco",
      "email",
      "telefone",
      "foto",
      "valor_mensalidade",
      "data_vencimento",
    ];
    const dados = {};
    for (const campo of camposPermitidos) {
      if (req.body[campo] !== undefined) {
        let val = req.body[campo];
        // Normalizar email vazio -> null para não quebrar validação isEmail
        if (campo === "email") {
          if (val === "" || (typeof val === "string" && val.trim() === "")) {
            val = null;
          }
        }
        dados[campo] = val;
      }
    }

    await empresa.update(dados);
    return res.json(empresa);
  } catch (err) {
    console.error("[admin/empresas] Erro ao atualizar:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// POST /api/admin/empresas/:id/bloquear
async function bloquear(req, res) {
  try {
    const empresa = await EmpresaPainel.findByPk(req.params.id);
    if (!empresa) {
      return res.status(404).json({ error: "Empresa não encontrada" });
    }

    await empresa.update({ status: "BLOQUEADO" });

    // Invalidar cache da empresa no middleware authUser para bloqueio imediato
    try {
      const { invalidateEmpresaCache } = require("../middleware/authUser");
      // Buscar empresa do sistema pelo CNPJ para obter o empresaId
      if (empresa.cnpj) {
        const cnpjLimpo = empresa.cnpj.replace(/\D/g, "");
        const { Empresa } = require("../models");
        const empresaSistema = await Empresa.findOne({ where: { cnpj: cnpjLimpo }, attributes: ["id"] });
        if (empresaSistema) {
          invalidateEmpresaCache(empresaSistema.id);
        }
      }
    } catch (cacheErr) {
      console.warn("[admin/empresas] Erro ao invalidar cache:", cacheErr && cacheErr.message);
    }

    return res.json({ message: "Empresa bloqueada com sucesso", empresa });
  } catch (err) {
    console.error("[admin/empresas] Erro ao bloquear:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// POST /api/admin/empresas/:id/reativar
async function reativar(req, res) {
  try {
    const empresa = await EmpresaPainel.findByPk(req.params.id);
    if (!empresa) {
      return res.status(404).json({ error: "Empresa não encontrada" });
    }

    // Calcular nova data de vencimento (30 dias a partir de hoje)
    const novaData = new Date();
    novaData.setDate(novaData.getDate() + 30);
    const dataVencimento = novaData.toISOString().split("T")[0];

    await empresa.update({ status: "ATIVO", data_vencimento: dataVencimento });

    // Registrar pagamento
    await PagamentoPainel.create({
      empresa_id: empresa.id,
      valor: empresa.valor_mensalidade,
      data_pagamento: new Date().toISOString().split("T")[0],
      status: "PAGO",
      observacao: "Reativação pelo painel admin",
    });

    // Invalidar cache da empresa no middleware authUser para desbloqueio imediato
    try {
      const { invalidateEmpresaCache } = require("../middleware/authUser");
      if (empresa.cnpj) {
        const cnpjLimpo = empresa.cnpj.replace(/\D/g, "");
        const { Empresa } = require("../models");
        const empresaSistema = await Empresa.findOne({ where: { cnpj: cnpjLimpo }, attributes: ["id"] });
        if (empresaSistema) {
          invalidateEmpresaCache(empresaSistema.id);
        }
      }
    } catch (cacheErr) {
      console.warn("[admin/empresas] Erro ao invalidar cache na reativação:", cacheErr && cacheErr.message);
    }

    return res.json({ message: "Empresa reativada com sucesso", empresa });
  } catch (err) {
    console.error("[admin/empresas] Erro ao reativar:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// DELETE /api/admin/empresas/:id
async function excluir(req, res) {
  const t = await sequelize.transaction();
  try {
    const empresaPainel = await EmpresaPainel.findByPk(req.params.id, {
      transaction: t,
    });
    if (!empresaPainel) {
      await t.rollback();
      return res.status(404).json({ error: "Empresa não encontrada" });
    }

    // Somente admins podem executar esta ação
    if (!req.adminId) {
      await t.rollback();
      return res.status(403).json({ error: "Ação restrita a administradores" });
    }

    const { usuario, senha } = req.body || {};
    if (!senha) {
      await t.rollback();
      return res.status(400).json({
        error: "Senha do admin é obrigatória para confirmar exclusão",
      });
    }

    const admin = await Admin.findByPk(req.adminId, { transaction: t });
    if (!admin) {
      await t.rollback();
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    // Verificar usuário informado (pode ser o nome ou email do admin)
    if (usuario) {
      const norm = String(usuario).trim().toLowerCase();
      const matchesUser =
        (admin.email && String(admin.email).toLowerCase() === norm) ||
        (admin.nome && String(admin.nome).toLowerCase() === norm) ||
        (admin.sobrenome && String(admin.sobrenome).toLowerCase() === norm) ||
        String(admin.id) === norm;
      if (!matchesUser) {
        await t.rollback();
        return res.status(403).json({
          error: "Usuário administrador não confere com o admin logado",
        });
      }
    }

    const senhaValida = await admin.validarSenha(senha);
    if (!senhaValida) {
      await t.rollback();
      return res.status(401).json({ error: "Senha inválida" });
    }

    // Encontrar empresa do sistema correspondente pelo CNPJ (quando aplicável)
    // Busca defensiva: tenta com CNPJ limpo (apenas dígitos) e também com o valor original
    // para cobrir casos em que a tabela `empresas` armazenou o CNPJ formatado.
    const cnpj = empresaPainel.cnpj || "";
    const cnpjLimpo = cnpj.replace(/\D/g, "");
    console.log(
      `[admin/empresas/excluir] buscando Empresa pelo cnpj: '${cnpjLimpo}' (original: '${cnpj}')`,
    );
    let empresaSistema = null;
    if (cnpjLimpo) {
      // Tentar primeiro com o CNPJ limpo; se não achar, tentar com o valor original
      empresaSistema =
        (await Empresa.findOne({
          where: { cnpj: cnpjLimpo },
          transaction: t,
        })) ||
        (cnpj !== cnpjLimpo
          ? await Empresa.findOne({ where: { cnpj }, transaction: t })
          : null);
    }
    const empresaSistemaId = empresaSistema ? empresaSistema.id : null;
    console.log(
      `[admin/empresas/excluir] empresaSistema encontrada: ${empresaSistemaId ? `id=${empresaSistemaId}` : "NÃO ENCONTRADA"}`,
    );

    // Carregar todos os modelos que possuem campo empresa_id e apagar linhas
    const allModels = require("../models");
    const modelsWithEmpresaId = [];
    for (const key of Object.keys(allModels)) {
      const m = allModels[key];
      if (
        m &&
        m.rawAttributes &&
        Object.prototype.hasOwnProperty.call(m.rawAttributes, "empresa_id")
      ) {
        modelsWithEmpresaId.push({ name: key, model: m });
      }
    }

    // Ordem preferencial para evitar problemas de FK (filhos -> pais)
    const preferred = [
      "Agendamento",
      "Venda",
      "Entrada",
      "Saida",
      "Caixa",
      "PagamentoPainel",
      "Produto",
      "Profissional",
      "Fornecedor",
      "Pet",
      "Cliente",
    ];

    const ordered = [
      ...preferred
        .map((n) => modelsWithEmpresaId.find((x) => x.name === n))
        .filter(Boolean),
      ...modelsWithEmpresaId.filter((x) => !preferred.includes(x.name)),
    ];

    if (empresaSistemaId) {
      for (const entry of ordered) {
        try {
          await entry.model.destroy({
            where: { empresa_id: empresaSistemaId },
            transaction: t,
          });
        } catch (e) {
          console.warn(
            `[admin/empresas/excluir] falha ao apagar ${entry.name}:`,
            e && e.message,
          );
          // continuar para tentar apagar outros modelos
        }
      }
    }

    // Atualizar usuários: remover a empresa do array `empresas` ou excluir usuário se ficar vazio
    if (empresaSistemaId) {
      try {
        const target = JSON.stringify(empresaSistemaId);
        const [rows] = await sequelize.query(
          "SELECT id, empresas FROM usuarios WHERE JSON_CONTAINS(empresas, ?)",
          { replacements: [target], transaction: t },
        );
        for (const u of rows) {
          let arr = [];
          try {
            arr =
              typeof u.empresas === "string"
                ? JSON.parse(u.empresas)
                : u.empresas;
          } catch (e) {
            arr = [];
          }
          if (!Array.isArray(arr)) arr = [];
          const novo = arr.filter(
            (x) => Number(x) !== Number(empresaSistemaId),
          );
          if (novo.length === 0) {
            await Usuario.destroy({ where: { id: u.id }, transaction: t });
          } else {
            await Usuario.update(
              { empresas: novo },
              { where: { id: u.id }, transaction: t },
            );
          }
        }
      } catch (e) {
        console.warn(
          "[admin/empresas/excluir] falha ao atualizar usuarios:",
          e && e.message,
        );
      }
    }

    // Apagar empresa do sistema (quando encontrada)
    // Envolver em try-catch: se houver constraint de FK residual, não deve impedir
    // a remoção do registro do painel (objetivo principal do admin).
    if (empresaSistemaId) {
      try {
        // Também remover usuários com empresa_id legada (coluna não presente no modelo Sequelize)
        try {
          await sequelize.query(
            "UPDATE usuarios SET empresa_id = NULL WHERE empresa_id = :empId",
            { replacements: { empId: empresaSistemaId }, transaction: t },
          );
        } catch (legacyErr) {
          console.warn(
            "[admin/empresas/excluir] falha ao limpar usuarios.empresa_id legado:",
            legacyErr && legacyErr.message,
          );
        }
        await Empresa.destroy({
          where: { id: empresaSistemaId },
          transaction: t,
        });
        console.log(
          `[admin/empresas/excluir] Empresa id=${empresaSistemaId} removida.`,
        );
      } catch (e) {
        // FK residual ou outro erro: logar mas não abortar — o registro do painel
        // ainda será removido e a transação continuará.
        console.warn(
          `[admin/empresas/excluir] não foi possível remover Empresa id=${empresaSistemaId} (FK ou outro erro — verifique relações pendentes):`,
          e && e.message,
        );
      }
    }

    // Apagar registro do painel
    await empresaPainel.destroy({ transaction: t });
    console.log(
      `[admin/empresas/excluir] EmpresaPainel id=${empresaPainel.id} removida.`,
    );

    await t.commit();

    // Remover logo do disco (não transacional)
    try {
      if (empresaPainel.logo) {
        const fs = require("fs");
        const path = require("path");
        const logoPath = path.join(__dirname, "..", empresaPainel.logo);
        if (fs.existsSync(logoPath)) fs.unlinkSync(logoPath);
      }
    } catch (e) {
      console.warn(
        "[admin/empresas/excluir] falha ao remover logo:",
        e && e.message,
      );
    }

    return res.json({
      message: "Empresa e dados relacionados excluídos com sucesso",
    });
  } catch (err) {
    await t.rollback();
    console.error("[admin/empresas] Erro ao excluir:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// GET /api/admin/dashboard — resumo geral
async function dashboard(req, res) {
  try {
    const isAdminRequest = !!req.adminId;
    const grupo = isAdminRequest
      ? "admin"
      : req.user && req.user.grupoUsuario
        ? String(req.user.grupoUsuario).toLowerCase()
        : "";
    const isMaster =
      isAdminRequest ||
      grupo.includes("admin") ||
      grupo.includes("acesso total") ||
      grupo.includes("master");

    let whereAll = {};
    let whereAtivas = { status: "ATIVO" };
    let whereVencidas = { status: "VENCIDO" };
    let whereBloqueadas = { status: "BLOQUEADO" };
    if (!isMaster && !isAdminRequest) {
      const empresaId = req.user?.empresaId;
      if (!empresaId) {
        return res.json({
          total: 0,
          ativas: 0,
          vencidas: 0,
          bloqueadas: 0,
          faturamento_mensal: 0,
        });
      }
      whereAll.id = empresaId;
      whereAtivas.id = empresaId;
      whereVencidas.id = empresaId;
      whereBloqueadas.id = empresaId;
    }

    const total = await EmpresaPainel.count({ where: whereAll });
    const ativas = await EmpresaPainel.count({ where: whereAtivas });
    const vencidas = await EmpresaPainel.count({ where: whereVencidas });
    const bloqueadas = await EmpresaPainel.count({ where: whereBloqueadas });

    // Faturamento mensal = soma das mensalidades das empresas ativas (ou da empresa do usuário)
    const faturamento = await EmpresaPainel.sum("valor_mensalidade", {
      where: whereAtivas,
    });

    return res.json({
      total,
      ativas,
      vencidas,
      bloqueadas,
      faturamento_mensal: faturamento || 0,
    });
  } catch (err) {
    console.error("[admin/dashboard] Erro:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// GET /api/admin/faturamento — dados da aba faturamento
async function faturamento(req, res) {
  try {
    const isAdminRequest = !!req.adminId;
    const grupo = isAdminRequest
      ? "admin"
      : req.user && req.user.grupoUsuario
        ? String(req.user.grupoUsuario).toLowerCase()
        : "";
    const isMaster =
      isAdminRequest ||
      grupo.includes("admin") ||
      grupo.includes("acesso total") ||
      grupo.includes("master");

    const where = { status: "ATIVO" };
    if (!isMaster && !isAdminRequest) {
      const empresaId = req.user?.empresaId;
      if (!empresaId)
        return res.json({ totalMensal: 0, empresas: [], pagamentos: [] });
      where.id = empresaId;
    }

    // Empresas ativas com valor
    const empresas = await EmpresaPainel.findAll({
      where,
      attributes: [
        "id",
        "nome_fantasia",
        "cnpj",
        "valor_mensalidade",
        "data_vencimento",
      ],
      order: [["nome_fantasia", "ASC"]],
    });

    const totalMensal = empresas.reduce(
      (acc, e) => acc + parseFloat(e.valor_mensalidade || 0),
      0,
    );

    // Histórico de pagamentos (filtrar por empresa quando aplicável)
    const pagamentosWhere = {};
    if (!isMaster && !isAdminRequest)
      pagamentosWhere.empresa_id = req.user?.empresaId;

    const pagamentos = await PagamentoPainel.findAll({
      where: pagamentosWhere,
      include: [
        {
          model: EmpresaPainel,
          as: "empresa",
          attributes: ["nome_fantasia", "cnpj"],
        },
      ],
      order: [["data_pagamento", "DESC"]],
      limit: 100,
    });

    return res.json({ totalMensal, empresas, pagamentos });
  } catch (err) {
    console.error("[admin/faturamento] Erro:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// POST /api/admin/empresas/:id/pagamento — registrar pagamento manual
async function registrarPagamento(req, res) {
  try {
    const empresa = await EmpresaPainel.findByPk(req.params.id);
    if (!empresa) {
      return res.status(404).json({ error: "Empresa não encontrada" });
    }

    const { valor, observacao } = req.body;

    const pagamento = await PagamentoPainel.create({
      empresa_id: empresa.id,
      valor: valor || empresa.valor_mensalidade,
      data_pagamento: new Date().toISOString().split("T")[0],
      status: "PAGO",
      observacao: observacao || "Pagamento registrado manualmente",
    });

    // Atualizar vencimento (+30 dias)
    const novaData = new Date();
    novaData.setDate(novaData.getDate() + 30);
    await empresa.update({
      status: "ATIVO",
      data_vencimento: novaData.toISOString().split("T")[0],
    });

    // Invalidar cache da empresa no middleware authUser para liberar acesso imediato
    try {
      const { invalidateEmpresaCache } = require("../middleware/authUser");
      if (empresa.cnpj) {
        const cnpjLimpo = empresa.cnpj.replace(/\D/g, "");
        const { Empresa } = require("../models");
        const empresaSistema = await Empresa.findOne({ where: { cnpj: cnpjLimpo }, attributes: ["id"] });
        if (empresaSistema) {
          invalidateEmpresaCache(empresaSistema.id);
        }
      }
    } catch (cacheErr) {
      console.warn("[admin/pagamento] Erro ao invalidar cache:", cacheErr && cacheErr.message);
    }

    return res.status(201).json({ pagamento, empresa });
  } catch (err) {
    console.error("[admin/pagamento] Erro:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// Verificação de vencimentos (chamado pelo cron)
async function verificarVencimentos() {
  try {
    const hoje = new Date().toISOString().split("T")[0];
    const ontem = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    // Empresas vencidas hoje → marcar como VENCIDO
    await EmpresaPainel.update(
      { status: "VENCIDO" },
      { where: { data_vencimento: hoje, status: "ATIVO" } },
    );

    // Empresas com vencimento anterior a hoje → BLOQUEADO
    await EmpresaPainel.update(
      { status: "BLOQUEADO" },
      {
        where: {
          data_vencimento: { [Op.lt]: hoje },
          status: { [Op.in]: ["ATIVO", "VENCIDO"] },
        },
      },
    );

    console.log(`[cron] Verificação de vencimentos concluída em ${hoje}`);
  } catch (err) {
    console.error("[cron] Erro ao verificar vencimentos:", err);
  }
}

// GET /api/admin/empresas/:id/status — verificar status (usado pelo sistema do cliente)
async function verificarStatus(req, res) {
  try {
    const { cnpj } = req.query;
    if (!cnpj) {
      return res.status(400).json({ error: "CNPJ é obrigatório" });
    }

    const cnpjLimpo = cnpj.replace(/\D/g, "");
    const empresa = await EmpresaPainel.findOne({ where: { cnpj: cnpjLimpo } });

    if (!empresa) {
      return res.json({ status: "ATIVO" }); // Se não está no painel, assume ativo
    }

    return res.json({
      status: empresa.status,
      data_vencimento: empresa.data_vencimento,
      nome_fantasia: empresa.nome_fantasia,
    });
  } catch (err) {
    console.error("[admin/status] Erro:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// POST /api/admin/empresas/completa — criar empresa + usuário + integração
async function criarCompleta(req, res) {
  const t = await sequelize.transaction();
  try {
    const {
      razao_social,
      nome_fantasia,
      cnpj,
      cep,
      endereco,
      email,
      telefone,
      valor_mensalidade,
      data_inicio,
      intervalo_dias,
      usuario_nome,
      usuario_email,
      usuario_senha,
    } = req.body;

    // Validações
    if (
      !nome_fantasia ||
      !cnpj ||
      !valor_mensalidade ||
      !data_inicio ||
      !intervalo_dias
    ) {
      await t.rollback();
      return res.status(400).json({
        error:
          "Campos obrigatórios: nome_fantasia, cnpj, valor_mensalidade, data_inicio, intervalo_dias",
      });
    }
    if (!usuario_nome || !usuario_email || !usuario_senha) {
      await t.rollback();
      return res.status(400).json({
        error:
          "Campos obrigatórios do usuário: usuario_nome, usuario_email, usuario_senha",
      });
    }
    if (usuario_senha.length < 6) {
      await t.rollback();
      return res
        .status(400)
        .json({ error: "A senha deve ter no mínimo 6 caracteres" });
    }

    const cnpjLimpo = cnpj.replace(/\D/g, "");
    if (cnpjLimpo.length !== 14) {
      await t.rollback();
      return res.status(400).json({ error: "CNPJ inválido" });
    }

    // Verificar CNPJ duplicado
    const existente = await EmpresaPainel.findOne({
      where: { cnpj: cnpjLimpo },
      transaction: t,
    });
    if (existente) {
      await t.rollback();
      return res.status(409).json({ error: "CNPJ já cadastrado no painel" });
    }

    // Verificar email do usuario duplicado
    const usuarioExistente = await Usuario.findOne({
      where: { usuario: usuario_email },
      transaction: t,
    });
    if (usuarioExistente) {
      await t.rollback();
      return res.status(409).json({ error: "E-mail de usuário já cadastrado" });
    }

    // Calcular próxima cobrança
    const dias = parseInt(intervalo_dias, 10) || 30;
    const dataInicio = new Date(data_inicio + "T00:00:00");
    const proximaCobranca = new Date(dataInicio);
    proximaCobranca.setDate(proximaCobranca.getDate() + dias);
    const dataVencimento = proximaCobranca.toISOString().split("T")[0];

    // Logo (upload via multer)
    let logoPath = null;
    if (req.file) {
      logoPath = "/uploads/logos-empresas/" + req.file.filename;
    }
    // normalize email: convert empty string -> null to satisfy isEmail validator
    const emailClean =
      email && String(email).trim() ? String(email).trim() : null;

    // 1. Criar na tabela empresas_painel
    const empresaPainel = await EmpresaPainel.create(
      {
        razao_social: razao_social || nome_fantasia,
        nome_fantasia,
        cnpj: cnpjLimpo,
        cep,
        endereco,
        email: emailClean,
        telefone,
        logo: logoPath,
        data_adesao: data_inicio,
        status: "ATIVO",
        valor_mensalidade,
        data_vencimento: dataVencimento,
        intervalo_dias: dias,
        proxima_cobranca: dataVencimento,
      },
      { transaction: t },
    );

    // 2. Criar na tabela empresas (sistema PetHub)
    const empresaSistema = await Empresa.create(
      {
        nome: nome_fantasia,
        razaoSocial: razao_social || nome_fantasia,
        cnpj: cnpjLimpo,
        telefone,
        email: emailClean,
        endereco: endereco ? { rua: endereco, cep } : null,
        logo: logoPath,
        ativa: true,
      },
      { transaction: t },
    );

    // 3. Criar usuário vinculado à empresa
    const usuario = await Usuario.create(
      {
        nome: usuario_nome,
        usuario: usuario_email,
        senha: usuario_senha, // bcrypt hook vai hashear automaticamente
        grupoUsuario: "Usuario",
        ativo: true,
        permissoes: [],
        empresas: [empresaSistema.id],
      },
      { transaction: t },
    );

    // Garantir que o JWT inclua explicitamente a empresa criada (compatibilidade)
    const usuarioPayload = usuario.toJSON();
    usuarioPayload.empresa_id = usuarioPayload.empresa_id || empresaSistema.id;

    // Atualizar coluna legada `usuarios.empresa_id` quando presente (compatibilidade)
    try {
      await sequelize.query(
        "UPDATE usuarios SET empresa_id = :empresaId WHERE id = :userId",
        {
          replacements: { empresaId: empresaSistema.id, userId: usuario.id },
          transaction: t,
        },
      );
      console.log(
        `[admin/empresas/completa] Atualizado usuarios.empresa_id usuario=${usuario.id} -> empresa=${empresaSistema.id}`,
      );
    } catch (e) {
      console.warn(
        "[admin/empresas/completa] Falha ao atualizar usuarios.empresa_id:",
        e && e.message,
      );
    }

    // Gerar token do usuário criado para facilitar teste/login imediato
    const token = gerarTokenUsuario(usuarioPayload);

    await t.commit();

    // Enviar cookie de sessão do aplicativo (`pethub_token`) para que o navegador possa usar
    try {
      const cookieDomain = process.env.COOKIE_DOMAIN || null;
      const cookieSecure = process.env.COOKIE_SECURE === "1";
      const jwtCookieOptions = {
        httpOnly: true,
        sameSite: process.env.COOKIE_SAMESITE || "Lax",
        maxAge: 8 * 60 * 60 * 1000,
        path: "/",
      };
      if (cookieDomain) jwtCookieOptions.domain = cookieDomain;
      if (cookieSecure) jwtCookieOptions.secure = true;

      res.cookie("pethub_token", token, jwtCookieOptions);
    } catch (e) {
      console.warn(
        "[admin/empresas/completa] falha ao setar cookie pethub_token",
        e && e.message,
      );
    }

    // Compatibilidade com frontend legado: setar cookies públicos para nome/id
    try {
      // cookies não-httpOnly para leitura pelo frontend
      const cookieDomain = process.env.COOKIE_DOMAIN || null;
      const cookieSecure = process.env.COOKIE_SECURE === "1";
      const legacyOpts = {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/",
      };
      if (cookieDomain) legacyOpts.domain = cookieDomain;
      if (cookieSecure) legacyOpts.secure = true;

      res.cookie("usuarioLogadoId", String(usuario.id), legacyOpts);
      res.cookie("usuarioLogadoNome", usuario.nome || "", legacyOpts);
    } catch (e) {
      console.warn(
        "[admin/empresas/completa] falha ao setar cookies legados:",
        e && e.message,
      );
    }

    // Registrar sessão ativa no DB para que o frontend detecte sessão 'ativa'
    try {
      const crypto = require("crypto");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const { registrarSessao } = require("../controllers/acessosController");
      const clientIp =
        req.headers["x-forwarded-for"] ||
        req.connection?.remoteAddress ||
        req.ip ||
        "";
      const ip =
        typeof clientIp === "string" ? clientIp.split(",")[0].trim() : "";
      const userAgent = req.headers["user-agent"] || "";

      // empresaPainel é o registro criado no painel admin (usado para controle de acessos)
      await registrarSessao(
        usuario.id,
        empresaPainel.id,
        tokenHash,
        ip,
        userAgent,
      );
      console.log(
        `[admin/empresas/completa] Sessão registrada usuario=${usuario.id} empresaPainel=${empresaPainel.id}`,
      );
    } catch (e) {
      console.warn(
        "[admin/empresas/completa] falha ao registrar sessão no DB:",
        e && e.message,
      );
    }

    return res.status(201).json({
      message: "Empresa e usuário criados com sucesso!",
      empresaPainel,
      empresaSistema: { id: empresaSistema.id, nome: empresaSistema.nome },
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        usuario: usuario.usuario,
        token,
      },
    });
  } catch (err) {
    await t.rollback();
    console.error("[admin/empresas/completa] Erro ao criar:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// POST /api/admin/empresas/:id/impersonate — gerar token de impersonação
async function impersonate(req, res) {
  try {
    console.log(
      `[admin/impersonate] solicitacao empresaPainelId=${req.params.id} admin=${req.adminId || "unknown"}`,
    );
    const empresaPainel = await EmpresaPainel.findByPk(req.params.id);
    if (!empresaPainel) {
      console.log(
        `[admin/impersonate] empresaPainel id=${req.params.id} nao encontrada`,
      );
      return res.status(404).json({ error: "Empresa não encontrada" });
    }

    if (!req.adminId) {
      return res.status(403).json({ error: "Ação restrita a administradores" });
    }

    const { usuario, senha } = req.body || {};
    if (!senha) {
      return res.status(400).json({ error: "Senha do admin é obrigatória" });
    }

    const admin = await Admin.findByPk(req.adminId);
    if (!admin) {
      return res.status(401).json({ error: "Admin não encontrado" });
    }

    // Verificar usuário informado
    if (usuario) {
      const norm = String(usuario).trim().toLowerCase();
      const matchesUser =
        (admin.email && String(admin.email).toLowerCase() === norm) ||
        (admin.nome && String(admin.nome).toLowerCase() === norm) ||
        (admin.sobrenome && String(admin.sobrenome).toLowerCase() === norm) ||
        String(admin.id) === norm;
      if (!matchesUser) {
        return res.status(403).json({
          error: "Usuário administrador não confere com o admin logado",
        });
      }
    }

    const senhaValida = await admin.validarSenha(senha);
    if (!senhaValida) {
      return res.status(401).json({ error: "Senha inválida" });
    }

    // Encontrar a empresa do sistema pelo CNPJ — tenta múltiplos formatos
    const cnpj = empresaPainel.cnpj
      ? empresaPainel.cnpj.replace(/\D/g, "")
      : null;
    if (!cnpj) {
      return res.status(400).json({ error: "Empresa sem CNPJ vinculado" });
    }

    // Busca 1: CNPJ limpo (somente dígitos)
    let empresaSistema = await Empresa.findOne({ where: { cnpj } });
    // Busca 2: valor original do painel (pode estar formatado 00.000.000/0001-00)
    if (!empresaSistema && empresaPainel.cnpj !== cnpj) {
      empresaSistema = await Empresa.findOne({
        where: { cnpj: empresaPainel.cnpj },
      });
    }
    // Busca 3: LIKE — cobre qualquer outra variação de pontuação
    if (!empresaSistema) {
      empresaSistema = await Empresa.findOne({
        where: { cnpj: { [Op.like]: `%${cnpj}%` } },
      });
    }
    console.log(
      `[admin/impersonate] empresaSistema: ${empresaSistema ? `id=${empresaSistema.id}` : "NÃO ENCONTRADA pelo CNPJ='${cnpj}'"}`,
    );

    let empresaSistemaId = empresaSistema ? empresaSistema.id : null;

    // Buscar um usuário vinculado a essa empresa para gerar o token
    let usuarioAlvo = null;

    if (empresaSistemaId) {
      // Busca via campo JSON `empresas`
      const usuarios = await Usuario.findAll({
        where: { ativo: true },
        attributes: ["id", "nome", "empresas", "grupoUsuario"],
      });
      for (const u of usuarios) {
        const emps = Array.isArray(u.empresas) ? u.empresas : [];
        for (const e of emps) {
          const eId =
            typeof e === "number"
              ? e
              : typeof e === "string"
                ? parseInt(e, 10)
                : e && e.id
                  ? parseInt(e.id, 10)
                  : null;
          if (eId === empresaSistemaId) {
            if (!usuarioAlvo) {
              usuarioAlvo = u;
            }
            const grupo = String(u.grupoUsuario || "").toLowerCase();
            if (
              grupo.includes("admin") ||
              grupo.includes("acesso total") ||
              grupo.includes("master")
            ) {
              usuarioAlvo = u;
            }
          }
        }
      }
    }

    // Fallback A: coluna legada `empresa_id` na tabela usuarios
    if (!usuarioAlvo && empresaSistemaId) {
      try {
        const legacyRows = await sequelize.query(
          `SELECT id, nome, grupoUsuario FROM usuarios
           WHERE empresa_id = :empId AND ativo = 1
           ORDER BY id ASC LIMIT 10`,
          {
            replacements: { empId: empresaSistemaId },
            type: QueryTypes.SELECT,
          },
        );
        if (legacyRows && legacyRows.length > 0) {
          usuarioAlvo = legacyRows[0];
          for (const row of legacyRows) {
            const grupo = String(row.grupoUsuario || "").toLowerCase();
            if (
              grupo.includes("admin") ||
              grupo.includes("acesso total") ||
              grupo.includes("master")
            ) {
              usuarioAlvo = row;
              break;
            }
          }
          console.log(
            `[admin/impersonate] usuário via empresa_id legado=${empresaSistemaId}: id=${usuarioAlvo.id}`,
          );
        }
      } catch (legacyErr) {
        console.warn(
          "[admin/impersonate] falha ao buscar usuário legado:",
          legacyErr && legacyErr.message,
        );
      }
    }

    // Fallback B: se o CNPJ não casou com nenhuma `empresas`, buscar usuário diretamente
    // via sessões ativas vinculadas a este empresaPainel.id.
    // Isto cobre empresas cadastradas apenas no painel (sem registro em `empresas`).
    if (!usuarioAlvo) {
      try {
        const { SessaoAtiva } = require("../models");
        const sessaoRows = await sequelize.query(
          `SELECT u.id, u.nome, u.grupoUsuario, u.empresas, u.empresa_id AS empresa_id_legado
           FROM sessoes_ativas s
           INNER JOIN usuarios u ON u.id = s.usuario_id
           WHERE s.empresa_id = :painelId AND u.ativo = 1
           ORDER BY s.ultima_atividade DESC
           LIMIT 10`,
          {
            replacements: { painelId: empresaPainel.id },
            type: QueryTypes.SELECT,
          },
        );
        if (sessaoRows && sessaoRows.length > 0) {
          usuarioAlvo = sessaoRows[0];
          for (const row of sessaoRows) {
            const grupo = String(row.grupoUsuario || "").toLowerCase();
            if (
              grupo.includes("admin") ||
              grupo.includes("acesso total") ||
              grupo.includes("master")
            ) {
              usuarioAlvo = row;
              break;
            }
          }
          console.log(
            `[admin/impersonate] usuário encontrado via sessões ativas (empresa_painel=${empresaPainel.id}): id=${usuarioAlvo.id}`,
          );
        }
      } catch (sessaoErr) {
        console.warn(
          "[admin/impersonate] falha ao buscar usuário via sessões:",
          sessaoErr && sessaoErr.message,
        );
      }
    }

    if (!usuarioAlvo) {
      console.warn(
        `[admin/impersonate] nenhum usuário encontrado para empresaPainel.id=${empresaPainel.id}`,
      );
      return res.status(404).json({
        error:
          "Nenhum usuário ativo encontrado para esta empresa. Verifique se há usuários cadastrados.",
      });
    }

    // Se não temos empresaSistemaId, tentar derivar do próprio usuário encontrado
    if (!empresaSistemaId) {
      const emps = Array.isArray(usuarioAlvo.empresas)
        ? usuarioAlvo.empresas
        : typeof usuarioAlvo.empresas === "string"
          ? (() => {
              try {
                return JSON.parse(usuarioAlvo.empresas);
              } catch (e) {
                return [];
              }
            })()
          : [];
      if (emps.length > 0) {
        const e = emps[0];
        empresaSistemaId =
          typeof e === "number"
            ? e
            : typeof e === "string"
              ? parseInt(e, 10) || null
              : e && e.id
                ? parseInt(e.id, 10) || null
                : null;
      }
      // Tentar coluna legada
      if (!empresaSistemaId && usuarioAlvo.empresa_id_legado) {
        empresaSistemaId = Number(usuarioAlvo.empresa_id_legado) || null;
      }
      console.log(
        `[admin/impersonate] empresaSistemaId derivado do usuário ${usuarioAlvo.id}: ${empresaSistemaId}`,
      );
    }

    // Sem empresaSistemaId não é possível gerar o token (campo NOT NULL no banco)
    if (!empresaSistemaId) {
      return res.status(422).json({
        error:
          "Não foi possível identificar a empresa vinculada a este usuário. Vincule o usuário a uma empresa e tente novamente.",
      });
    }

    // Gerar token de impersonação (salvo no banco, uso único, expira em 60s)
    const impToken = await AdminImpersonationToken.gerarToken({
      adminId: admin.id,
      empresaId: empresaSistema.id,
      usuarioId: usuarioAlvo.id,
    });

    // Retornar URL absoluta para evitar problemas de origem
    const host = req.get("host");
    const proto = req.protocol || "https";
    const absoluteUrl = `${proto}://${host}/api/admin/impersonate/${impToken.token}`;

    return res.json({
      impersonateUrl: absoluteUrl,
      empresa: empresaPainel.nome_fantasia,
    });
  } catch (err) {
    console.error("[admin/impersonate] Erro:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// GET /api/admin/impersonate/:token — consumir token e redirecionar
async function impersonateRedirect(req, res) {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).send("Token inválido");
    }

    const registro = await AdminImpersonationToken.findOne({
      where: { token },
    });

    if (!registro) {
      return res.status(404).send("Token não encontrado ou já utilizado");
    }

    if (registro.usado) {
      return res.status(410).send("Este token já foi utilizado");
    }

    if (new Date() > new Date(registro.expira_em)) {
      return res.status(410).send("Token expirado");
    }

    // Marcar como usado
    registro.usado = true;
    await registro.save();

    // Buscar o usuário e gerar JWT
    const usuario = await Usuario.findByPk(registro.usuario_id);
    if (!usuario) {
      return res.status(404).send("Usuário não encontrado");
    }

    const userPayload = {
      ...usuario.toJSON(),
      empresaId: registro.empresa_id,
      empresa_id: registro.empresa_id,
    };

    const jwtToken = gerarTokenUsuario(userPayload);

    // Invalidar cache do authUser para forçar uso do novo JWT imediatamente
    try {
      const { invalidateUserCache } = require("../middleware/authUser");
      if (typeof invalidateUserCache === "function") {
        invalidateUserCache(usuario.id);
      }
    } catch (_) {}

    // Setar cookie e redirecionar para dashboard
    const cookieDomain = process.env.COOKIE_DOMAIN || null;
    const cookieSecure = process.env.COOKIE_SECURE === "1";
    const jwtCookieOptions = {
      httpOnly: true,
      sameSite: process.env.COOKIE_SAMESITE || "Lax",
      maxAge: 8 * 60 * 60 * 1000,
      path: "/",
    };
    if (cookieDomain) jwtCookieOptions.domain = cookieDomain;
    if (cookieSecure) jwtCookieOptions.secure = true;

    res.cookie("pethub_token", jwtToken, jwtCookieOptions);

    // Setar também cookies legados para compatibilidade
    const legacyOpts = {
      maxAge: 8 * 60 * 60 * 1000,
      path: "/",
    };
    if (cookieDomain) legacyOpts.domain = cookieDomain;
    if (cookieSecure) legacyOpts.secure = true;

    res.cookie("usuarioLogadoId", String(usuario.id), legacyOpts);
    res.cookie("usuarioLogadoNome", usuario.nome || "", legacyOpts);

    // Registrar sessão ativa no DB (para aparecer no painel de acessos)
    // IMPORTANTE: aplicar limite de sessões simultâneas, igual ao fluxo normal de login.
    // Sem isso, a impersonação bypassaria o controle de sessões do cliente.
    try {
      const crypto = require("crypto");
      const tokenHash = crypto
        .createHash("sha256")
        .update(jwtToken)
        .digest("hex");
      const {
        registrarSessao,
        verificarLimiteAcessos,
      } = require("../controllers/acessosController");

      // Mapear empresaSistema (registro.empresa_id) -> empresaPainel.id via CNPJ
      // Usa SQL nativo que limpa pontuação dos dois lados para garantir o match
      const empresaSistemaRec = await Empresa.findByPk(registro.empresa_id, {
        attributes: ["cnpj"],
      });
      let empresaPainelRec = null;
      if (empresaSistemaRec && empresaSistemaRec.cnpj) {
        const cnpjLimpo = String(empresaSistemaRec.cnpj).replace(/\D/g, "");
        const rows = await sequelize.query(
          `SELECT id, limite_acessos FROM empresas_painel
           WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj,'.',''),'/',''),'-',''),' ','') = :cnpjLimpo
           LIMIT 1`,
          { replacements: { cnpjLimpo }, type: QueryTypes.SELECT },
        );
        if (rows && rows.length > 0) {
          empresaPainelRec = rows[0];
        }
      }

      // Verificar limite de sessões e derrubar as mais antigas se necessário
      if (empresaPainelRec) {
        const limiteCheck = await verificarLimiteAcessos(registro.empresa_id);
        if (
          limiteCheck.sessoesDerrubar &&
          limiteCheck.sessoesDerrubar.length > 0
        ) {
          const { SessaoAtiva } = require("../models");
          console.log(
            `[admin/impersonateRedirect] derrubando ${limiteCheck.sessoesDerrubar.length} sessão(ões) antiga(s) para empresa ${empresaPainelRec.id}`,
          );
          for (const sessao of limiteCheck.sessoesDerrubar) {
            await SessaoAtiva.update(
              { ativo: false },
              { where: { id: sessao.id, ativo: true } },
            );
          }
        }
      }

      const clientIp =
        req.headers["x-forwarded-for"] ||
        req.connection?.remoteAddress ||
        req.ip ||
        "";
      const ip =
        typeof clientIp === "string" ? clientIp.split(",")[0].trim() : "";
      const userAgent = req.headers["user-agent"] || "";
      await registrarSessao(
        usuario.id,
        empresaPainelRec ? empresaPainelRec.id : null,
        tokenHash,
        ip,
        userAgent,
      );
    } catch (e) {
      console.warn(
        "[admin/impersonateRedirect] falha ao registrar sessão:",
        e && e.message,
      );
    }

    return res.redirect("/dashboard.html");
  } catch (err) {
    console.error("[admin/impersonateRedirect] Erro:", err);
    return res.status(500).send("Erro interno do servidor");
  }
}

module.exports = {
  listar,
  detalhes,
  criar,
  criarCompleta,
  atualizar,
  bloquear,
  reativar,
  excluir,
  dashboard,
  faturamento,
  registrarPagamento,
  verificarVencimentos,
  verificarStatus,
  impersonate,
  impersonateRedirect,
};
