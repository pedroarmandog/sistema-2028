const { WhatsappSession } = require("../models");
const whatsappService = require("../services/whatsappService");
const { Op, fn, col, where } = require("sequelize");

// Prefixo para isolar instâncias do disparador do sistema principal de marketing
const DISP_PREFIX = "disp_";
const LIMITE_INSTANCIAS = 10;
// A tabela também guarda a sessão principal (nome NULL/vazio) e preferências.
// Contagem, numeração e listagem devem selecionar o MESMO conjunto.
function filtroInstancias(empresaId) {
  return { empresaId: Number(empresaId), [Op.and]: [
    where(fn("LOWER", fn("TRIM", col("nome"))), { [Op.notIn]: ["", "config_disparador"] }),
  ] };
}
function registroDeInstancia(sess) {
  const nome = String(sess.nome || "").trim().toLowerCase();
  return !!nome && nome !== "config_disparador";
}
function dtoInstancia(sess) {
  const s = typeof sess.toJSON === "function" ? sess.toJSON() : sess;
  // Não devolver sessionData: pode conter material de autenticação.
  return { id:s.id, empresaId:s.empresaId, nome:s.nome, numeroOrdem:s.numeroOrdem,
    numero:s.numero, status:s.status, ultimaConexao:s.ultimaConexao,
    createdAt:s.createdAt, updatedAt:s.updatedAt };
}

/**
 * Retorna o próximo numeroOrdem disponível para uma empresa.
 * Usa MAX(numeroOrdem) + 1 para garantir sequência crescente dentro de cada empresa.
 */
async function proximoNumeroOrdem(empresaId) {
  const maxRow = await WhatsappSession.findOne({
    where: filtroInstancias(empresaId),
    attributes: [
      [require("sequelize").fn("MAX", require("sequelize").col("numeroOrdem")), "maxOrdem"],
    ],
    raw: true,
  });
  const maxOrdem = (maxRow && maxRow.maxOrdem) || 0;
  return Number(maxOrdem) + 1;
}

