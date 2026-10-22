const express = require('express');
const router = express.Router();
const resumenController = require('../controllers/resumenController');

// Endpoint de métricas y cierre de caja: GET /api/resumen
router.get('/', resumenController.getResumen);

module.exports = router;
