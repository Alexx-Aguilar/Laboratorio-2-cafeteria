require('dotenv').config();
const app = require('./app');
const { initializeDatabase } = require('./initDb');

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Asegurar que la base de datos esté inicializada
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log('='.repeat(65));
      console.log(`🌸 Komorebi Café & Bakery API en ejecución en http://localhost:${PORT}`);
      console.log(`☕ Endpoints listos:`);
      console.log(`   - GET  /api/resumen`);
      console.log(`   - GET  /api/productos`);
      console.log(`   - GET  /api/insumos`);
      console.log(`   - GET  /api/pedidos`);
      console.log(`   - POST /api/pedidos (con transacciones y 13% impuesto)`);
      console.log(`   - POST /api/ia/sugerencia-compras (Agente IA n8n / heurístico)`);
      console.log('='.repeat(65));
    });
  } catch (err) {
    console.error('❌ Error crítico al iniciar el servidor:', err);
    process.exit(1);
  }
}

startServer();
