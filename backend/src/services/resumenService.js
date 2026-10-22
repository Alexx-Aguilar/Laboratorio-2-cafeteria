const db = require('../db');

/**
 * Genera el resumen y métricas de cierre de caja calculados con SQL (SUM, COUNT, GROUP BY)
 */
async function getResumenMetricas() {
  // 1. Total general y ventas del día (solo pedidos CONFIRMADOS)
  const totalesSql = `
    SELECT 
      COUNT(id) AS total_pedidos_confirmados,
      COALESCE(SUM(subtotal), 0) AS total_subtotal,
      COALESCE(SUM(impuesto), 0) AS total_impuesto,
      COALESCE(SUM(descuento), 0) AS total_descuentos,
      COALESCE(SUM(total), 0) AS total_ingresos
    FROM pedidos
    WHERE estado = 'CONFIRMADO';
  `;
  const totalesRes = await db.query(totalesSql);
  const totales = totalesRes.rows[0];

  // 2. Cierre de caja: Ventas agrupadas por Método de Pago (SUM, COUNT, GROUP BY)
  const ventasMetodoPagoSql = `
    SELECT 
      metodo_pago,
      COUNT(id) AS cantidad_transacciones,
      ROUND(COALESCE(SUM(total), 0), 2) AS total_monto
    FROM pedidos
    WHERE estado = 'CONFIRMADO'
    GROUP BY metodo_pago
    ORDER BY total_monto DESC;
  `;
  const ventasMetodoRes = await db.query(ventasMetodoPagoSql);

  // 3. Top 5 productos más vendidos (SUM(cantidad), GROUP BY, ORDER BY DESC LIMIT 5)
  const top5Sql = `
    SELECT 
      p.id,
      p.nombre,
      p.categoria,
      p.icono,
      SUM(pi.cantidad) AS unidades_vendidas,
      ROUND(SUM(pi.cantidad * pi.precio_unitario), 2) AS total_recaudado
    FROM pedido_items pi
    JOIN productos p ON p.id = pi.producto_id
    JOIN pedidos ped ON ped.id = pi.pedido_id
    WHERE ped.estado = 'CONFIRMADO'
    GROUP BY p.id, p.nombre, p.categoria, p.icono
    ORDER BY unidades_vendidas DESC, total_recaudado DESC
    LIMIT 5;
  `;
  const top5Res = await db.query(top5Sql);

  // 4. Conteo de pedidos por Estado (CONFIRMADO vs ANULADO)
  const estadosSql = `
    SELECT 
      estado,
      COUNT(id) AS total
    FROM pedidos
    GROUP BY estado;
  `;
  const estadosRes = await db.query(estadosSql);
  const estadosMap = { CONFIRMADO: 0, ANULADO: 0 };
  estadosRes.rows.forEach(r => {
    estadosMap[r.estado] = parseInt(r.total, 10);
  });

  // 5. Insumos en estado crítico (stock <= stock_minimo)
  const insumosCriticosSql = `
    SELECT 
      id,
      nombre,
      unidad,
      ROUND(stock, 2) AS stock_actual,
      ROUND(stock_minimo, 2) AS stock_minimo,
      ROUND(stock_minimo - stock, 2) AS deficit
    FROM insumos
    WHERE stock <= stock_minimo
    ORDER BY (stock / (CASE WHEN stock_minimo = 0 THEN 1 ELSE stock_minimo END)) ASC;
  `;
  const insumosCriticosRes = await db.query(insumosCriticosSql);

  // 6. Ventas agrupadas por categoría
  const ventasCategoriaSql = `
    SELECT 
      p.categoria,
      SUM(pi.cantidad) AS unidades_vendidas,
      ROUND(SUM(pi.cantidad * pi.precio_unitario), 2) AS total_ingresos
    FROM pedido_items pi
    JOIN productos p ON p.id = pi.producto_id
    JOIN pedidos ped ON ped.id = pi.pedido_id
    WHERE ped.estado = 'CONFIRMADO'
    GROUP BY p.categoria
    ORDER BY total_ingresos DESC;
  `;
  const ventasCategoriaRes = await db.query(ventasCategoriaSql);

  return {
    cierre_caja: {
      pedidos_confirmados: parseInt(totales.total_pedidos_confirmados, 10),
      pedidos_anulados: estadosMap.ANULADO || 0,
      total_subtotal: parseFloat(totales.total_subtotal),
      total_impuesto: parseFloat(totales.total_impuesto),
      total_descuentos: parseFloat(totales.total_descuentos),
      total_ingresos: parseFloat(totales.total_ingresos)
    },
    ventas_por_metodo_pago: ventasMetodoRes.rows.map(v => ({
      metodo_pago: v.metodo_pago,
      cantidad_transacciones: parseInt(v.cantidad_transacciones, 10),
      total_monto: parseFloat(v.total_monto)
    })),
    top_5_productos: top5Res.rows.map(p => ({
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria,
      icono: p.icono,
      unidades_vendidas: parseInt(p.unidades_vendidas, 10),
      total_recaudado: parseFloat(p.total_recaudado)
    })),
    insumos_criticos: insumosCriticosRes.rows.map(i => ({
      id: i.id,
      nombre: i.nombre,
      unidad: i.unidad,
      stock_actual: parseFloat(i.stock_actual),
      stock_minimo: parseFloat(i.stock_minimo),
      deficit: parseFloat(i.deficit)
    })),
    ventas_por_categoria: ventasCategoriaRes.rows.map(c => ({
      categoria: c.categoria,
      unidades_vendidas: parseInt(c.unidades_vendidas, 10),
      total_ingresos: parseFloat(c.total_ingresos)
    }))
  };
}

module.exports = {
  getResumenMetricas
};
