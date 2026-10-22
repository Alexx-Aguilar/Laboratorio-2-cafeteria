const db = require('../db');

const METODOS_PAGO_VALIDOS = ['Efectivo', 'Tarjeta', 'Sinpe Movil', 'Transferencia'];
const IVA_PERCENT = 0.13; // 13% impuesto de valor agregado

/**
 * Obtiene la lista de pedidos con filtros opcionales
 */
async function getAllPedidos(filters = {}) {
  const { estado, metodo_pago, limit = 50 } = filters;
  let sql = `
    SELECT 
      p.id, 
      p.fecha, 
      p.metodo_pago, 
      ROUND(p.subtotal, 2) AS subtotal, 
      ROUND(p.impuesto, 2) AS impuesto, 
      ROUND(p.descuento, 2) AS descuento, 
      ROUND(p.total, 2) AS total, 
      p.estado, 
      p.cliente_nombre, 
      p.notas,
      COUNT(pi.id) AS total_items,
      SUM(pi.cantidad) AS total_unidades
    FROM pedidos p
    LEFT JOIN pedido_items pi ON pi.pedido_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (estado) {
    params.push(estado);
    sql += ` AND p.estado = $${params.length}`;
  }

  if (metodo_pago) {
    params.push(metodo_pago);
    sql += ` AND p.metodo_pago = $${params.length}`;
  }

  sql += `
    GROUP BY p.id
    ORDER BY p.id DESC
    LIMIT $${params.length + 1};
  `;
  params.push(limit);

  const res = await db.query(sql, params);
  
  // Agregar campo calculando si aún se puede anular (dentro de los 15 minutos)
  const ahora = Date.now();
  return res.rows.map(row => {
    const fechaPedido = new Date(row.fecha).getTime();
    const minutosTranscurridos = (ahora - fechaPedido) / (1000 * 60);
    const cancelable = row.estado === 'CONFIRMADO' && minutosTranscurridos <= 15;
    const minutosRestantes = Math.max(0, 15 - Math.floor(minutosTranscurridos));

    return {
      ...row,
      cancelable,
      minutos_restantes_anulacion: cancelable ? minutosRestantes : 0
    };
  });
}

/**
 * Obtiene un pedido por su ID con sus items relacionados y recetas descontadas
 */
async function getPedidoById(id) {
  const pedidoSql = `
    SELECT 
      id, 
      fecha, 
      metodo_pago, 
      ROUND(subtotal, 2) AS subtotal, 
      ROUND(impuesto, 2) AS impuesto, 
      ROUND(descuento, 2) AS descuento, 
      ROUND(total, 2) AS total, 
      estado, 
      cliente_nombre, 
      notas
    FROM pedidos
    WHERE id = $1;
  `;
  const pedidoRes = await db.query(pedidoSql, [id]);
  if (pedidoRes.rows.length === 0) return null;

  const pedido = pedidoRes.rows[0];

  // Items del pedido
  const itemsSql = `
    SELECT 
      pi.id,
      pi.producto_id,
      p.nombre AS producto_nombre,
      p.categoria AS producto_categoria,
      p.icono AS producto_icono,
      pi.cantidad,
      ROUND(pi.precio_unitario, 2) AS precio_unitario,
      ROUND(pi.cantidad * pi.precio_unitario, 2) AS subtotal_item
    FROM pedido_items pi
    JOIN productos p ON p.id = pi.producto_id
    WHERE pi.pedido_id = $1
    ORDER BY pi.id ASC;
  `;
  const itemsRes = await db.query(itemsSql, [id]);
  pedido.items = itemsRes.rows;

  // Evaluar regla de los 15 minutos para anulación
  const ahora = Date.now();
  const fechaPedido = new Date(pedido.fecha).getTime();
  const minutosTranscurridos = (ahora - fechaPedido) / (1000 * 60);
  pedido.cancelable = pedido.estado === 'CONFIRMADO' && minutosTranscurridos <= 15;
  pedido.minutos_transcurridos = Math.round(minutosTranscurridos);
  pedido.minutos_restantes_anulacion = pedido.cancelable ? Math.max(0, 15 - Math.floor(minutosTranscurridos)) : 0;

  return pedido;
}

/**
 * Crea un nuevo pedido con validación de reglas de negocio en servidor y transacción:
 * 1. Calcula precios, combos y 13% impuesto.
 * 2. Verifica si hay insumos suficientes para todas las recetas (409 si falta alguno).
 * 3. Ejecuta transacción: INSERT pedido, INSERT pedido_items, UPDATE insumos (descuento).
 */
async function createPedido(data) {
  const { metodo_pago, cliente_nombre = 'Cliente Casual', notas = '', items } = data;

  // Validación básica
  if (!items || !Array.isArray(items) || items.length === 0) {
    const error = new Error('El pedido debe incluir al menos un producto.');
    error.status = 400;
    throw error;
  }

  if (!metodo_pago || !METODOS_PAGO_VALIDOS.includes(metodo_pago)) {
    const error = new Error(`Método de pago inválido. Permitidos: ${METODOS_PAGO_VALIDOS.join(', ')}`);
    error.status = 400;
    throw error;
  }

  // Validar cantidades de cada item
  for (const item of items) {
    if (!item.producto_id || !item.cantidad || parseInt(item.cantidad, 10) <= 0) {
      const error = new Error('Cada item debe tener un producto_id válido y una cantidad mayor a 0.');
      error.status = 400;
      throw error;
    }
  }

  // 1. Obtener detalles de productos desde la base de datos (seguridad: precio nunca viene del cliente)
  const productIds = [...new Set(items.map(i => parseInt(i.producto_id, 10)))];
  const placeholders = productIds.map((_, i) => `$${i + 1}`).join(', ');
  const prodSql = `SELECT id, nombre, precio, categoria, activo FROM productos WHERE id IN (${placeholders});`;
  const prodRes = await db.query(prodSql, productIds);
  const productsMap = new Map();
  prodRes.rows.forEach(p => productsMap.set(p.id, p));

  for (const item of items) {
    const prod = productsMap.get(parseInt(item.producto_id, 10));
    if (!prod) {
      const error = new Error(`El producto con ID ${item.producto_id} no existe.`);
      error.status = 404;
      throw error;
    }
    if (prod.activo === 0 || prod.activo === false) {
      const error = new Error(`El producto "${prod.nombre}" está inactivo y no se puede ordenar.`);
      error.status = 409;
      throw error;
    }
  }

  // 2. Obtener todas las recetas de los productos ordenados
  const recetasSql = `
    SELECT 
      r.producto_id,
      r.insumo_id,
      r.cantidad AS cantidad_receta,
      i.nombre AS insumo_nombre,
      i.stock AS insumo_stock,
      i.unidad AS insumo_unidad
    FROM recetas r
    JOIN insumos i ON i.id = r.insumo_id
    WHERE r.producto_id IN (${placeholders});
  `;
  const recetasRes = await db.query(recetasSql, productIds);

  // Calcular insumos totales requeridos por toda la orden
  const insumosRequeridos = new Map(); // insumo_id -> { nombre, unidad, stock, totalRequerido }
  
  for (const item of items) {
    const prodId = parseInt(item.producto_id, 10);
    const cant = parseInt(item.cantidad, 10);
    const recetasDelProducto = recetasRes.rows.filter(r => r.producto_id === prodId);

    for (const r of recetasDelProducto) {
      const insumoId = r.insumo_id;
      const necesario = parseFloat(r.cantidad_receta) * cant;

      if (!insumosRequeridos.has(insumoId)) {
        insumosRequeridos.set(insumoId, {
          id: insumoId,
          nombre: r.insumo_nombre,
          unidad: r.insumo_unidad,
          stock: parseFloat(r.insumo_stock),
          totalRequerido: 0
        });
      }
      insumosRequeridos.get(insumoId).totalRequerido += necesario;
    }
  }

  // 3. REGLA DE NEGOCIO: Validar disponibilidad de insumos (HTTP 409 si no alcanza)
  const insumosInsuficientes = [];
  for (const [insumoId, data] of insumosRequeridos.entries()) {
    if (data.totalRequerido > data.stock) {
      insumosInsuficientes.push(
        `"${data.nombre}" (Requiere: ${data.totalRequerido.toFixed(2)} ${data.unidad}, Stock actual: ${data.stock.toFixed(2)} ${data.unidad})`
      );
    }
  }

  if (insumosInsuficientes.length > 0) {
    const error = new Error(
      `No se puede preparar el pedido por falta de insumos suficientes: ${insumosInsuficientes.join('; ')}`
    );
    error.status = 409;
    throw error;
  }

  // 4. Calcular importes financieros con regla de 13% IVA y Reto Extra de Combos
  let subtotal = 0;
  let tieneBebidaCafe = false;
  let tieneReposteria = false;

  const itemsCalculados = items.map(item => {
    const prod = productsMap.get(parseInt(item.producto_id, 10));
    const cant = parseInt(item.cantidad, 10);
    const precio = parseFloat(prod.precio);
    const subtotalLinea = precio * cant;
    subtotal += subtotalLinea;

    if (prod.categoria === 'Cafetería' || prod.categoria === 'Bebidas Frías') tieneBebidaCafe = true;
    if (prod.categoria === 'Repostería') tieneReposteria = true;

    return {
      producto_id: prod.id,
      nombre: prod.nombre,
      cantidad: cant,
      precio_unitario: precio,
      subtotal_linea: subtotalLinea
    };
  });

  // Reto Extra: Combo Café + Repostería = 10% de descuento en la orden
  let descuento = 0;
  if (tieneBebidaCafe && tieneReposteria) {
    descuento = Math.round(subtotal * 0.10 * 100) / 100; // 10% descuento combo
  }

  const baseImponible = subtotal - descuento;
  const impuesto = Math.round(baseImponible * IVA_PERCENT * 100) / 100;
  const total = Math.round((baseImponible + impuesto) * 100) / 100;

  // 5. TRANSACCIÓN ATÓMICA (BEGIN / COMMIT / ROLLBACK)
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // A. Insertar cabecera del pedido
    const insertPedidoSql = `
      INSERT INTO pedidos (metodo_pago, subtotal, impuesto, descuento, total, estado, cliente_nombre, notas)
      VALUES ($1, $2, $3, $4, $5, 'CONFIRMADO', $6, $7)
      RETURNING id, fecha, metodo_pago, subtotal, impuesto, descuento, total, estado, cliente_nombre, notas;
    `;
    const pedidoResult = await client.query(insertPedidoSql, [
      metodo_pago,
      subtotal,
      impuesto,
      descuento,
      total,
      cliente_nombre ? cliente_nombre.trim() : 'Cliente Casual',
      notas ? notas.trim() : ''
    ]);

    let newPedidoId = null;
    if (pedidoResult.rows && pedidoResult.rows.length > 0) {
      newPedidoId = pedidoResult.rows[0].id;
    } else if (pedidoResult.lastInsertRowid) {
      newPedidoId = pedidoResult.lastInsertRowid;
    }

    // B. Insertar cada item del pedido guardando precio unitario histórico
    for (const it of itemsCalculados) {
      await client.query(
        `INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES ($1, $2, $3, $4);`,
        [newPedidoId, it.producto_id, it.cantidad, it.precio_unitario]
      );
    }

    // C. Descontar stock de insumos de las recetas
    for (const [insumoId, data] of insumosRequeridos.entries()) {
      await client.query(
        `UPDATE insumos SET stock = stock - $1 WHERE id = $2;`,
        [data.totalRequerido, insumoId]
      );
    }

    await client.query('COMMIT');
    
    // Retornar pedido completo ya creado
    const pedidoCreado = await getPedidoById(newPedidoId);
    return pedidoCreado;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[PEDIDOS ERROR EN TRANSACCIÓN]:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Anula un pedido dentro de los primeros 15 minutos:
 * - Valida que no esté ya anulado (409)
 * - Valida tiempo transcurrido <= 15 min (409 si pasaron > 15 min)
 * - Ejecuta transacción: cambia estado a 'ANULADO' y DEVUELVE los insumos al stock.
 */
async function anularPedido(id, motivo = 'Cancelado por solicitud del cliente') {
  const pedido = await getPedidoById(id);
  if (!pedido) {
    const error = new Error(`El pedido con ID ${id} no existe.`);
    error.status = 404;
    throw error;
  }

  // Regla 1: Ya está anulado
  if (pedido.estado === 'ANULADO') {
    const error = new Error('El pedido ya se encuentra anulado.');
    error.status = 409;
    throw error;
  }

  // Regla 2: Límite de 15 minutos
  const ahora = Date.now();
  const fechaPedido = new Date(pedido.fecha).getTime();
  const minutosTranscurridos = (ahora - fechaPedido) / (1000 * 60);

  if (minutosTranscurridos > 15) {
    const error = new Error(
      `No se puede anular el pedido: han transcurrido ${Math.round(minutosTranscurridos)} minutos desde su emisión (límite máximo permitido: 15 minutos).`
    );
    error.status = 409;
    throw error;
  }

  // TRANSACCIÓN DE ANULACIÓN Y DEVOLUCIÓN DE INSUMOS
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Obtener todas las deducciones de insumos que correspondieron a este pedido
    const deduccionesSql = `
      SELECT 
        r.insumo_id, 
        SUM(r.cantidad * pi.cantidad) AS cantidad_a_devolver
      FROM pedido_items pi
      JOIN recetas r ON r.producto_id = pi.producto_id
      WHERE pi.pedido_id = $1
      GROUP BY r.insumo_id;
    `;
    const deduccionesRes = await client.query(deduccionesSql, [id]);

    // 2. Reingresar insumos al stock
    for (const d of deduccionesRes.rows) {
      await client.query(
        `UPDATE insumos SET stock = stock + $1 WHERE id = $2;`,
        [parseFloat(d.cantidad_a_devolver), d.insumo_id]
      );
    }

    // 3. Cambiar estado a ANULADO
    const notasActualizadas = pedido.notas 
      ? `${pedido.notas} | [ANULACIÓN]: ${motivo}` 
      : `[ANULACIÓN]: ${motivo}`;

    await client.query(
      `UPDATE pedidos SET estado = 'ANULADO', notas = $1 WHERE id = $2;`,
      [notasActualizadas, id]
    );

    await client.query('COMMIT');

    const pedidoAnulado = await getPedidoById(id);
    return {
      message: 'Pedido anulado con éxito. Los insumos han sido reintegrados al inventario.',
      pedido: pedidoAnulado
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ANULAR PEDIDO ERROR EN TRANSACCIÓN]:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getAllPedidos,
  getPedidoById,
  createPedido,
  anularPedido
};
