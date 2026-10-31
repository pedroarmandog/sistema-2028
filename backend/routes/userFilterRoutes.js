const express = require('express');
const router = express.Router();
const userFilterController = require('../controllers/userFilterController');

// GET /api/user-filters?pagina=meus-itens&usuarioId=1
router.get('/', userFilterController.getFilters);

// POST /api/user-filters  { usuarioId, pagina, filtros }
router.post('/', userFilterController.saveFilters);

module.exports = router;
