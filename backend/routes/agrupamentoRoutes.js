const express = require('express');
const router = express.Router();
const agrupamentoController = require('../controllers/agrupamentoController');

router.get('/', agrupamentoController.getAll);
router.get('/:id', agrupamentoController.getById);
router.post('/', agrupamentoController.create);
router.put('/:id', agrupamentoController.update);
router.delete('/:id', agrupamentoController.delete);

module.exports = router;
