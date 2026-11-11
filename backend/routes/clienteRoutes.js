const express = require("express");
const router = express.Router();
const clienteController = require("../controllers/clienteController");
const multer = require("multer");
const { authUser } = require("../middleware/authUser");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

router.use(authUser);
router.use((req,res,next) => {
  if (!Number.isSafeInteger(Number(req.user?.empresaId)) || Number(req.user.empresaId) <= 0)
    return res.status(403).json({success:false,error:"Empresa não identificada."});
  next();
});

// Rotas para clientes (protegidas por empresa)
router.post(
  "/",
  authUser,
  upload.single("imagem_perfil"),
  clienteController.createCliente,
);
router.get("/", authUser, clienteController.getAllClientes);
router.get("/:id", authUser, clienteController.getClienteById);
router.put(
  "/:id",
  authUser,
  upload.single("imagem_perfil"),
  clienteController.updateCliente,
);
router.delete("/:id", authUser, clienteController.deleteCliente);

module.exports = router;
