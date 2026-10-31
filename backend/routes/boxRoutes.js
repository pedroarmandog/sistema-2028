const express = require('express');
const router = express.Router();
const boxController = require('../controllers/boxController');

router.get('/', boxController.getAll);
router.get('/:id', boxController.getById);
router.post('/', boxController.create);
router.put('/:id', boxController.update);
router.delete('/:id', boxController.delete);

module.exports = router;
