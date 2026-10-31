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

/**
 * Cria um objeto Date representando hora:min no fuso horário America/Sao_Paulo (BRT).
 * Isso resolve o problema de servidores rodando em UTC que causam disparos
 * em horário diferente do configurado pelo usuário.
 *
 * @param {number} hora - Hora (0-23) no horário de Brasília
 * @param {number} min - Minuto (0-59)
 * @param {Date|null} dataRef - Data base opcional (padrão: hoje)
 * @returns {Date}
 */
function criarDataHoraLocal(hora, min, dataRef) {
  const ref = dataRef ? new Date(dataRef) : new Date();
  const ano = ref.getFullYear();
  const mes = ref.getMonth();
  const dia = ref.getDate();

  // Construir string ISO com offset -03:00 (America/Sao_Paulo)
  // O construtor Date() interpreta corretamente o timezone mesmo em servidores UTC
  const isoStr =
    `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}T` +
    `${String(hora).padStart(2, "0")}:${String(min).padStart(2, "0")}:00.000-03:00`;
  
  const data = new Date(isoStr);
  return data;
}

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
  const statusAtual = whatsappService.obterStatus(empresaId);

  // Se o cliente em memória está conectado, confiar nele (fonte da verdade)
  if (statusAtual && statusAtual.status === "conectado") {
    return res.json(statusAtual);
  }
  if (
    statusAtual &&
    (statusAtual.status === "aguardando_qr" ||
      statusAtual.status === "inicializando" ||
      statusAtual.status === "autenticado")
  ) {
    return res.json(statusAtual);
  }

  // Cliente não existe em memória — verificar o banco
  try {
    const { WhatsappSession } = require("../models");
    const session = await WhatsappSession.findOne({
      where: { empresaId: Number(empresaId) },
    });

    if (session) {
      return res.json({
        status: "desconectado",
        numero: session.numero,
        ultimaConexao: session.ultimaConexao,
      });
    }
  } catch (_) {}

  return res.json(
    statusAtual || { status: "desconectado", numero: null, qrBase64: null },
  );
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
exports.eventoSSE = (req, res) => {
  // Aceitar empresaId do query param quando for instância do disparador (prefixo disp_)
  // ou do JWT para marketing normal.
  const empresaId = req.query.empresaId && String(req.query.empresaId).startsWith("disp_")
    ? req.query.empresaId
    : req.user?.empresaId;
  if (!empresaId) return res.status(403).json({ erro: "Empresa não identificada" });

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
      const seeds = await MensagemAutomatica.bulkCreate(
        MENSAGENS_PADRAO.map((m) => ({ ...m, empresaId: Number(empresaId) })),
        { returning: true },
      );
      mensagens = seeds;
    }

    // Sincronizar títulos com MENSAGENS_PADRAO (corrige títulos antigos/errados)
    const tituloMap = new Map(MENSAGENS_PADRAO.map((m) => [m.tipo, m.titulo]));
    for (const m of mensagens) {
      const tituloCorreto = tituloMap.get(m.tipo);
      if (tituloCorreto && m.titulo !== tituloCorreto) {
        await m.update({ titulo: tituloCorreto });
        m.titulo = tituloCorreto;
      }
    }

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

    await mensagem.update({
      ativo: true,
      configuracaoEnvio: configuracaoEnvio || mensagem.configuracaoEnvio,
    });

    // Registrar log
    await LogEnvio.create({
      empresaId: mensagem.empresaId,
      evento: "mensagem_ativada",
      detalhes: { mensagemId: mensagem.id, tipo: mensagem.tipo },
      mensagem: `Mensagem "${mensagem.titulo}" ativada`,
    }).catch(() => {});

    return res.json({ sucesso: true, mensagem });
  } catch (err) {
    return res.status(500).json({ erro: err.message });
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
function normalizarConfig(config) {
  if (!config) return { hora: "09:00", dias: [0] };
  const parsed = typeof config === "string" ? JSON.parse(config) : config;

  // Novo formato: { hora, dias: [...] }
  if (parsed.dias && Array.isArray(parsed.dias)) {
    return { hora: parsed.hora || "09:00", dias: parsed.dias };
  }
  // Legado: { tipo: 'no_dia', hora }
  if (parsed.tipo === "no_dia") {
    return { hora: parsed.hora || "09:00", dias: [0] };
  }
  // Legado: { tipo: 'dias_antes', valor, hora }
  if (parsed.tipo === "dias_antes") {
    return { hora: parsed.hora || "09:00", dias: [Number(parsed.valor) || 1] };
  }
  return { hora: parsed.hora || "09:00", dias: [0] };
}

/**
 * Dispara mensagem automática baseada em tipo de evento.
 * Chamado pelo clienteController, agendamentoController, etc.
 *
 * @param {string} tipo - Tipo da mensagem (ex: 'boas_vindas', 'lembrete_agendamento')
 * @param {object} variaveis - { nomeTutor, nomePet, dataAgendamento, horaAgendamento, servico }
 * @param {string} telefone - Número destino
 * @param {Date} dataAgendada - Quando enviar (null = imediato)
 * @param {object} contexto - { clienteId, petId, agendamentoId, diasAntes? }
 * @param {number} empresaId
 */
async function dispararMensagemAutomatica(
  tipo,
  variaveis,
  telefone,
  dataAgendada,
  contexto,
  empresaId = 1,
) {
  try {
    const { MensagemAutomatica } = require("../models");
    const { agendarEnvio } = require("../services/whatsappQueue");

    const empId = Number(empresaId) || 1;

    // Garantir que a empresa tenha registros de mensagens automáticas (seed lazy)
    const totalMsgs = await MensagemAutomatica.count({
      where: { empresaId: empId },
    });
    if (totalMsgs === 0) {
      await MensagemAutomatica.bulkCreate(
        MENSAGENS_PADRAO.map((m) => ({ ...m, empresaId: empId })),
      );
      console.log(
        `[Marketing] Seed de mensagens automáticas criado para empresa ${empId}`,
      );
    }

    // Buscar mensagem ativa do tipo
    const mensagem = await MensagemAutomatica.findOne({
      where: { tipo, ativo: true, empresaId: empId },
    });

    if (!mensagem) {
      console.log(
        `[Marketing] Mensagem do tipo "${tipo}" não está ativa ou não existe. Nenhum envio gerado.`,
      );
      return null;
    }

    if (!telefone) {
      console.warn(
        `[Marketing] Número de telefone não informado para envio do tipo "${tipo}"`,
      );
      return null;
    }

    // ── Verificação de duplicidade ──────────────────────────────────────
    // Evita que a mesma mensagem seja enviada mais de uma vez para o mesmo
    // agendamento (ex: quando há múltiplos triggers ou chamadas concorrentes).
    if (contexto?.agendamentoId) {
      const { EnvioAgendado } = require("../models");
      const { Op } = require("sequelize");
      const sequelize = MensagemAutomatica.sequelize;
      const jaExiste = await EnvioAgendado.findOne({
        where: {
          mensagemAutomaticaId: mensagem.id,
          telefoneDestino: String(telefone).replace(/\D/g, ""),
          status: { [Op.in]: ["pendente", "enviado", "enviando"] },
          [Op.and]: sequelize.literal(
            `JSON_EXTRACT(contexto, '$.agendamentoId') = ${Number(contexto.agendamentoId)}`,
          ),
        },
      });
      if (jaExiste) {
        console.log(
          `[Marketing] Envio duplicado ignorado: já existe envio #${jaExiste.id} para agendamento #${contexto.agendamentoId}`,
        );
        return null;
      }
    }
    // ── Fim da verificação de duplicidade ───────────────────────────────

    // Substituir variáveis no template
    const nomeEmpresa = await obterNomeEmpresa(empresaId);
    const conteudoFinal = whatsappService.substituirVariaveis(
      mensagem.conteudo,
      {
        ...variaveis,
        nomeEmpresa,
      },
    );

    const imagemPathFull = mensagem.imagemPath
      ? path.join(__dirname, "../..", mensagem.imagemPath)
      : null;

    const config = normalizarConfig(mensagem.configuracaoEnvio);

    // Se contexto já tem diasAntes (chamada do cron), agendar UMA vez para hoje na hora configurada
    if (contexto && contexto.diasAntes !== undefined) {
      const agora = new Date();
      const [hora, min] = (config.hora || "09:00").split(":").map(Number);
      const dataEnvio = criarDataHoraLocal(hora, min);
      // Se o horário já passou hoje, enviar imediatamente
      const dataFinal = dataEnvio <= agora ? agora : dataEnvio;

      const envio = await agendarEnvio({
        empresaId,
        mensagemAutomaticaId: mensagem.id,
        telefone,
        conteudoFinal,
        imagemPath: imagemPathFull,
        dataAgendada: dataFinal,
        contexto,
      });
      return envio;
    }

    // Sem dataReferencia (ex: boas_vindas) → enviar imediatamente
    if (!dataAgendada) {
      const envio = await agendarEnvio({
        empresaId,
        mensagemAutomaticaId: mensagem.id,
        telefone,
        conteudoFinal,
        imagemPath: imagemPathFull,
        dataAgendada: new Date(),
        contexto: { ...contexto, diasAntes: 0 },
      });
      return envio;
    }

    // Com dataReferencia (ex: lembrete_agendamento) → criar envio para CADA dia configurado
    const agora = new Date();
    const envios = [];

    for (const dia of config.dias) {
      const ref = new Date(dataAgendada);
      ref.setDate(ref.getDate() - dia);
      const [hora, min] = (config.hora || "09:00").split(":").map(Number);
      const dataHoraLocal = criarDataHoraLocal(hora, min, ref);
      const dataEnvio = dataHoraLocal <= agora ? agora : dataHoraLocal;

      const envio = await agendarEnvio({
        empresaId,
        mensagemAutomaticaId: mensagem.id,
        telefone,
        conteudoFinal,
        imagemPath: imagemPathFull,
        dataAgendada: dataEnvio,
        contexto: { ...contexto, diasAntes: dia },
      });
      if (envio) envios.push(envio);
    }

    return envios.length > 0 ? envios : null;
  } catch (err) {
    console.error(
      `[Marketing] Erro ao disparar mensagem "${tipo}":`,
      err.message,
    );
    return null;
  }
}

/**
 * Calcula a data de envio baseada na configuração da mensagem e data de referência.
 */
function calcularDataEnvio(config, dataReferencia) {
  const agora = new Date();

  if (!config || !dataReferencia) return agora;

  const ref = new Date(dataReferencia);

  if (config.tipo === "no_dia") {
    const [hora, min] = (config.hora || "09:00").split(":").map(Number);
    const dataHoraLocal = criarDataHoraLocal(hora, min, ref);
    // Se o horário calculado já passou, disparar imediatamente
    return dataHoraLocal <= agora ? agora : dataHoraLocal;
  }

  if (config.tipo === "dias_antes") {
    const dias = Number(config.valor || 1);
    const refDias = new Date(dataReferencia);
    refDias.setDate(refDias.getDate() - dias);
    const [hora, min] = (config.hora || "09:00").split(":").map(Number);
    const dataHoraLocal = criarDataHoraLocal(hora, min, refDias);
    // Se a data calculada já passou, disparar imediatamente
    return dataHoraLocal <= agora ? agora : dataHoraLocal;
  }

  if (config.tipo === "horas_antes") {
    const horas = Number(config.valor || 1);
    ref.setHours(ref.getHours() - horas);
    return ref <= agora ? agora : ref;
  }

  return agora;
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
