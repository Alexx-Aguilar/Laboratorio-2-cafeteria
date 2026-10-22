const fs = require('fs');
const path = require('path');
const db = require('./db');

async function initializeDatabase() {
  console.log('[INIT-DB] Iniciando verificación y siembra de base de datos...');
  
  try {
    const isSqlite = db.isSqlite();
    
    if (isSqlite) {
      const sqliteDb = db.getSqliteDb();
      // Crear tablas para SQLite si no existen
      sqliteDb.exec(`
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS insumos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          unidad TEXT NOT NULL,
          stock NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (stock >= 0),
          stock_minimo NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0)
        );

        CREATE TABLE IF NOT EXISTS productos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          descripcion TEXT,
          precio NUMERIC(10, 2) NOT NULL CHECK (precio > 0),
          categoria TEXT NOT NULL,
          activo INTEGER NOT NULL DEFAULT 1,
          icono TEXT DEFAULT '☕'
        );

        CREATE TABLE IF NOT EXISTS recetas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
          insumo_id INTEGER NOT NULL REFERENCES insumos(id) ON DELETE RESTRICT,
          cantidad NUMERIC(10, 2) NOT NULL CHECK (cantidad > 0),
          UNIQUE(producto_id, insumo_id)
        );

        CREATE TABLE IF NOT EXISTS pedidos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fecha TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('Efectivo', 'Tarjeta', 'Sinpe Movil', 'Transferencia')),
          subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
          impuesto NUMERIC(10, 2) NOT NULL CHECK (impuesto >= 0),
          descuento NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (descuento >= 0),
          total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
          estado TEXT NOT NULL DEFAULT 'CONFIRMADO' CHECK (estado IN ('CONFIRMADO', 'ANULADO')),
          cliente_nombre TEXT DEFAULT 'Cliente Casual',
          notas TEXT
        );

        CREATE TABLE IF NOT EXISTS pedido_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
          producto_id INTEGER NOT NULL REFERENCES productos(id),
          cantidad INTEGER NOT NULL CHECK (cantidad > 0),
          precio_unitario NUMERIC(10, 2) NOT NULL CHECK (precio_unitario > 0)
        );
      `);

      // Verificar si hay insumos
      const insumoCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM insumos').get().count;
      if (insumoCount === 0) {
        console.log('[INIT-DB] Insertando datos de ejemplo (seed) en SQLite...');
        
        // Insumos
        sqliteDb.exec(`
          INSERT INTO insumos (id, nombre, unidad, stock, stock_minimo) VALUES
          (1, 'Café en Grano Especial', 'g', 4500.00, 1000.00),
          (2, 'Leche Entera Barista', 'ml', 12000.00, 3000.00),
          (3, 'Leche de Avena Orgánica', 'ml', 4500.00, 2000.00),
          (4, 'Té Matcha Ceremonial Uji', 'g', 180.00, 300.00),
          (5, 'Jarabe de Vainilla Francesa', 'ml', 850.00, 500.00),
          (6, 'Jarabe de Caramelo Salado', 'ml', 320.00, 600.00),
          (7, 'Puré Artesanal de Fresa', 'ml', 450.00, 500.00),
          (8, 'Vaso Cute Caliente 12oz', 'unidades', 120.00, 100.00),
          (9, 'Vaso Cute Frío 16oz', 'unidades', 85.00, 100.00),
          (10, 'Servilletas Ilustradas', 'unidades', 800.00, 200.00),
          (11, 'Mantequilla Francesa', 'g', 2200.00, 800.00),
          (12, 'Harina Pastelera', 'g', 6000.00, 1500.00),
          (13, 'Chocolate Belga 70%', 'g', 1400.00, 500.00);

          INSERT INTO productos (id, nombre, descripcion, precio, categoria, activo, icono) VALUES
          (1, 'Espresso Doble Kawaii', 'Café de especialidad extraído con doble shot aromático', 1800.00, 'Cafetería', 1, '☕'),
          (2, 'Cappuccino Corazón', 'Espresso con leche texturizada al vapor y arte latte tierno', 2600.00, 'Cafetería', 1, '🌸'),
          (3, 'Iced Caramel Cloud', 'Latte frío con jarabe de caramelo salado y espuma cremosa', 3200.00, 'Bebidas Frías', 1, '🧊'),
          (4, 'Matcha Strawberry Latte', 'Matcha ceremonial japonés sobre cama de puré de fresas y leche de avena', 3600.00, 'Matcha & Té', 1, '🍓'),
          (5, 'Vainilla Latte Suave', 'Café espresso con leche texturizada y esencia de vainilla natural', 2900.00, 'Cafetería', 1, '✨'),
          (6, 'Croissant Dorado de Mantequilla', 'Hojaldre artesanal crujiente horneado esta mañana', 2200.00, 'Repostería', 1, '🥐'),
          (7, 'Brownie Fudge de Chocolate', 'Brownie húmedo con chocolate belga al 70% y nueces', 2400.00, 'Repostería', 1, '🍫'),
          (8, 'Mochi Roll de Fresa', 'Postre suave de arroz relleno de crema pastelera y fresa fresca', 3000.00, 'Repostería', 1, '🍡');

          INSERT INTO recetas (producto_id, insumo_id, cantidad) VALUES
          (1, 1, 18.00), (1, 8, 1.00), (1, 10, 1.00),
          (2, 1, 18.00), (2, 2, 200.00), (2, 8, 1.00), (2, 10, 1.00),
          (3, 1, 18.00), (3, 2, 180.00), (3, 6, 30.00), (3, 9, 1.00), (3, 10, 1.00),
          (4, 4, 6.00), (4, 3, 220.00), (4, 7, 40.00), (4, 9, 1.00), (4, 10, 1.00),
          (5, 1, 18.00), (5, 2, 200.00), (5, 5, 25.00), (5, 8, 1.00), (5, 10, 1.00),
          (6, 11, 50.00), (6, 12, 70.00), (6, 10, 1.00),
          (7, 13, 40.00), (7, 11, 30.00), (7, 12, 40.00), (7, 10, 1.00),
          (8, 7, 30.00), (8, 12, 40.00), (8, 10, 1.00);

          -- Pedidos de prueba
          INSERT INTO pedidos (id, fecha, metodo_pago, subtotal, impuesto, descuento, total, estado, cliente_nombre, notas)
          VALUES (1, datetime('now', '-35 minutes', 'localtime'), 'Tarjeta', 5800.00, 754.00, 0.00, 6554.00, 'CONFIRMADO', 'Sofia Ramirez', 'Sin azúcar en el café');

          INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES
          (1, 2, 1, 2600.00),
          (1, 3, 1, 3200.00);

          INSERT INTO pedidos (id, fecha, metodo_pago, subtotal, impuesto, descuento, total, estado, cliente_nombre, notas)
          VALUES (2, datetime('now', '-10 minutes', 'localtime'), 'Sinpe Movil', 5800.00, 754.00, 0.00, 6554.00, 'CONFIRMADO', 'Valeria Mora', 'Para llevar');

          INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES
          (2, 4, 1, 3600.00),
          (2, 6, 1, 2200.00);

          INSERT INTO pedidos (id, fecha, metodo_pago, subtotal, impuesto, descuento, total, estado, cliente_nombre, notas)
          VALUES (3, datetime('now', '-4 minutes', 'localtime'), 'Efectivo', 4800.00, 624.00, 0.00, 5424.00, 'CONFIRMADO', 'Carlos Jiménez', 'Mesa 4');

          INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES
          (3, 7, 2, 2400.00);

          INSERT INTO pedidos (id, fecha, metodo_pago, subtotal, impuesto, descuento, total, estado, cliente_nombre, notas)
          VALUES (4, datetime('now', '-2 hours', 'localtime'), 'Tarjeta', 1800.00, 234.00, 0.00, 2034.00, 'ANULADO', 'Esteban Castro', 'Cliente canceló por error de producto');

          INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES
          (4, 1, 1, 1800.00);
        `);
        console.log('[INIT-DB] Datos de semilla insertados exitosamente.');
      }
    } else {
      // Si es PostgreSQL, ejecutar schema.sql
      const schemaPath = path.join(__dirname, '..', '..', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, 'utf8');
        await db.query(sql);
        console.log('[INIT-DB] Esquema cargado en PostgreSQL exitosamente.');
      }
    }

    console.log('[INIT-DB] Base de datos lista.');
  } catch (error) {
    console.error('[INIT-DB] Error inicializando base de datos:', error);
    throw error;
  }
}

if (require.main === module) {
  initializeDatabase().then(() => {
    console.log('[INIT-DB] Proceso completado.');
    process.exit(0);
  }).catch((err) => {
    console.error('[INIT-DB] Falló inicialización:', err);
    process.exit(1);
  });
}

module.exports = { initializeDatabase };
