const express = require('express');
const cors = require('cors');

// Importar rutas
const insumosRoutes = require('./routes/insumosRoutes');
const productosRoutes = require('./routes/productosRoutes');
const pedidosRoutes = require('./routes/pedidosRoutes');
const resumenRoutes = require('./routes/resumenRoutes');
const iaRoutes = require('./routes/iaRoutes');

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Log de peticiones simple para depuración
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Ruta de bienvenida / salud
app.get('/', (req, res) => {
  res.json({
    app: 'Komorebi Café & Bakery API - Punto de Venta e Inventario',
    laboratorio: 'Laboratorio #2 - React + Node.js + BD + IA',
    status: 'online',
    version: '1.0.0',
    endpoints: [
      { path: '/api/resumen', description: 'Cierre de caja e indicadores calculados con SQL (SUM, COUNT, GROUP BY)' },
      { path: '/api/productos', description: 'Catálogo de productos con disponibilidad calculada según recetas' },
      { path: '/api/insumos', description: 'Gestión de materia prima, stock y stock mínimo' },
      { path: '/api/pedidos', description: 'Registro y anulación de órdenes con transacciones y 13% impuesto' },
      { path: '/api/ia/sugerencia-compras', description: 'Agente de IA (n8n Webhook / Heurístico) con contrato { ok, data, error }' }
    ]
  });
});

// Montar endpoints de la API
app.use('/api/insumos', insumosRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/resumen', resumenRoutes);
app.use('/api/ia', iaRoutes);

// Manejador 404 para rutas no existentes
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// Manejador global de errores
app.use((err, req, res, next) => {
  console.error('[GLOBAL ERROR]:', err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Error interno del servidor' });
});

module.exports = app;
