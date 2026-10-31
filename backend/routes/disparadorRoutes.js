const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const uploadDir = path.join(__dirname, "../../uploads/disparador");
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || "";
    cb(null, Date.now() + "-" + Math.round(Math.random() * 1e6) + ext);
  },
});
const upload = multer({ storage: storage });

const controller = require("../controllers/disparadorController");

router.post(
  "/campanhas",
  upload.fields([{ name: "arquivo" }, { name: "imagem" }]),
  controller.criarCampanha,
);
router.post("/start/:id", controller.iniciarCampanha);
router.post("/pause/:id", controller.pausarCampanha);
router.post("/continue/:id", controller.continuarCampanha);
router.get("/eventos/:id", controller.eventoSSE);
router.get("/logs/:id", controller.obterLogs);
router.get("/contacts/:id", controller.obterContatos);
router.get("/config", controller.carregarConfig);
router.post("/config", controller.salvarConfig);

module.exports = router;
