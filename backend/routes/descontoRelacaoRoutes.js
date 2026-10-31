const express = require('express');
const router = express.Router();
const descontoRelacaoController = require('../controllers/descontoRelacaoController');

router.get('/', descontoRelacaoController.listarDescontoRelacoes);
router.get('/:id', descontoRelacaoController.buscarDescontoRelacao);
router.post('/', descontoRelacaoController.criarDescontoRelacao);
router.put('/:id', descontoRelacaoController.atualizarDescontoRelacao);
router.delete('/:id', descontoRelacaoController.deletarDescontoRelacao);

module.exports = router;
