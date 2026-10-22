const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productosController');

// Rutas CRUD de Productos
router.get('/', productosController.getAll);
router.get('/:id', productosController.getById);
router.post('/', productosController.create);
router.put('/:id', productosController.update);
router.delete('/:id', productosController.remove);

module.exports = router;
