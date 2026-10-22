const http = require('http');

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

// Helper simple para hacer requests HTTP nativos sin dependencias externas
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n🧪 ========================================================');
  console.log('🧪 INICIANDO SUITE DE PRUEBAS AUTOMATIZADAS DE LA API');
  console.log('🧪 ========================================================\n');

  let passed = 0;
  let total = 0;

  function assert(title, condition, extra = '') {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${title} - ${extra}`);
    }
  }

  try {
    // 1. Salud / Info
    const resRoot = await request('GET', '/');
    assert('GET / -> 200 OK con info de la API', resRoot.status === 200 && resRoot.body.status === 'online');

    // 2. Resumen y Métricas
    const resResumen = await request('GET', '/api/resumen');
    assert('GET /api/resumen -> 200 OK con indicadores de cierre de caja', 
      resResumen.status === 200 && 
      resResumen.body.cierre_caja && 
      Array.isArray(resResumen.body.ventas_por_metodo_pago) &&
      Array.isArray(resResumen.body.top_5_productos)
    );

    // 3. Productos - Listado y Disponibilidad
    const resProdList = await request('GET', '/api/productos');
    assert('GET /api/productos -> 200 OK con lista de productos y disponibilidad',
      resProdList.status === 200 && Array.isArray(resProdList.body) && resProdList.body.length > 0
    );

    // 4. Productos - Detalle con Receta (GET /:id)
    const resProdDetalle = await request('GET', '/api/productos/2');
    assert('GET /api/productos/2 -> 200 OK con datos de receta',
      resProdDetalle.status === 200 && resProdDetalle.body.nombre === 'Cappuccino Corazón' && Array.isArray(resProdDetalle.body.receta)
    );

    // 5. Productos - 404 No encontrado
    const resProd404 = await request('GET', '/api/productos/9999');
    assert('GET /api/productos/9999 -> 404 Not Found con { error }',
      resProd404.status === 404 && resProd404.body.error
    );

    // 6. Productos - 400 Bad Request
    const resProd400 = await request('POST', '/api/productos', { nombre: '' });
    assert('POST /api/productos sin datos requeridos -> 400 Bad Request',
      resProd400.status === 400 && resProd400.body.error
    );

    // 7. Insumos - Listado con alerta de stock bajo
    const resInsumos = await request('GET', '/api/insumos');
    assert('GET /api/insumos -> 200 OK con insumos y banderas de bajo stock',
      resInsumos.status === 200 && Array.isArray(resInsumos.body) && resInsumos.body.some(i => i.bajo_stock === 1)
    );

    // 8. Insumos - 400 Validación de número negativo
    const resInsumo400 = await request('POST', '/api/insumos', { nombre: 'Canela', unidad: 'g', stock: -5 });
    assert('POST /api/insumos con stock negativo -> 400 Bad Request',
      resInsumo400.status === 400 && resInsumo400.body.error.includes('negativo')
    );

    // 9. Insumos - 409 Conflicto al eliminar insumo en uso
    const resInsumo409 = await request('DELETE', '/api/insumos/1');
    assert('DELETE /api/insumos/1 (Café en uso en recetas) -> 409 Conflict',
      resInsumo409.status === 409 && resInsumo409.body.error.includes('recetas activas')
    );

    // 10. Pedidos - 400 Datos inválidos
    const resPed400 = await request('POST', '/api/pedidos', { items: [] });
    assert('POST /api/pedidos con items vacíos -> 400 Bad Request',
      resPed400.status === 400 && resPed400.body.error
    );

    // 11. Pedidos - 409 Regla de negocio: Insumos insuficientes
    const resPedStockInsuficiente = await request('POST', '/api/pedidos', {
      metodo_pago: 'Tarjeta',
      items: [{ producto_id: 4, cantidad: 500 }] // Requiere 3000g de matcha cuando solo hay 180g
    });
    assert('POST /api/pedidos que supera stock de receta -> 409 Conflict con detalle del insumo',
      resPedStockInsuficiente.status === 409 && resPedStockInsuficiente.body.error.includes('insumos suficientes')
    );

    // 12. Pedidos - 201 Creación exitosa con cálculo de 13% impuesto y descuento combo
    const resPedNuevo = await request('POST', '/api/pedidos', {
      metodo_pago: 'Sinpe Movil',
      cliente_nombre: 'Prueba Automatizada',
      notas: 'Pedido de verificación',
      items: [
        { producto_id: 1, cantidad: 1 }, // Espresso: 1800
        { producto_id: 6, cantidad: 1 }  // Croissant: 2200 -> Activa combo 10%
      ]
    });
    assert('POST /api/pedidos válido -> 201 Created con cálculo de 13% impuesto y descuento combo',
      resPedNuevo.status === 201 && 
      resPedNuevo.body.id && 
      parseFloat(resPedNuevo.body.impuesto) > 0 &&
      parseFloat(resPedNuevo.body.total) > 0 &&
      resPedNuevo.body.items.length === 2
    );

    const nuevoPedidoId = resPedNuevo.body.id;

    // 13. Pedidos - Anular pedido reciente (< 15 min) -> 200 OK y reintegro de stock
    const resAnularExito = await request('PATCH', `/api/pedidos/${nuevoPedidoId}/anular`, {
      motivo: 'Prueba de anulación antes de 15 minutos'
    });
    assert('PATCH /api/pedidos/:id/anular (< 15 min) -> 200 OK y reintegra insumos',
      resAnularExito.status === 200 && resAnularExito.body.pedido.estado === 'ANULADO'
    );

    // 14. Pedidos - Re-anular pedido ya anulado -> 409 Conflict
    const resReanular = await request('PATCH', `/api/pedidos/${nuevoPedidoId}/anular`);
    assert('PATCH /api/pedidos/:id/anular en pedido ya anulado -> 409 Conflict',
      resReanular.status === 409 && resReanular.body.error.includes('ya se encuentra anulado')
    );

    // 15. Pedidos - Anular pedido con más de 15 minutos -> 409 Conflict (Pedido #4 de seed data)
    const resAnularTarde = await request('PATCH', `/api/pedidos/1/anular`);
    assert('PATCH /api/pedidos/1/anular (> 15 min de emitido) -> 409 Conflict por límite de tiempo',
      resAnularTarde.status === 409 && resAnularTarde.body.error.includes('15 minutos')
    );

    // 16. Agente IA - Sugerencia de Compras -> Contrato { ok, data, error }
    const resIA = await request('POST', '/api/ia/sugerencia-compras', {});
    assert('POST /api/ia/sugerencia-compras -> 200 OK con contrato { ok: true, data, error: null }',
      resIA.status === 200 && 
      resIA.body.ok === true && 
      resIA.body.data && 
      resIA.body.error === null
    );

  } catch (err) {
    console.error('Error durante ejecución de pruebas:', err.message);
  }

  console.log('\n📊 ========================================================');
  console.log(`📊 RESULTADO DE PRUEBAS: ${passed} / ${total} PASADAS (${Math.round((passed / total) * 100)}%)`);
  console.log('📊 ========================================================\n');

  if (passed === total) {
    console.log('🎉 ¡TODOS LOS REQUISITOS DEL BACKEND ESTÁN 100% CUMPLIDOS!');
  } else {
    console.warn('⚠️ Algunas pruebas no pasaron. Revisa los mensajes arriba.');
  }
}

// Ejecutar pruebas
runTests();
