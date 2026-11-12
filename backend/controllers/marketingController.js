/**
 * Marketing Controller
 * ----------------------
 * Gerencia todas as operações do módulo de Marketing/WhatsApp:
 * - Conexão WhatsApp (QR Code, status, desconexão)
 * - CRUD de mensagens automáticas
 * - Ativação/desativação com configuração de envio
 * - Upload de imagens para mensagens
 * - Histórico de envios e logs
 * - Server-Sent Events (SSE) para atualizações em tempo real
 */

const path = require("path");
const fs = require("fs");
const whatsappService = require("../services/whatsappService");

// ──────────────────────────────────────────────
// Mensagens padrão do sistema (seed inicial)
// ──────────────────────────────────────────────
const MENSAGENS_PADRAO = [
  {
    tipo: "boas_vindas",
    titulo: "Boas-vindas para novos clientes que possuem pets",
    conteudo:
      "Olá {nome_tutor}, seja bem-vindo(a) à {nome_empresa}! 🐾\n\nEstamos felizes em cuidar do {nome_pet}. Pode contar com a gente!\n\nAté breve! 😊",
    icone: "fa-hand-wave",
    descricaoMarketing:
      "Ao ativar esta mensagem, você fortalece a relação desde o primeiro contato, proporcionando uma experiência acolhedora e personalizada.",
    configuracaoEnvio: null,
    ativo: false,
  },
  {
    tipo: "lembrete_agendamento",
    titulo: "Lembrete de Agendamento de Serviço",
    conteudo:
      "🐾 Olá {nome_tutor}!\n\nLembramos que {nome_pet} tem um agendamento marcado para {data_agendamento} às {hora_agendamento}.\n\n📍 Local: {nome_empresa}\n💼 Serviço: {servico}\n\nAté breve! 🐕❤️",
    icone: "fa-calendar",
    descricaoMarketing:
      "Reduza faltas e melhoredra a experiência do cliente com lembretes automáticos de agendamento.",
    configuracaoEnvio: { tipo: "no_dia", hora: "09:00" },
    ativo: false,
  },
  {
    tipo: "pet_pronto",
    titulo: "Aviso que o pet está pronto",
    conteudo:
      "🎉 Boa notícia, {nome_tutor}!\n\n{nome_pet} está prontinho e te esperando aqui na {nome_empresa}! 🐾✨\n\nPode vir buscar quando quiser. Estamos aqui até às 18h.\n\nObrigado pela confiança! 💙",
    icone: "fa-check-circle",
    descricaoMarketing:
      "Notifique automaticamente quando o pet estiver pronto para ser buscado.",
    configuracaoEnvio: null,
    ativo: true,
  },

  {
    tipo: "aniversario_pet",
    titulo: "Felicitações aos Pets Aniversariantes",
    conteudo:
      "Oi {nome_tutor},\n\nHoje é um dia especial, pois é o aniversário de um pet muito querido 💚\n\n{nome_pet}\nQueremos desejar um aniversário cheio de alegrias e lambidas! 🎂🐾\nQue este dia seja repleto de brincadeiras, petiscos deliciosos e muito carinho. Agradecemos por permitir que façamos parte da sua vida. 🐾❤️\n\nFeliz Aniversário 🎉🐾\n{nome_pet}",
    icone: "fa-birthday-cake",
    descricaoMarketing:
      "Parabenize os pets em seu aniversário — uma ação personalizada que aumenta o vínculo emocional.",
    configuracaoEnvio: { tipo: "no_dia", hora: "09:00" },
    ativo: false,
  },
  {
    tipo: "aniversario_tutor",
    titulo: "Felicitações aos Tutores Aniversariantes",
    conteudo:
      "🎂 Olá {nome_tutor}!\n\nHoje é o seu dia especial e não podíamos deixar passar!\n\nA equipe da {nome_empresa} deseja a você um feliz aniversário repleto de alegrias, saúde e muitos momentos com {nome_pet}! 🐾❤️\n\nFeliz Aniversário! 🎉",
    icone: "fa-user-birthday",
    descricaoMarketing:
      "Surpreenda os tutores em seu aniversário para fortalecer o relacionamento.",
    configuracaoEnvio: { tipo: "no_dia", hora: "09:00" },
    ativo: false,
  },
  {
    tipo: "vacinas_vencendo",
    titulo: "Produto a receber vencido",
    conteudo:
      "💉 Oi {nome_tutor}!\n\nPassando para avisar que a {produto} de {nome_pet} vence hoje!\n\nNão esqueça de agendar na {nome_empresa} para manter {nome_pet} protegido(a). 🐾\n\nEntre em contato! 😊",
    icone: "fa-syringe",
    descricaoMarketing:
      "Mantenha os clientes informados sobre vacinas/vermífugos/antiparasitários vencendo para garantir visitas regulares.",
    configuracaoEnvio: { tipo: "no_dia", hora: "09:00" },
    ativo: false,
  },

  {
    tipo: "primeiro_banho",
    titulo: "Mensagem de pós-atendimento para primeiros banhos",
    conteudo:
      "🐾 Olá {nome_tutor}!\n\nFoi um prazer receber {nome_pet} pelo primeiro banho hoje!\n\nEsperamos que {nome_pet} tenha adorado. Sua satisfação é nossa prioridade. 😊\n\nFicamos à disposição!\n{nome_empresa} ❤️",
    icone: "fa-star",
    descricaoMarketing:
      "Fortaleça o relacionamento após o primeiro atendimento com uma mensagem de pós-serviço personalizada.",
    configuracaoEnvio: null,
    ativo: true,
  },
];

