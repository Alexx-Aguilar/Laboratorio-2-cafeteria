-- =============================================================================
-- LABORATORIO #2: CASO 1 - PUNTO DE VENTA E INVENTARIO DE CAFETERÍA
-- Nombre del negocio: Komorebi Café & Bakery (Cafetería Cute)
-- Motor: PostgreSQL (compatible también con SQLite)
-- =============================================================================

-- Limpieza previa para reinicialización limpia
DROP TABLE IF EXISTS pedido_items CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS recetas CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS insumos CASCADE;

-- -----------------------------------------------------------------------------
-- 1. TABLA: INSUMOS
-- Control de materia prima e ingredientes para las recetas de la cafetería
-- -----------------------------------------------------------------------------
CREATE TABLE insumos (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    unidad TEXT NOT NULL, -- 'g', 'ml', 'unidades', 'shots'
    stock NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (stock >= 0),
    stock_minimo NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0)
);

-- -----------------------------------------------------------------------------
-- 2. TABLA: PRODUCTOS
-- Catálogo de bebidas y repostería que se ofrecen en el menú
-- -----------------------------------------------------------------------------
CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10, 2) NOT NULL CHECK (precio > 0),
    categoria TEXT NOT NULL, -- 'Cafetería', 'Bebidas Frías', 'Matcha & Té', 'Repostería'
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    icono TEXT DEFAULT '☕'
);

-- -----------------------------------------------------------------------------
-- 3. TABLA: RECETAS
-- Relación muchos a muchos entre productos e insumos requeridos para elaborarlos
-- -----------------------------------------------------------------------------
CREATE TABLE recetas (
    id SERIAL PRIMARY KEY,
    producto_id INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    insumo_id INT NOT NULL REFERENCES insumos(id) ON DELETE RESTRICT,
    cantidad NUMERIC(10, 2) NOT NULL CHECK (cantidad > 0),
    CONSTRAINT uq_producto_insumo UNIQUE (producto_id, insumo_id)
);

-- -----------------------------------------------------------------------------
-- 4. TABLA: PEDIDOS
-- Registro de cada transacción/orden generada en el Punto de Venta (POS)
-- -----------------------------------------------------------------------------
CREATE TABLE pedidos (
    id SERIAL PRIMARY KEY,
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('Efectivo', 'Tarjeta', 'Sinpe Movil', 'Transferencia')),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    impuesto NUMERIC(10, 2) NOT NULL CHECK (impuesto >= 0), -- 13% IVA
    descuento NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (descuento >= 0),
    total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    estado TEXT NOT NULL DEFAULT 'CONFIRMADO' CHECK (estado IN ('CONFIRMADO', 'ANULADO')),
    cliente_nombre TEXT DEFAULT 'Cliente Casual',
    notas TEXT
);

-- -----------------------------------------------------------------------------
-- 5. TABLA: PEDIDO_ITEMS
-- Detalle de los productos adquiridos por cada orden, conservando precio histórico
-- -----------------------------------------------------------------------------
CREATE TABLE pedido_items (
    id SERIAL PRIMARY KEY,
    pedido_id INT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id INT NOT NULL REFERENCES productos(id),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10, 2) NOT NULL CHECK (precio_unitario > 0)
);

-- =============================================================================
-- DATOS DE EJEMPLO / SEED DATA
-- =============================================================================

-- Insumos iniciales (algunos con stock bajo para activar la alerta del Agente IA)
INSERT INTO insumos (nombre, unidad, stock, stock_minimo) VALUES
('Café en Grano Especial', 'g', 4500.00, 1000.00),        -- id 1
('Leche Entera Barista', 'ml', 12000.00, 3000.00),         -- id 2
('Leche de Avena Orgánica', 'ml', 4500.00, 2000.00),       -- id 3
('Té Matcha Ceremonial Uji', 'g', 180.00, 300.00),          -- id 4 (STOCK BAJO ALERTA IA)
('Jarabe de Vainilla Francesa', 'ml', 850.00, 500.00),     -- id 5
('Jarabe de Caramelo Salado', 'ml', 320.00, 600.00),       -- id 6 (STOCK BAJO ALERTA IA)
('Puré Artesanal de Fresa', 'ml', 450.00, 500.00),         -- id 7 (STOCK BAJO ALERTA IA)
('Vaso Cute Caliente 12oz', 'unidades', 120.00, 100.00),   -- id 8
('Vaso Cute Frío 16oz', 'unidades', 85.00, 100.00),        -- id 9 (STOCK BAJO ALERTA IA)
('Servilletas Ilustradas', 'unidades', 800.00, 200.00),     -- id 10
('Mantequilla Francesa', 'g', 2200.00, 800.00),            -- id 11
('Harina Pastelera', 'g', 6000.00, 1500.00),               -- id 12
('Chocolate Belga 70%', 'g', 1400.00, 500.00);             -- id 13

-- Productos del Menú
INSERT INTO productos (nombre, descripcion, precio, categoria, activo, icono) VALUES
('Espresso Doble Kawaii', 'Café de especialidad extraído con doble shot aromático', 1800.00, 'Cafetería', true, '☕'),
('Cappuccino Corazón', 'Espresso con leche texturizada al vapor y arte latte tierno', 2600.00, 'Cafetería', true, '🌸'),
('Iced Caramel Cloud', 'Latte frío con jarabe de caramelo salado y espuma cremosa', 3200.00, 'Bebidas Frías', true, '🧊'),
('Matcha Strawberry Latte', 'Matcha ceremonial japonés sobre cama de puré de fresas y leche de avena', 3600.00, 'Matcha & Té', true, '🍓'),
('Vainilla Latte Suave', 'Café espresso con leche texturizada y esencia de vainilla natural', 2900.00, 'Cafetería', true, '✨'),
('Croissant Dorado de Mantequilla', 'Hojaldre artesanal crujiente horneado esta mañana', 2200.00, 'Repostería', true, '🥐'),
('Brownie Fudge de Chocolate', 'Brownie húmedo con chocolate belga al 70% y nueces', 2400.00, 'Repostería', true, '🍫'),
('Mochi Roll de Fresa', 'Postre suave de arroz relleno de crema pastelera y fresa fresca', 3000.00, 'Repostería', true, '🍡');

