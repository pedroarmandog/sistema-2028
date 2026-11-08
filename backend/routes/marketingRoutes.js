/**
 * Marketing Routes
 * ----------------
 * Rotas do módulo de Marketing/WhatsApp.
 */

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const marketingController = require("../controllers/marketingController");

// Configurar multer para upload de imagens de marketing
const uploadDir = path.join(__dirname, "../../uploads/marketing");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `msg_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const tiposPermitidos = /jpeg|jpg|png|gif|webp/;
    const extOk = tiposPermitidos.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimeOk = tiposPermitidos.test(file.mimetype);
    if (extOk && mimeOk) return cb(null, true);
    cb(new Error("Apenas imagens são permitidas (jpeg, jpg, png, gif, webp)"));
  },
});

// ── WhatsApp ──────────────────────────────────────
router.get("/whatsapp/status", marketingController.statusWhatsapp);
router.get("/whatsapp/qr-status", marketingController.obterQRStatus); // polling QR
router.post("/whatsapp/conectar", marketingController.conectarWhatsapp);
router.post("/whatsapp/desconectar", marketingController.desconectarWhatsapp);
router.post("/whatsapp/resetar", marketingController.resetarWhatsapp);
router.get("/whatsapp/eventos", marketingController.eventoSSE); // SSE

router.post("/whatsapp/enviar", async (req, res) => {
  const id = req.user?.empresaId;
  if (!id) return res.sendStatus(403);
  const { telefone, texto } = req.body || {};
  if (typeof telefone !== "string" || typeof texto !== "string" || !texto.trim() || texto.length > 4096) {
    return res.status(400).json({ erro: "Informe um telefone e uma mensagem de até 4096 caracteres." });
  }
  const resultado = await require("../services/whatsappService").enviarMensagem(id, telefone, texto);
  return res.status(resultado.sucesso ? 200 : (resultado.temporario ? 409 : 400)).json(resultado);
});

// ── Mensagens Automáticas ─────────────────────────
router.get("/mensagens", marketingController.listarMensagens);
router.get("/mensagens/:id", marketingController.obterMensagem);
router.put(
  "/mensagens/:id",
  upload.single("imagem"),
  marketingController.atualizarMensagem,
);
router.post("/mensagens/:id/ativar", marketingController.ativarMensagem);
router.post("/mensagens/:id/desativar", marketingController.desativarMensagem);
router.post(
  "/mensagens/:id/upload-imagem",
  upload.single("imagem"),
  marketingController.uploadImagem,
);

// ── Envios e Logs ─────────────────────────────────
router.get("/envios", marketingController.listarEnvios);
router.get("/logs", marketingController.listarLogs);
router.get("/estatisticas", marketingController.estatisticas);

// ── Fila Pendente (controle manual) ───────────────
router.get("/fila-pendente", async (req, res) => {
  try {
    const empresaId = req.user?.empresaId;
    if (!empresaId) return res.status(403).json({ erro: "Empresa não identificada" });
    const { EnvioAgendado } = require("../models");
    const { Op } = require("sequelize");
    const pendentes = await EnvioAgendado.findAll({
      where: {
        empresaId: Number(empresaId),
        [Op.and]: require("sequelize").literal("JSON_EXTRACT(contexto, '$.campanhaId') IS NULL"),
        status: "pendente",
        dataAgendada: { [Op.lte]: new Date() },
      },
      order: [["dataAgendada", "ASC"]],
      limit: 100,
    });
    res.json({
      total: pendentes.length,
      envios: pendentes.map((e) => ({
        id: e.id,
        telefone: e.telefoneDestino,
        conteudo: e.conteudoFinal
          ? e.conteudoFinal.substring(0, 80) +
            (e.conteudoFinal.length > 80 ? "..." : "")
          : "",
        dataAgendada: e.dataAgendada,
        tentativas: e.tentativas,
        empresaId: e.empresaId,
      })),
    });
  } catch (err) {
    console.error("[Marketing] Erro ao listar fila pendente:", err.message);
    res.status(500).json({ error: "Erro ao listar fila pendente" });
  }
});

// Enviar um único envio pendente
router.post("/fila-pendente/enviar-um", async (req, res) => {
  try {
    const empresaId = req.user?.empresaId;
    if (!empresaId) return res.status(403).json({ erro: "Empresa não identificada" });
    const { EnvioAgendado, LogEnvio } = require("../models");
    const { Op } = require("sequelize");
    const envio = await EnvioAgendado.findOne({
      where: {
        empresaId: Number(empresaId),
        [Op.and]: require("sequelize").literal("JSON_EXTRACT(contexto, '$.campanhaId') IS NULL"),
        status: "pendente",
        dataAgendada: { [Op.lte]: new Date() },
      },
      order: [["dataAgendada", "ASC"]],
    });
    if (!envio) {
      return res.json({ message: "Nenhum envio pendente", enviado: false });
    }
    const whatsappService = require("../services/whatsappService");
    const { processarEnvio } = require("../services/whatsappQueue");
    const resultado = await processarEnvio(envio, LogEnvio);
    return res.status(resultado.sucesso ? 200 : 409).json({
      enviado: resultado.sucesso, envioId: envio.id, error: resultado.erro,
      message: resultado.sucesso ? "Enviado com sucesso" : resultado.erro
    });
  } catch (err) {
    console.error("[Marketing] Erro ao enviar um:", err.message);
    res.status(500).json({ error: "Erro ao processar envio" });
  }
});

// Enviar todos os pendentes
router.post("/fila-pendente/enviar-todos", async (req, res) => {
  try {
    const empresaId = req.user?.empresaId;
    if (!empresaId) return res.status(403).json({ erro: "Empresa não identificada" });
    const { processarFila } = require("../services/whatsappQueue");
    // processarFila já filtra por empresaId atualmente (ver whatsappQueue)
    if (!require("../services/whatsappService").isConectado(empresaId)) return res.status(409).json({ error: "WhatsApp não conectado" });
    await processarFila(empresaId);
    res.json({ message: "Fila processada" });
  } catch (err) {
    console.error("[Marketing] Erro ao enviar todos:", err.message);
    res.status(500).json({ error: "Erro ao processar fila" });
  }
});

// Cancelar todos os pendentes
router.post("/fila-pendente/cancelar-todos", async (req, res) => {
  try {
    const empresaId = req.user?.empresaId;
    if (!empresaId) return res.status(403).json({ erro: "Empresa não identificada" });
    const { EnvioAgendado } = require("../models");
    const { Op } = require("sequelize");
    const [count] = await EnvioAgendado.update(
      { status: "cancelado" },
      {
        where: {
          empresaId: Number(empresaId),
          status: "pendente",
          dataAgendada: { [Op.lte]: new Date() },
        },
      },
    );
    console.log(`[Marketing] ${count} envio(s) cancelado(s) pelo usuário`);
    res.json({ message: `${count} envio(s) cancelado(s)`, cancelados: count });
  } catch (err) {
    console.error("[Marketing] Erro ao cancelar fila:", err.message);
    res.status(500).json({ error: "Erro ao cancelar fila" });
  }
});

module.exports = router;
