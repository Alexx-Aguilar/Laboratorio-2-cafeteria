const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');

// Rutas de Pedidos y Transacciones
router.get('/', pedidosController.getAll);
router.get('/:id', pedidosController.getById);
router.post('/', pedidosController.create);
router.patch('/:id/anular', pedidosController.anular);
router.post('/:id/anular', pedidosController.anular); // Soporta POST o PATCH para versatilidad en clientes

module.exports = router;
