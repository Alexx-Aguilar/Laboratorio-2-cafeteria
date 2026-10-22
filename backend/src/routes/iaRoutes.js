const express = require('express');
const router = express.Router();
const iaController = require('../controllers/iaController');

// Rutas de integración con el Agente de IA (n8n / Heurístico)
router.post('/sugerencia-compras', iaController.getSugerenciaCompras);
router.get('/datos-analisis', iaController.getDatosAnalisis);

module.exports = router;
