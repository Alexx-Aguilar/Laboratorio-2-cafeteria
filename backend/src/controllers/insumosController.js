const insumosService = require('../services/insumosService');

async function getAll(req, res) {
  try {
    const insumos = await insumosService.getAllInsumos();
    res.status(200).json(insumos);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener los insumos: ' + err.message });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const insumo = await insumosService.getInsumoById(id);
    if (!insumo) {
      return res.status(404).json({ error: `Insumo con ID ${id} no encontrado.` });
    }
    res.status(200).json(insumo);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar insumo: ' + err.message });
  }
}

async function create(req, res) {
  try {
    const { nombre, unidad, stock, stock_minimo } = req.body;

    // Validación 400
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre del insumo es obligatorio.' });
    }
    if (!unidad || !unidad.trim()) {
      return res.status(400).json({ error: 'La unidad de medida es obligatoria (ej: g, ml, unidades).' });
    }
    if (stock !== undefined && (isNaN(stock) || Number(stock) < 0)) {
      return res.status(400).json({ error: 'El stock no puede ser negativo.' });
    }
    if (stock_minimo !== undefined && (isNaN(stock_minimo) || Number(stock_minimo) < 0)) {
      return res.status(400).json({ error: 'El stock mínimo no puede ser negativo.' });
    }

    const nuevoInsumo = await insumosService.createInsumo({ nombre, unidad, stock, stock_minimo });
    res.status(201).json(nuevoInsumo);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const { nombre, unidad, stock, stock_minimo } = req.body;

    const existente = await insumosService.getInsumoById(id);
    if (!existente) {
      return res.status(404).json({ error: `Insumo con ID ${id} no encontrado.` });
    }

    if (stock !== undefined && (isNaN(stock) || Number(stock) < 0)) {
      return res.status(400).json({ error: 'El stock no puede ser un número negativo.' });
    }
    if (stock_minimo !== undefined && (isNaN(stock_minimo) || Number(stock_minimo) < 0)) {
      return res.status(400).json({ error: 'El stock mínimo no puede ser un número negativo.' });
    }

    const actualizado = await insumosService.updateInsumo(id, { nombre, unidad, stock, stock_minimo });
    res.status(200).json(actualizado);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
}

async function adjustStock(req, res) {
  try {
    const { id } = req.params;
    const { ajuste } = req.body;

    if (ajuste === undefined || isNaN(ajuste)) {
      return res.status(400).json({ error: 'Debe especificar un valor numérico para el ajuste de stock.' });
    }

    const actualizado = await insumosService.adjustStock(id, ajuste);
    if (!actualizado) {
      return res.status(404).json({ error: `Insumo con ID ${id} no encontrado.` });
    }

    res.status(200).json(actualizado);
  } catch (err) {
    const status = err.message.includes('negativo') ? 400 : (err.status || 500);
    res.status(status).json({ error: err.message });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const existente = await insumosService.getInsumoById(id);
    if (!existente) {
      return res.status(404).json({ error: `Insumo con ID ${id} no encontrado.` });
    }

    await insumosService.deleteInsumo(id);
    res.status(200).json({ message: `Insumo "${existente.nombre}" eliminado correctamente.` });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  adjustStock,
  remove
};