async function criarInstancia(req, res) {
  try {
    const empresaId = req.user?.empresaId;
    if (!empresaId) return res.status(403).json({ error: "Empresa não identificada" });

    const nome = req.body.nome && String(req.body.nome).trim();
    if (!nome)
      return res.status(400).json({ error: "Nome da instância é obrigatório" });

    if (nome.length > 200 || nome.toLowerCase() === "config_disparador")
      return res.status(400).json({ error: "Informe um nome de instância válido, com até 200 caracteres." });

    // Apenas instâncias reais do disparador participam do limite.
    const total = await WhatsappSession.count({
      where: filtroInstancias(empresaId),
    });
    if (total >= LIMITE_INSTANCIAS) {
      return res
        .status(400)
        .json({ error: "Limite de 10 instâncias do disparador atingido. Use uma instância cadastrada ou exclua uma que não utiliza.", code: "INSTANCIA_LIMIT", limite: LIMITE_INSTANCIAS, total });
    }

    // Calcular próximo número sequencial da empresa
    const numeroOrdem = await proximoNumeroOrdem(empresaId);

    // Criar registro no banco com status aguardando_qr
    const sess = await WhatsappSession.create({
      nome,
      empresaId: Number(empresaId),
      numeroOrdem,
      status: "aguardando_qr",
    });

    try {
      await whatsappService.inicializarCliente(DISP_PREFIX + sess.id);
    } catch (_) {
      await WhatsappSession.update({ status: "erro" }, { where: { id: sess.id, empresaId: Number(empresaId) } });
      return res.status(503).json({error:"Instância cadastrada, mas não foi possível iniciar o WhatsApp. Use Conectar na lista; não crie outra instância.",instancia:{...dtoInstancia(sess),status:"erro"}});
    }

    return res.json({ success: true, instancia: dtoInstancia(sess) });
  } catch (err) {
    console.error("criarInstancia error", err && err.message);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
}

async function listarInstancias(req, res) {
  try {
    const empresaId = req.user?.empresaId;
    if (!empresaId) return res.status(403).json({ error: "Empresa não identificada" });

    // Listar apenas instâncias do disparador (que possuem nome, exceto config)
    const list = await WhatsappSession.findAll({
      where: filtroInstancias(empresaId),
      order: [["numeroOrdem", "ASC"], ["id", "ASC"]],
    });

    // Retornar o status real do clientsMap (memória) para evitar informação desatualizada
    const result = list.map((s) => {
      const json = dtoInstancia(s);
      // Uma falha de status de uma sessão não pode esconder toda a lista.
      let real;
      try { real = whatsappService.obterStatus(DISP_PREFIX + s.id); } catch (_) {}
      if (typeof real?.status === "string") json.status = real.status;
      else if (json.status === "conectado") json.status = "desconectado";
      return json;
    });

    return res.json(result);
  } catch (err) {
    console.error("listarInstancias error", err && err.message);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
}

async function conectarInstancia(req, res) {
  try {
    const empresaId = req.user?.empresaId;
    if (!empresaId) return res.status(403).json({ error: "Empresa não identificada" });

    const id = String(req.params.id);
    const sess = await WhatsappSession.findByPk(id);
    if (!sess)
      return res.status(404).json({ error: "Instância não encontrada" });
    if (sess.empresaId !== Number(empresaId))
      return res.status(403).json({ error: "Instância não pertence à sua empresa" });
    if (!registroDeInstancia(sess))
      return res.status(404).json({ error: "Instância do disparador não encontrada" });

    await WhatsappSession.update(
      { status: "aguardando_qr" },
      { where: { id } },
    );
    await whatsappService.inicializarCliente(DISP_PREFIX + id);
    return res.json({ success: true });
  } catch (err) {
    console.error("conectarInstancia error", err && err.message);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
}

async function desconectarInstancia(req, res) {
  try {
    const empresaId = req.user?.empresaId;
    if (!empresaId) return res.status(403).json({ error: "Empresa não identificada" });

    const id = String(req.params.id);
    const sess = await WhatsappSession.findByPk(id);
    if (!sess)
      return res.status(404).json({ error: "Instância não encontrada" });
    if (sess.empresaId !== Number(empresaId))
      return res.status(403).json({ error: "Instância não pertence à sua empresa" });
    if (!registroDeInstancia(sess))
      return res.status(404).json({ error: "Instância do disparador não encontrada" });

    try {
      await whatsappService.desconectar(DISP_PREFIX + id);
    } catch (e) {}
    await WhatsappSession.update({ status: "desconectado" }, { where: { id } });
    return res.json({ success: true });
  } catch (err) {
    console.error("desconectarInstancia error", err && err.message);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
}

async function excluirInstancia(req, res) {
  try {
    const empresaId = req.user?.empresaId;
    if (!empresaId) return res.status(403).json({ error: "Empresa não identificada" });

    const id = String(req.params.id);
    const sess = await WhatsappSession.findByPk(id);
    if (!sess)
      return res.status(404).json({ error: "Instância não encontrada" });
    if (sess.empresaId !== Number(empresaId))
      return res.status(403).json({ error: "Instância não pertence à sua empresa" });
    if (!registroDeInstancia(sess))
      return res.status(404).json({ error: "Instância do disparador não encontrada" });

    try {
      await whatsappService.desconectar(DISP_PREFIX + id);
    } catch (e) {}
    await sess.destroy();
    return res.json({ success: true });
  } catch (err) {
    console.error("excluirInstancia error", err && err.message);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
}

async function resetarInstancia(req, res) {
  try {
    const empresaId = req.user?.empresaId;
    if (!empresaId) return res.status(403).json({ error: "Empresa não identificada" });

    const id = String(req.params.id);
    const sess = await WhatsappSession.findByPk(id);
    if (!sess)
      return res.status(404).json({ error: "Instância não encontrada" });
    if (sess.empresaId !== Number(empresaId))
      return res.status(403).json({ error: "Instância não pertence à sua empresa" });
    if (!registroDeInstancia(sess))
      return res.status(404).json({ error: "Instância do disparador não encontrada" });

    const chave = DISP_PREFIX + id;
    // Baileys mantém autenticação no repositório; não há diretório Puppeteer.
    await whatsappService.desconectar(chave);
    // Atualizar banco
    await WhatsappSession.update(
      { status: "aguardando_qr" },
      { where: { id } },
    );
    // Reconectar (gera QR novo)
    await whatsappService.inicializarCliente(chave);
    return res.json({ success: true });
  } catch (err) {
    console.error("resetarInstancia error", err && err.message);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
}

async function eventosInstancia(req,res) {
  const empresaId=Number(req.user?.empresaId),id=String(req.params.id);
  if(!empresaId)return res.status(403).json({error:"Empresa não identificada"});
  try {
    const sess=await WhatsappSession.findByPk(id);
    if(!sess||!registroDeInstancia(sess))return res.status(404).json({error:"Instância não encontrada"});
    if(Number(sess.empresaId)!==empresaId)return res.status(403).json({error:"Instância não pertence à sua empresa"});
    const chave=DISP_PREFIX+id;
    res.setHeader("Content-Type","text/event-stream");res.setHeader("Cache-Control","no-cache, no-transform");
    res.setHeader("Connection","keep-alive");res.flushHeaders();
    whatsappService.adicionarListenerSSE(chave,res);
    res.write('data: '+JSON.stringify({evento:'status_inicial',...whatsappService.obterStatus(chave)})+'\n\n');
    const timer=setInterval(()=>{try{res.write(': ping\n\n');}catch{}},25000);
    res.once('close',()=>clearInterval(timer));
  } catch (_) {
    if(!res.headersSent)return res.status(503).json({error:"Não foi possível acompanhar a conexão WhatsApp."});
    res.end();
  }
}

module.exports = {
  filtroInstancias,
  eventosInstancia,
  criarInstancia,
  listarInstancias,
  conectarInstancia,
  desconectarInstancia,
  excluirInstancia,
  resetarInstancia,
  DISP_PREFIX,
};