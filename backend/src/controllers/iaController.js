const iaService = require('../services/iaService');

async function getSugerenciaCompras(req, res) {
  try {
    const respuestaIA = await iaService.generarSugerenciaCompras(req.body);
    res.status(200).json(respuestaIA);
  } catch (err) {
    res.status(500).json({
      ok: false,
      data: null,
      error: 'Error en el asistente de IA: ' + err.message
    });
  }
}

async function getDatosAnalisis(req, res) {
  try {
    const datos = await iaService.getDatosParaAgenteIA();
    res.status(200).json({ ok: true, data: datos, error: null });
  } catch (err) {
    res.status(500).json({ ok: false, data: null, error: err.message });
  }
}

module.exports = {
  getSugerenciaCompras,
  getDatosAnalisis
};
