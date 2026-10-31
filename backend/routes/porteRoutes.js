const express = require('express');
const router = express.Router();
const porteController = require('../controllers/porteController');

router.get('/', porteController.getAll);
router.get('/:id', porteController.getById);
router.post('/', porteController.create);
router.put('/:id', porteController.update);
router.delete('/:id', porteController.delete);

module.exports = router;
