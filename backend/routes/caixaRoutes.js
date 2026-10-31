const express = require("express");
const router = express.Router();
const caixaController = require("../controllers/caixaController");
const { authUser } = require("../middleware/authUser");

router.use(authUser);

router.get("/", caixaController.listarCaixas);
router.get("/aberto", caixaController.buscarCaixaAberto);
router.get("/numero/:numero", caixaController.buscarCaixaPorNumero);
router.get("/:id", caixaController.buscarCaixa);
router.post("/abrir", caixaController.abrirCaixa);
router.put("/:id/fechar", caixaController.fecharCaixa);

module.exports = router;
