const express = require('express');
const router = express.Router();
const perfilProdutoController = require('../controllers/perfilProdutoController');

router.get('/', perfilProdutoController.listarPerfisProduto);
router.get('/debug', perfilProdutoController.debugPerfis);
router.get('/:id', perfilProdutoController.buscarPerfilProduto);
router.post('/', perfilProdutoController.criarPerfilProduto);
router.put('/:id', perfilProdutoController.atualizarPerfilProduto);
router.delete('/:id', perfilProdutoController.deletarPerfilProduto);

module.exports = router;
