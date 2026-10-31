// Rotas: Posição de Caixa
const express = require("express");
const router = express.Router();
const posicaoCaixaController = require("../controllers/posicaoCaixaController");
const { authUser } = require("../middleware/authUser");

// Aplicar auth em todas as rotas
router.use(authUser);

// POST   / — registrar pagamento
router.post("/", posicaoCaixaController.registrarPagamento);

// GET    /hoje — movimentações do dia
router.get("/hoje", posicaoCaixaController.listarHoje);

// GET    /resumo — totais por forma de pagamento
router.get("/resumo", posicaoCaixaController.resumoCaixa);

module.exports = router;
