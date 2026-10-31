const express = require('express');
const router = express.Router();
const pelagemController = require('../controllers/pelagemController');

router.get('/', pelagemController.getAll);
router.get('/:id', pelagemController.getById);
router.post('/', pelagemController.create);
router.put('/:id', pelagemController.update);
router.delete('/:id', pelagemController.delete);

module.exports = router;
