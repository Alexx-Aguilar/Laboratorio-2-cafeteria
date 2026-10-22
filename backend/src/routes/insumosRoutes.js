const express = require('express');
const router = express.Router();
const insumosController = require('../controllers/insumosController');

// Rutas CRUD de Insumos
router.get('/', insumosController.getAll);
router.get('/:id', insumosController.getById);
router.post('/', insumosController.create);
router.put('/:id', insumosController.update);
router.patch('/:id/stock', insumosController.adjustStock);
router.delete('/:id', insumosController.remove);

module.exports = router;
