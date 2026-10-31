const express = require("express");
const router = express.Router();
const controller = require("../controllers/instanciaController");

router.post("/", controller.criarInstancia);
router.get("/", controller.listarInstancias);
router.post("/:id/connect", controller.conectarInstancia);
router.post("/:id/disconnect", controller.desconectarInstancia);
router.post("/:id/reset", controller.resetarInstancia);
router.delete("/:id", controller.excluirInstancia);

module.exports = router;
