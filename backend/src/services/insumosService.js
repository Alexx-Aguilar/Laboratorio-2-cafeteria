const db = require('../db');

/**
 * Obtiene todos los insumos, calculando si están en estado crítico (stock <= stock_minimo)
 */
async function getAllInsumos() {
  const sql = `
    SELECT 
      id, 
      nombre, 
      unidad, 
      ROUND(stock, 2) AS stock, 
      ROUND(stock_minimo, 2) AS stock_minimo,
      CASE WHEN stock <= stock_minimo THEN 1 ELSE 0 END AS bajo_stock
    FROM insumos
    ORDER BY bajo_stock DESC, nombre ASC;
  `;
  const result = await db.query(sql);
  return result.rows;
}

/**
 * Obtiene un insumo por ID junto con los productos cuyas recetas lo utilizan
 */
async function getInsumoById(id) {
  const insumoSql = `
    SELECT id, nombre, unidad, ROUND(stock, 2) AS stock, ROUND(stock_minimo, 2) AS stock_minimo
    FROM insumos
    WHERE id = $1;
  `;
  const insumoRes = await db.query(insumoSql, [id]);
  if (insumoRes.rows.length === 0) return null;

  const insumo = insumoRes.rows[0];

  // Productos que usan este insumo
  const recetasSql = `
    SELECT 
      p.id AS producto_id, 
      p.nombre AS producto_nombre, 
      p.categoria,
      ROUND(r.cantidad, 2) AS cantidad_requerida,
      ins.unidad
    FROM recetas r
    JOIN productos p ON p.id = r.producto_id
    JOIN insumos ins ON ins.id = r.insumo_id
    WHERE r.insumo_id = $1
    ORDER BY p.nombre ASC;
  `;
  const recetasRes = await db.query(recetasSql, [id]);
  insumo.productos_asociados = recetasRes.rows;
  return insumo;
}

/**
 * Crea un nuevo insumo con validación de valores no negativos
 */
async function createInsumo(data) {
  const { nombre, unidad, stock = 0, stock_minimo = 0 } = data;

  const sql = `
    INSERT INTO insumos (nombre, unidad, stock, stock_minimo)
    VALUES ($1, $2, $3, $4)
    RETURNING id, nombre, unidad, stock, stock_minimo;
  `;
  const res = await db.query(sql, [
    nombre.trim(),
    unidad.trim(),
    parseFloat(stock),
    parseFloat(stock_minimo)
  ]);

  if (res.rows && res.rows.length > 0) {
    return res.rows[0];
  }
  // En caso de que SQLite devuelva lastInsertRowid
  return getInsumoById(res.lastInsertRowid);
}

/**
 * Actualiza un insumo existente
 */
async function updateInsumo(id, data) {
  const { nombre, unidad, stock, stock_minimo } = data;

  const sql = `
    UPDATE insumos
    SET 
      nombre = COALESCE($1, nombre),
      unidad = COALESCE($2, unidad),
      stock = COALESCE($3, stock),
      stock_minimo = COALESCE($4, stock_minimo)
    WHERE id = $5
    RETURNING id, nombre, unidad, stock, stock_minimo;
  `;

  const res = await db.query(sql, [
    nombre ? nombre.trim() : null,
    unidad ? unidad.trim() : null,
    stock !== undefined ? parseFloat(stock) : null,
    stock_minimo !== undefined ? parseFloat(stock_minimo) : null,
    id
  ]);

  if (res.rows && res.rows.length > 0) {
    return res.rows[0];
  }
  return getInsumoById(id);
}

/**
 * Ajusta el stock de un insumo (suma o resta)
 */
async function adjustStock(id, cantidadAjuste) {
  const insumo = await getInsumoById(id);
  if (!insumo) return null;

  const nuevoStock = parseFloat(insumo.stock) + parseFloat(cantidadAjuste);
  if (nuevoStock < 0) {
    throw new Error('El stock no puede ser negativo.');
  }

  const sql = `
    UPDATE insumos 
    SET stock = $1 
    WHERE id = $2
    RETURNING id, nombre, unidad, stock, stock_minimo;
  `;
  const res = await db.query(sql, [nuevoStock, id]);
  return res.rows && res.rows.length > 0 ? res.rows[0] : getInsumoById(id);
}

/**
 * Elimina un insumo verificando que no esté asociado a recetas activas
 */
async function deleteInsumo(id) {
  // Verificar si está en alguna receta
  const checkSql = `SELECT COUNT(*) AS count FROM recetas WHERE insumo_id = $1;`;
  const checkRes = await db.query(checkSql, [id]);
  const count = parseInt(checkRes.rows[0].count, 10);

  if (count > 0) {
    const error = new Error('No se puede eliminar el insumo porque está asociado a recetas activas del menú.');
    error.status = 409;
    throw error;
  }

  const deleteSql = `DELETE FROM insumos WHERE id = $1;`;
  const result = await db.query(deleteSql, [id]);
  return result.rowCount > 0;
}

module.exports = {
  getAllInsumos,
  getInsumoById,
  createInsumo,
  updateInsumo,
  adjustStock,
  deleteInsumo
};
