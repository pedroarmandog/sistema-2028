const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");
const profissionalController = require("../controllers/profissionalController");
const { authUser } = require("../middleware/authUser");

router.use(authUser);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads/assinaturas"));
  },
  filename: (req, file, cb) => {
    cb(null, `profissional-${req.params.id}-${Date.now()}.png`);
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "image/png") cb(null, true);
    else cb(new Error("Apenas PNG é aceito"));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get("/", profissionalController.listarProfissionais);
router.get("/:id", profissionalController.buscarProfissional);
router.post("/", profissionalController.criarProfissional);
router.put("/:id", profissionalController.atualizarProfissional);
router.delete("/:id", profissionalController.deletarProfissional);
router.post(
  "/:id/assinatura",
  upload.single("assinatura"),
  profissionalController.uploadAssinatura,
);

module.exports = router;