// ──────────────────────────────────────────────
// WhatsApp: Conexão via QR Code
// ──────────────────────────────────────────────

/**
 * GET /api/marketing/whatsapp/status
 * Retorna o status atual da conexão WhatsApp da empresa.
 */
exports.statusWhatsapp = async (req, res) => {
  const empresaId = req.user?.empresaId;
  if (!empresaId) return res.status(403).json({ erro: "Empresa não identificada" });
  return res.json(whatsappService.obterStatus(empresaId));
};

/**
 * POST /api/marketing/whatsapp/conectar
 * Inicia a conexão WhatsApp (geração do QR Code).
 */
exports.conectarWhatsapp = async (req, res) => {
  const empresaId = req.user?.empresaId;
  if (!empresaId) return res.status(403).json({ erro: "Empresa não identificada" });

  try {
    const resultado = await whatsappService.inicializarCliente(
      String(empresaId),
    );
    return res.json({ sucesso: true, resultado });
  } catch (err) {
    console.error("[Marketing] Erro ao conectar WhatsApp:", err.message);
    return res.status(500).json({ sucesso: false, erro: err.message });
  }
};

/**
 * POST /api/marketing/whatsapp/desconectar
 * Desconecta o WhatsApp da empresa.
 */
exports.desconectarWhatsapp = async (req, res) => {
  const empresaId = req.user?.empresaId;
  if (!empresaId) return res.status(403).json({ erro: "Empresa não identificada" });

  try {
    await whatsappService.desconectar(String(empresaId));
    return res.json({ sucesso: true });
  } catch (err) {
    return res.status(500).json({ sucesso: false, erro: err.message });
  }
};

/**
 * POST /api/marketing/whatsapp/resetar
 * Limpa sessão corrompida/expirada e reconecta (gera novo QR).
 */
exports.resetarWhatsapp = async (req, res) => {
  const empresaId = req.user?.empresaId;
  if (!empresaId) return res.status(403).json({ erro: "Empresa não identificada" });

  try {
    console.log(
      `[Marketing] Reset de sessão WhatsApp para empresa ${empresaId}`,
    );
    const resultado = await whatsappService.limparSessao(String(empresaId));
    // Após limpar, já inicializa nova conexão para gerar QR
    const inicResult = await whatsappService.inicializarCliente(
      String(empresaId),
    );
    return res.json({ sucesso: true, resultado, inicResult });
  } catch (err) {
    console.error("[Marketing] Erro ao resetar WhatsApp:", err.message);
    return res.status(500).json({ sucesso: false, erro: err.message });
  }
};

/**
 * GET /api/marketing/whatsapp/qr-status
 * Polling endpoint: retorna status atual + QR Base64 se disponível.
 * Usado como fallback confiável ao SSE.
 */
exports.obterQRStatus = (req, res) => {
  const empresaId = req.user?.empresaId;
  if (!empresaId) return res.status(403).json({ erro: "Empresa não identificada" });
  const statusAtual = whatsappService.obterStatus(String(empresaId));
  return res.json(statusAtual);
};

/**
 * GET /api/marketing/whatsapp/eventos
 * Server-Sent Events: stream de atualizações de QR Code e status.
 */
