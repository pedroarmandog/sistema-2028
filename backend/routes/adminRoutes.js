const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");
const adminController = require("../controllers/adminController");
const empresaPainelController = require("../controllers/empresaPainelController");
const backupController = require("../controllers/backupController");
const acessosController = require("../controllers/acessosController");
const { authAdmin, validarTokenCadastro } = require("../middleware/authAdmin");

// Configurar multer para upload de logos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const fs = require("fs");
    const dir = path.join(__dirname, "../../uploads/logos-empresas");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const nome = "logo-" + Date.now() + ext;
    cb(null, nome);
  },
});
const uploadLogo = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: function (req, file, cb) {
    const allowed = /jpeg|jpg|png|gif|svg|webp/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype);
    if (extOk || mimeOk) {
      cb(null, true);
    } else {
      cb(new Error("Apenas imagens são permitidas (jpg, png, gif, svg, webp)"));
    }
  },
});

// ── Rotas públicas ──────────────────────────────
router.post("/login", adminController.login);
router.get("/verificar-token-cadastro", adminController.verificarTokenCadastro);
router.post("/cadastro", validarTokenCadastro, adminController.cadastro);

// ── Rota pública para verificação de status (usada pelo sistema do cliente) ──
router.get("/verificar-status", empresaPainelController.verificarStatus);

// ── Rotas protegidas (requerem JWT) ─────────────
router.get("/perfil", authAdmin, adminController.perfil);
router.get("/dashboard", authAdmin, empresaPainelController.dashboard);
router.get("/faturamento", authAdmin, empresaPainelController.faturamento);

// CRUD Empresas
router.get("/empresas", authAdmin, empresaPainelController.listar);
router.get("/empresas/:id", authAdmin, empresaPainelController.detalhes);
router.post("/empresas", authAdmin, empresaPainelController.criar);
router.post(
  "/empresas/completa",
  authAdmin,
  uploadLogo.single("logo"),
  empresaPainelController.criarCompleta,
);
router.put("/empresas/:id", authAdmin, empresaPainelController.atualizar);
router.delete("/empresas/:id", authAdmin, empresaPainelController.excluir);

// Ações nas empresas
router.post(
  "/empresas/:id/bloquear",
  authAdmin,
  empresaPainelController.bloquear,
);
router.post(
  "/empresas/:id/reativar",
  authAdmin,
  empresaPainelController.reativar,
);
router.post(
  "/empresas/:id/pagamento",
  authAdmin,
  empresaPainelController.registrarPagamento,
);

// Impersonação — entrar na empresa como admin
router.post(
  "/empresas/:id/impersonate",
  authAdmin,
  empresaPainelController.impersonate,
);
router.get("/impersonate/:token", empresaPainelController.impersonateRedirect);

// Backup
router.get("/backups", authAdmin, backupController.listarTodos);
router.post("/backups/executar", authAdmin, backupController.executarManual);
router.get("/backups/:empresaId", authAdmin, backupController.listarPorEmpresa);
router.post(
  "/backups/:empresaId/restaurar",
  authAdmin,
  backupController.restaurar,
);

// Acessos simultâneos
router.get("/acessos", authAdmin, acessosController.listarAcessos);
router.get("/acessos/:id", authAdmin, acessosController.detalhesAcessos);
router.put("/acessos/:id/limite", authAdmin, acessosController.atualizarLimite);
router.post(
  "/acessos/:id/encerrar-todas",
  authAdmin,
  acessosController.encerrarTodasSessoes,
);
router.post(
  "/acessos/sessao/:sessaoId/encerrar",
  authAdmin,
  acessosController.encerrarSessao,
);

module.exports = router;
