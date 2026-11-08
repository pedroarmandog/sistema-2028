const { WhatsappSession } = require("../models");
const whatsappService = require("../services/whatsappService");
const { Op } = require("sequelize");

// Prefixo para isolar instâncias do disparador do sistema principal de marketing


/**
 * Retorna o próximo numeroOrdem disponível para uma empresa.
 * Usa MAX(numeroOrdem) + 1 para garantir sequência crescente dentro de cada empresa.
 */
async function proximoNumeroOrdem(empresaId) {
  const maxRow = await WhatsappSession.findOne({
    where: { empresaId: Number(empresaId) },
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

    // Verificar limite de 10 instâncias por empresa
    const total = await WhatsappSession.count({
      where: { empresaId: Number(empresaId) },
    });
    if (total >= 10) {
      return res
        .status(400)
        .json({ error: "Limite de 10 instâncias por empresa atingido" });
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

    // Reutilizar a conexão da empresa
    try {
      await whatsappService.inicializarCliente(empresaId);
    } catch (e) {
      console.warn("[Instancia] falha ao inicializar cliente", e && e.message);
    }

    return res.json({ success: true, instancia: sess });
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
      where: {
        empresaId: Number(empresaId),
        nome: {
          [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: "config_disparador" }],
        },
      },
      order: [["numeroOrdem", "ASC"]],
    });

    // Retornar o status real do clientsMap (memória) para evitar informação desatualizada
    const result = list.map((s) => {
      const real = whatsappService.obterStatus(empresaId);
      const json = s.toJSON();
      delete json.sessionData;
      json.status = real.status;
      json.numero = real.numero;
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

    await WhatsappSession.update(
      { status: "aguardando_qr" },
      { where: { id } },
    );
    await whatsappService.inicializarCliente(empresaId);
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

    try {
      await whatsappService.desconectar(empresaId);
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

    const chave = empresaId;
    // Destruir cliente existente
    try {
      await whatsappService.desconectar(chave);
    } catch (_) {}
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

module.exports = {
  criarInstancia,
  listarInstancias,
  conectarInstancia,
  desconectarInstancia,
  excluirInstancia,
  resetarInstancia,
};