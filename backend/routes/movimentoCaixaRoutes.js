const express = require('express');
const router = express.Router();
const movimentoCaixaController = require('../controllers/movimentoCaixaController');

router.get('/', movimentoCaixaController.listarMovimentos);
router.get('/:id', movimentoCaixaController.buscarMovimento);
router.post('/', movimentoCaixaController.criarMovimento);
router.put('/:id', movimentoCaixaController.atualizarMovimento);
router.delete('/:id', movimentoCaixaController.deletarMovimento);

module.exports = router;