exports.eventoSSE = async (req, res) => {
  const empresaId = req.user?.empresaId;
  if (!empresaId) return res.status(403).json({ erro: "Empresa não identificada" });
  if (req.query.empresaId !== undefined) {
    const match = /^disp_([1-9]\d*)$/.exec(String(req.query.empresaId));
    if (!match) return res.status(403).end();
    const { WhatsappSession } = require("../models");
    const instancia = await WhatsappSession.findOne({
      where: { id: match[1], empresaId }, attributes: ["id"]
    });
    if (!instancia) return res.status(403).end();
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  // Ecoar a origin da requisição para compatibilidade com credentials: true
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.flushHeaders();

  // Enviar status inicial
  const statusAtual = whatsappService.obterStatus(empresaId);
  res.write(
    `data: ${JSON.stringify({ evento: "status_inicial", ...statusAtual })}\n\n`,
  );

  // Registrar listener SSE
  whatsappService.adicionarListenerSSE(String(empresaId), res);

  // Heartbeat a cada 30 segundos para manter a conexão viva
  const heartbeat = setInterval(() => {
    try {
      res.write(":heartbeat\n\n");
    } catch (_) {
      clearInterval(heartbeat);
    }
  }, 60 * 1000);

  req.on("close", () => clearInterval(heartbeat));
};

// ──────────────────────────────────────────────
// Mensagens Automáticas: CRUD
// ──────────────────────────────────────────────

/**
 * GET /api/marketing/mensagens
 * Lista todas as mensagens (ativas e inativas).
 */
exports.listarMensagens = async (req, res) => {
  const empresaId = req.user?.empresaId;
  if (!empresaId) return res.status(403).json({ erro: "Empresa não identificada" });

  try {
    const { MensagemAutomatica } = require("../models");

    let mensagens = await MensagemAutomatica.findAll({
      where: { empresaId: Number(empresaId) },
      order: [
        ["ativo", "DESC"],
        ["tipo", "ASC"],
      ],
    });

    // Se ainda não há mensagens para a empresa, fazer seed das padrões
    if (mensagens.length === 0) {
      await garantirMensagens(Number(empresaId));
      mensagens = await MensagemAutomatica.findAll({where:{empresaId:Number(empresaId)}});
    }

    // Títulos/conteúdos personalizados não são regravados durante a listagem.

    // Ocultar tipos removidos do sistema
    const TIPOS_REMOVIDOS = [
      "pet_liberado_portal",
      "plano_banhos_concluido",
      "lembrete_produtos",
      "programas_fidelidade",
    ];
    mensagens = mensagens.filter((m) => !TIPOS_REMOVIDOS.includes(m.tipo));

    return res.json(mensagens);
  } catch (err) {
    console.error("[Marketing] Erro ao listar mensagens:", err.message);
    return res.status(500).json({ erro: err.message });
  }
};

/**
 * GET /api/marketing/mensagens/:id
 * Obtém uma mensagem específica.
 */
exports.obterMensagem = async (req, res) => {
  try {
    const { MensagemAutomatica } = require("../models");
    const mensagem = await MensagemAutomatica.findByPk(req.params.id);

    if (!mensagem)
      return res.status(404).json({ erro: "Mensagem não encontrada" });

    // ISOLAMENTO MULTI-TENANT: mensagem deve pertencer à empresa autenticada
    const empresaAuth =
      req.user && req.user.empresaId ? Number(req.user.empresaId) : null;
    if (
      !empresaAuth ||
      Number(mensagem.empresaId) !== empresaAuth
    ) {
      return res.status(403).json({ erro: "Mensagem não pertence à sua empresa" });
    }

    return res.json(mensagem);
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
};

/**
 * PUT /api/marketing/mensagens/:id
 * Atualiza o conteúdo de uma mensagem.
 */
exports.atualizarMensagem = async (req, res) => {
  try {
    const { MensagemAutomatica } = require("../models");
    const mensagem = await MensagemAutomatica.findByPk(req.params.id);

    if (!mensagem)
      return res.status(404).json({ erro: "Mensagem não encontrada" });

    // ISOLAMENTO MULTI-TENANT: mensagem deve pertencer à empresa autenticada
    const empresaAuth =
      req.user && req.user.empresaId ? Number(req.user.empresaId) : null;
    if (!empresaAuth || Number(mensagem.empresaId) !== empresaAuth) {
      return res.status(403).json({ erro: "Mensagem não pertence à sua empresa" });
    }

    const { conteudo, titulo } = req.body;

    // Se teve upload de nova imagem → usar a nova
    // Se veio flag removerImagem=true → limpar (null)
    // Caso contrário → manter a imagem existente
    const removerImg =
      req.body.removerImagem === "true" || req.body.removerImagem === true;
    const imagemPath = req.file
      ? `/uploads/marketing/${req.file.filename}`
      : removerImg
        ? null
        : mensagem.imagemPath;

    await mensagem.update({ conteudo, titulo, imagemPath });

    return res.json(mensagem);
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
};

/**
 * POST /api/marketing/mensagens/:id/ativar
 * Ativa uma mensagem automática com configuração de horário.
 */
exports.ativarMensagem = async (req, res) => {
  try {
    const { MensagemAutomatica, LogEnvio } = require("../models");
    const mensagem = await MensagemAutomatica.findByPk(req.params.id);

    if (!mensagem)
      return res.status(404).json({ erro: "Mensagem não encontrada" });

    // ISOLAMENTO MULTI-TENANT: mensagem deve pertencer à empresa autenticada
    const empresaAuth =
      req.user && req.user.empresaId ? Number(req.user.empresaId) : null;
    if (!empresaAuth || Number(mensagem.empresaId) !== empresaAuth) {
      return res.status(403).json({ erro: "Mensagem não pertence à sua empresa" });
    }

    const { configuracaoEnvio } = req.body;
    const configValidada=require('../services/marketingTempo').config(configuracaoEnvio ?? mensagem.configuracaoEnvio,mensagem.tipo,true);
    await require('../services/marketingDisparos').preparar();
    await mensagem.update({
      ativo: true,
      configuracaoEnvio: configValidada,
    });

    await require('../services/marketingScheduler').sincronizarMensagem(mensagem);

    // Registrar log
    await LogEnvio.create({
      empresaId: mensagem.empresaId,
      evento: "mensagem_ativada",
      detalhes: { mensagemId: mensagem.id, tipo: mensagem.tipo },
      mensagem: `Mensagem "${mensagem.titulo}" ativada`,
    }).catch(() => {});

    return res.json({ sucesso: true, mensagem });
  } catch (err) {
    return res.status(err.status || 500).json({ erro: err.message });
  }
};

/**
 * POST /api/marketing/mensagens/:id/desativar
 * Desativa uma mensagem automática.
 */
exports.desativarMensagem = async (req, res) => {
  try {
    const { MensagemAutomatica, LogEnvio } = require("../models");
    const mensagem = await MensagemAutomatica.findByPk(req.params.id);

    if (!mensagem)
      return res.status(404).json({ erro: "Mensagem não encontrada" });

    // ISOLAMENTO MULTI-TENANT: mensagem deve pertencer à empresa autenticada
    const empresaAuth =
      req.user && req.user.empresaId ? Number(req.user.empresaId) : null;
    if (!empresaAuth || Number(mensagem.empresaId) !== empresaAuth) {
      return res.status(403).json({ erro: "Mensagem não pertence à sua empresa" });
    }

    await mensagem.update({ ativo: false });
    const {EnvioAgendado}=require('../models');
    await EnvioAgendado.update({status:'cancelado',erroMensagem:'Automação desativada.'},
      {where:{empresaId:empresaAuth,mensagemAutomaticaId:mensagem.id,status:'pendente'}});

    await LogEnvio.create({
      empresaId: mensagem.empresaId,
      evento: "mensagem_desativada",
      detalhes: { mensagemId: mensagem.id, tipo: mensagem.tipo },
      mensagem: `Mensagem "${mensagem.titulo}" desativada`,
    }).catch(() => {});

    return res.json({ sucesso: true });
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
};

/**
 * POST /api/marketing/mensagens/:id/upload-imagem
 * Upload de imagem para uma mensagem (usa multer via rota).
 */
exports.uploadImagem = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ erro: "Nenhuma imagem enviada" });

    const { MensagemAutomatica } = require("../models");
    const mensagem = await MensagemAutomatica.findByPk(req.params.id);

    if (!mensagem)
      return res.status(404).json({ erro: "Mensagem não encontrada" });

    // ISOLAMENTO MULTI-TENANT: mensagem deve pertencer à empresa autenticada
    const empresaUpload =
      req.user && req.user.empresaId ? Number(req.user.empresaId) : null;
    if (!empresaUpload || Number(mensagem.empresaId) !== empresaUpload) {
      return res
        .status(403)
        .json({ erro: "Mensagem não pertence à sua empresa" });
    }

    const imagemPath = `/uploads/marketing/${req.file.filename}`;
    await mensagem.update({ imagemPath });

    return res.json({
      sucesso: true,
      imagemPath: `/uploads/marketing/${req.file.filename}`,
    });
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
};

// ──────────────────────────────────────────────
// Envios e Logs
// ──────────────────────────────────────────────

/**
 * GET /api/marketing/envios
 * Lista envios agendados com filtros opcionais.
 */
exports.listarEnvios = async (req, res) => {
  const { status, limite = 50 } = req.query;
  const empresaId = req.user?.empresaId;
  const { Op } = require("sequelize");

  try {
    const { EnvioAgendado } = require("../models");
    if (!empresaId) return res.status(403).json({ erro: "Empresa não identificada" });
    const where = { empresaId: Number(empresaId) };

    if (status) where.status = status;

    const envios = await EnvioAgendado.findAll({
      where,
      order: [["dataAgendada", "DESC"]],
      limit: Number(limite),
    });

    return res.json(envios);
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
};

/**
 * GET /api/marketing/logs
 * Lista logs de envio.
 */
exports.listarLogs = async (req, res) => {
  const { limite = 100 } = req.query;
  const empresaId = req.user?.empresaId;

  try {
    const { LogEnvio } = require("../models");
    if (!empresaId) return res.status(403).json({ erro: "Empresa não identificada" });
    const logs = await LogEnvio.findAll({
      where: { empresaId: Number(empresaId) },
      order: [["createdAt", "DESC"]],
      limit: Number(limite),
    });

    return res.json(logs);
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
};

/**
 * GET /api/marketing/estatisticas
 * Retorna contadores de mensagens para o dashboard.
 */
exports.estatisticas = async (req, res) => {
  const empresaId = req.user?.empresaId;
  if (!empresaId) return res.status(403).json({ erro: "Empresa não identificada" });

  try {
    const { EnvioAgendado, MensagemAutomatica } = require("../models");

    const [totalAtivas, totalInativas, enviados, pendentes, erros] =
      await Promise.all([
    MensagemAutomatica.count({
      where: { empresaId: Number(empresaId), ativo: true },
    }),
    MensagemAutomatica.count({
      where: { empresaId: Number(empresaId), ativo: false },
    }),
    EnvioAgendado.count({
      where: { empresaId: Number(empresaId), status: "enviado" },
    }),
    EnvioAgendado.count({
      where: { empresaId: Number(empresaId), status: "pendente" },
    }),
    EnvioAgendado.count({
      where: { empresaId: Number(empresaId), status: "erro" },
    }),
      ]);

    return res.json({ totalAtivas, totalInativas, enviados, pendentes, erros });
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
};

// ──────────────────────────────────────────────
// Trigger: Agendar envio automático
// (chamado internamente por outros controllers)
// ──────────────────────────────────────────────

/**
 * Normaliza configuracaoEnvio para o formato novo { hora, dias: [...] }.
 * Aceita formato legado { tipo: 'no_dia', hora } ou { tipo: 'dias_antes', valor, hora }.
 */
function normalizarConfig(config, tipo) {
  return require('../services/marketingTempo').config(config,tipo);
}
async function garantirMensagens(empresaId) {
  const {MensagemAutomatica,Empresa,sequelize}=require('../models');
  if(!Number.isSafeInteger(Number(empresaId))||Number(empresaId)<1)return;
  await sequelize.transaction(async transaction=>{
    const empresa=await Empresa.findByPk(empresaId,{transaction,lock:transaction.LOCK.UPDATE});
    if(!empresa)return;
    const existentes=await MensagemAutomatica.findAll({where:{empresaId},attributes:['tipo'],transaction});
    const tipos=new Set(existentes.map(m=>m.tipo));
    const faltantes=MENSAGENS_PADRAO.filter(m=>!tipos.has(m.tipo));
    if(faltantes.length)await MensagemAutomatica.bulkCreate(faltantes.map(m=>({...m,empresaId})),{transaction});
  });
}
async function dispararMensagemAutomatica(...args) {
  try {
    await garantirMensagens(Number(args[5]));
    return await require('../services/marketingScheduler').disparar(...args);
  }
  catch(e) { console.warn('[Marketing] Envio não agendado:', e.message); return null; }
}

async function obterNomeEmpresa(empresaId) {
  try {
    const { Empresa } = require("../models");
    if (!Empresa) return "PetHub";
    const empresa = await Empresa.findByPk(empresaId);
    return empresa
      ? empresa.nomeFantasia || empresa.razaoSocial || "PetHub"
      : "PetHub";
  } catch (_) {
    return "PetHub";
  }
}

// Exportar a função para uso em outros controllers
exports.dispararMensagemAutomatica = dispararMensagemAutomatica;
exports.normalizarConfig = normalizarConfig;
