const express = require('express');
const router = express.Router();
const grupoClienteController = require('../controllers/grupoClienteController');

router.get('/', grupoClienteController.getAll);
router.get('/:id', grupoClienteController.getById);
router.post('/', grupoClienteController.create);
router.put('/:id', grupoClienteController.update);
router.delete('/:id', grupoClienteController.delete);

module.exports = router;
