const express = require('express');
const router = express.Router();
const racaController = require('../controllers/racaController');

router.get('/', racaController.getAll);
router.get('/:id', racaController.getById);
router.post('/', racaController.create);
router.put('/:id', racaController.update);
router.delete('/:id', racaController.delete);

module.exports = router;
