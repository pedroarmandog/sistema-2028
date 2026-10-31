const express = require('express');
const router = express.Router();
const perfilClienteController = require('../controllers/perfilClienteController');

router.get('/', perfilClienteController.listarPerfisCliente);
router.get('/debug', perfilClienteController.debugPerfisCliente);
router.get('/:id', perfilClienteController.buscarPerfilCliente);
router.post('/', perfilClienteController.criarPerfilCliente);
router.put('/:id', perfilClienteController.atualizarPerfilCliente);
router.delete('/:id', perfilClienteController.deletarPerfilCliente);

module.exports = router;
