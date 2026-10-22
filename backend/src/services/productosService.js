const db = require('../db');

/**
 * Obtiene todos los productos del menú con su cálculo de disponibilidad según insumos
 */
async function getAllProductos() {
  const productosSql = `
    SELECT 
      p.id, 
      p.nombre, 
      p.descripcion, 
      ROUND(p.precio, 2) AS precio, 
      p.categoria, 
      p.activo,
      p.icono
    FROM productos p
    ORDER BY p.categoria ASC, p.nombre ASC;
  `;
  const productosRes = await db.query(productosSql);
  const productos = productosRes.rows;

  // Obtener todas las recetas e insumos para evaluar disponibilidad en memoria de forma eficiente
  const recetasSql = `
    SELECT 
      r.producto_id, 
      r.insumo_id, 
      r.cantidad AS cantidad_requerida,
      i.nombre AS insumo_nombre,
      i.stock AS insumo_stock,
      i.unidad
    FROM recetas r
    JOIN insumos i ON i.id = r.insumo_id;
  `;
  const recetasRes = await db.query(recetasSql);
  const recetasByProduct = {};

  for (const r of recetasRes.rows) {
    if (!recetasByProduct[r.producto_id]) {
      recetasByProduct[r.producto_id] = [];
    }
    recetasByProduct[r.producto_id].push(r);
  }

  // Evaluar para cada producto si sus insumos son suficientes para preparar al menos 1 porción
  return productos.map(prod => {
    const receta = recetasByProduct[prod.id] || [];
    let disponible = prod.activo === 1 || prod.activo === true;
    let maxPreparables = Infinity;
    const faltantes = [];

    if (receta.length === 0) {
      maxPreparables = 999;
    } else {
      for (const item of receta) {
        const stockActual = parseFloat(item.insumo_stock);
        const req = parseFloat(item.cantidad_requerida);
        const posibles = Math.floor(stockActual / req);
        if (posibles < maxPreparables) {
          maxPreparables = posibles;
        }
        if (stockActual < req) {
          disponible = false;
          faltantes.push({
            insumo: item.insumo_nombre,
            requerido: req,
            disponible: stockActual,
            unidad: item.unidad
          });
        }
      }
    }

    return {
      ...prod,
      disponible: disponible && maxPreparables > 0,
      max_preparables: maxPreparables === Infinity ? 0 : maxPreparables,
      faltantes,
      receta_count: receta.length
    };
  });
}

/**
 * Obtiene el detalle de un producto con toda su receta asociada
 */
async function getProductoById(id) {
  const prodSql = `
    SELECT id, nombre, descripcion, ROUND(precio, 2) AS precio, categoria, activo, icono
    FROM productos
    WHERE id = $1;
  `;
  const prodRes = await db.query(prodSql, [id]);
  if (prodRes.rows.length === 0) return null;

  const producto = prodRes.rows[0];

  const recetaSql = `
    SELECT 
      r.id AS receta_id,
      r.insumo_id,
      i.nombre AS insumo_nombre,
      i.unidad,
      ROUND(r.cantidad, 2) AS cantidad_requerida,
      ROUND(i.stock, 2) AS stock_actual,
      ROUND(i.stock_minimo, 2) AS stock_minimo
    FROM recetas r
    JOIN insumos i ON i.id = r.insumo_id
    WHERE r.producto_id = $1
    ORDER BY i.nombre ASC;
  `;
  const recetaRes = await db.query(recetaSql, [id]);
  producto.receta = recetaRes.rows;

  return producto;
}

/**
 * Crea un producto con opción de asociar su receta
 */
async function createProducto(data) {
  const { nombre, descripcion = '', precio, categoria, activo = true, icono = '☕', receta = [] } = data;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const insertProdSql = `
      INSERT INTO productos (nombre, descripcion, precio, categoria, activo, icono)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, nombre, descripcion, precio, categoria, activo, icono;
    `;
    const prodRes = await client.query(insertProdSql, [
      nombre.trim(),
      descripcion ? descripcion.trim() : '',
      parseFloat(precio),
      categoria.trim(),
      activo ? 1 : 0,
      icono || '☕'
    ]);

    let newId = null;
    if (prodRes.rows && prodRes.rows.length > 0) {
      newId = prodRes.rows[0].id;
    } else if (prodRes.lastInsertRowid) {
      newId = prodRes.lastInsertRowid;
    }

    // Insertar ingredientes de receta si vienen provistos
    if (receta && Array.isArray(receta) && receta.length > 0) {
      for (const item of receta) {
        await client.query(
          `INSERT INTO recetas (producto_id, insumo_id, cantidad) VALUES ($1, $2, $3);`,
          [newId, item.insumo_id, parseFloat(item.cantidad)]
        );
      }
    }

    await client.query('COMMIT');
    return getProductoById(newId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Actualiza información de un producto
 */
async function updateProducto(id, data) {
  const { nombre, descripcion, precio, categoria, activo, icono } = data;

  const sql = `
    UPDATE productos
    SET
      nombre = COALESCE($1, nombre),
      descripcion = COALESCE($2, descripcion),
      precio = COALESCE($3, precio),
      categoria = COALESCE($4, categoria),
      activo = COALESCE($5, activo),
      icono = COALESCE($6, icono)
    WHERE id = $7
    RETURNING id, nombre, descripcion, precio, categoria, activo, icono;
  `;

  const res = await db.query(sql, [
    nombre ? nombre.trim() : null,
    descripcion !== undefined ? descripcion.trim() : null,
    precio !== undefined ? parseFloat(precio) : null,
    categoria ? categoria.trim() : null,
    activo !== undefined ? (activo ? 1 : 0) : null,
    icono || null,
    id
  ]);

  return getProductoById(id);
}

/**
 * Desactiva o elimina un producto
 */
async function deleteProducto(id) {
  // Verificar si tiene pedidos asociados
  const checkSql = `SELECT COUNT(*) AS count FROM pedido_items WHERE producto_id = $1;`;
  const checkRes = await db.query(checkSql, [id]);
  const hasOrders = parseInt(checkRes.rows[0].count, 10) > 0;

  if (hasOrders) {
    // Si tiene pedidos históricos, hacemos soft-delete desactivándolo para preservar integridad referencial
    await db.query(`UPDATE productos SET activo = 0 WHERE id = $1;`, [id]);
    return { id, action: 'desactivado', message: 'El producto tiene órdenes históricas y fue desactivado del catálogo.' };
  } else {
    // Si no tiene órdenes, se puede eliminar físicamente
    await db.query(`DELETE FROM productos WHERE id = $1;`, [id]);
    return { id, action: 'eliminado', message: 'El producto fue eliminado permanentemente.' };
  }
}

module.exports = {
  getAllProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto
};
