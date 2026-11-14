const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");
const profissionalController = require("../controllers/profissionalController");
const { authUser } = require("../middleware/authUser");

router.use(authUser);

const upload = require("../services/midias/upload").upload("assinaturas");

router.get("/", profissionalController.listarProfissionais);
router.get("/:id", profissionalController.buscarProfissional);
router.post("/", profissionalController.criarProfissional);
router.put("/:id", profissionalController.atualizarProfissional);
router.delete("/:id", profissionalController.deletarProfissional);
router.post(
  "/:id/assinatura",
  require("../services/midias/upload").exigirRegistro("Profissional","empresa_id"),
  upload.single("assinatura"),
  profissionalController.uploadAssinatura,
);

module.exports = router;
