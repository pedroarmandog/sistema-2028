const express = require("express");
const router = express.Router();
const comissaoController = require("../controllers/comissaoController");
const { authUser } = require("../middleware/authUser");

router.use(authUser);

router.get("/por-perfil", comissaoController.porPerfil);
router.get("/calcular", comissaoController.calcular);
router.get("/", comissaoController.getAll);
router.get("/:id", comissaoController.getById);
router.post("/", comissaoController.create);
router.put("/:id", comissaoController.update);
router.delete("/:id", comissaoController.delete);

module.exports = router;