-- Recetas (Insumos requeridos por producto)
-- 1. Espresso Doble Kawaii (id 1): 18g café, 1 vaso caliente, 1 servilleta
INSERT INTO recetas (producto_id, insumo_id, cantidad) VALUES
(1, 1, 18.00),
(1, 8, 1.00),
(1, 10, 1.00);

-- 2. Cappuccino Corazón (id 2): 18g café, 200ml leche entera, 1 vaso caliente, 1 servilleta
INSERT INTO recetas (producto_id, insumo_id, cantidad) VALUES
(2, 1, 18.00),
(2, 2, 200.00),
(2, 8, 1.00),
(2, 10, 1.00);

-- 3. Iced Caramel Cloud (id 3): 18g café, 180ml leche entera, 30ml caramelo salado, 1 vaso frío, 1 servilleta
INSERT INTO recetas (producto_id, insumo_id, cantidad) VALUES
(3, 1, 18.00),
(3, 2, 180.00),
(3, 6, 30.00),
(3, 9, 1.00),
(3, 10, 1.00);

-- 4. Matcha Strawberry Latte (id 4): 6g matcha, 220ml leche de avena, 40ml puré fresa, 1 vaso frío, 1 servilleta
INSERT INTO recetas (producto_id, insumo_id, cantidad) VALUES
(4, 4, 6.00),
(4, 3, 220.00),
(4, 7, 40.00),
(4, 9, 1.00),
(4, 10, 1.00);

-- 5. Vainilla Latte Suave (id 5): 18g café, 200ml leche entera, 25ml vainilla, 1 vaso caliente, 1 servilleta
INSERT INTO recetas (producto_id, insumo_id, cantidad) VALUES
(5, 1, 18.00),
(5, 2, 200.00),
(5, 5, 25.00),
(5, 8, 1.00),
(5, 10, 1.00);

-- 6. Croissant Dorado (id 6): 50g mantequilla, 70g harina, 1 servilleta
INSERT INTO recetas (producto_id, insumo_id, cantidad) VALUES
(6, 11, 50.00),
(6, 12, 70.00),
(6, 10, 1.00);

-- 7. Brownie Fudge (id 7): 40g chocolate, 30g mantequilla, 40g harina, 1 servilleta
INSERT INTO recetas (producto_id, insumo_id, cantidad) VALUES
(7, 13, 40.00),
(7, 11, 30.00),
(7, 12, 40.00),
(7, 10, 1.00);

-- 8. Mochi Roll de Fresa (id 8): 30ml puré fresa, 40g harina, 1 servilleta
INSERT INTO recetas (producto_id, insumo_id, cantidad) VALUES
(8, 7, 30.00),
(8, 12, 40.00),
(8, 10, 1.00);

-- Pedidos iniciales para el reporte de caja y métricas
-- Pedido 1: Confirmado hoy temprano
INSERT INTO pedidos (id, fecha, metodo_pago, subtotal, impuesto, descuento, total, estado, cliente_nombre, notas)
VALUES (1, CURRENT_TIMESTAMP - INTERVAL '30 MINUTE', 'Tarjeta', 5800.00, 754.00, 0.00, 6554.00, 'CONFIRMADO', 'Sofia Ramirez', 'Sin azúcar en el café');

INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES
(1, 2, 1, 2600.00),
(1, 3, 1, 3200.00);

-- Pedido 2: Confirmado hoy con Sinpe Móvil
INSERT INTO pedidos (id, fecha, metodo_pago, subtotal, impuesto, descuento, total, estado, cliente_nombre, notas)
VALUES (2, CURRENT_TIMESTAMP - INTERVAL '12 MINUTE', 'Sinpe Movil', 5800.00, 754.00, 0.00, 6554.00, 'CONFIRMADO', 'Valeria Mora', 'Para llevar');

INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES
(2, 4, 1, 3600.00),
(2, 6, 1, 2200.00);

-- Pedido 3: Pedido en efectivo
INSERT INTO pedidos (id, fecha, metodo_pago, subtotal, impuesto, descuento, total, estado, cliente_nombre, notas)
VALUES (3, CURRENT_TIMESTAMP - INTERVAL '5 MINUTE', 'Efectivo', 4800.00, 624.00, 0.00, 5424.00, 'CONFIRMADO', 'Carlos Jiménez', 'Mesa 4');

INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES
(3, 7, 2, 2400.00);

-- Pedido 4: Pedido histórico ya anulado para probar historial
INSERT INTO pedidos (id, fecha, metodo_pago, subtotal, impuesto, descuento, total, estado, cliente_nombre, notas)
VALUES (4, CURRENT_TIMESTAMP - INTERVAL '2 HOUR', 'Tarjeta', 1800.00, 234.00, 0.00, 2034.00, 'ANULADO', 'Esteban Castro', 'Cliente canceló por error de producto');

INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES
(4, 1, 1, 1800.00);
