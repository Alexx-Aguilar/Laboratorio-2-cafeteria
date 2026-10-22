const productosService = require('../services/productosService');

async function getAll(req, res) {
  try {
    const productos = await productosService.getAllProductos();
    res.status(200).json(productos);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar productos: ' + err.message });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const producto = await productosService.getProductoById(id);
    if (!producto) {
      return res.status(404).json({ error: `Producto con ID ${id} no encontrado.` });
    }
    res.status(200).json(producto);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar producto: ' + err.message });
  }
}

async function create(req, res) {
  try {
    const { nombre, descripcion, precio, categoria, activo, icono, receta } = req.body;

    // Validación 400
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre del producto es obligatorio.' });
    }
    if (!categoria || !categoria.trim()) {
      return res.status(400).json({ error: 'La categoría del producto es obligatoria.' });
    }
    if (precio === undefined || isNaN(precio) || Number(precio) <= 0) {
      return res.status(400).json({ error: 'El precio debe ser un número mayor a 0.' });
    }

    const nuevoProducto = await productosService.createProducto({
      nombre,
      descripcion,
      precio,
      categoria,
      activo,
      icono,
      receta
    });
    res.status(201).json(nuevoProducto);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, categoria, activo, icono } = req.body;

    const existente = await productosService.getProductoById(id);
    if (!existente) {
      return res.status(404).json({ error: `Producto con ID ${id} no encontrado.` });
    }

    if (precio !== undefined && (isNaN(precio) || Number(precio) <= 0)) {
      return res.status(400).json({ error: 'El precio debe ser un valor numérico mayor a 0.' });
    }

    const actualizado = await productosService.updateProducto(id, {
      nombre,
      descripcion,
      precio,
      categoria,
      activo,
      icono
    });
    res.status(200).json(actualizado);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const existente = await productosService.getProductoById(id);
    if (!existente) {
      return res.status(404).json({ error: `Producto con ID ${id} no encontrado.` });
    }

    const result = await productosService.deleteProducto(id);
    res.status(200).json(result);
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
  remove
};
