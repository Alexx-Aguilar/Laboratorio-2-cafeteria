const resumenService = require('../services/resumenService');

async function getResumen(req, res) {
  try {
    const metricas = await resumenService.getResumenMetricas();
    res.status(200).json(metricas);
  } catch (err) {
    res.status(500).json({ error: 'Error al calcular resumen de métricas: ' + err.message });
  }
}

module.exports = {
  getResumen
};
