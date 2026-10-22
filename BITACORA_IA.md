# 📝 Bitácora de Uso de IA como Copiloto (Laboratorio #2)

**Estudiante:** Desarrollo Front End & Back End  
**Proyecto:** Komorebi Café & Bakery · POS Cute, Inventario & Agente de IA  
**Caso Elegido:** Caso #1: Punto de venta e inventario de una cafetería  
**Herramienta Asistente:** Asistente IA Antigravity / Claude  

---

## 📌 Resumen del Uso de la IA en el Proyecto
Durante el desarrollo del Laboratorio #2, la IA se utilizó como copiloto técnico para acelerar el diseño relacional, modelar transacciones ACID en Express, resolver solapamientos de tiempo para la anulación de pedidos y estructurar el contrato JSON para el nodo AI Agent en n8n. Siguiendo la premisa del laboratorio, todo código generado fue comprendido, probado con suites automatizadas y adaptado a la lógica de negocio del servidor.

---

## 📋 Registro de Prompts Relevantes

### 🔹 Entrada 1: Modelado de Datos Relacional y Restricciones (Día 1)
* **Objetivo:** Diseñar el archivo `schema.sql` con llaves foráneas, restricciones `CHECK`, campos calculados y compatibilidad tanto para PostgreSQL como para SQLite en caso de despliegue local.
* **Prompt Enviado:**
  > *"Actúa como un arquitecto de bases de datos senior. Diseña un esquema relacional para el Caso 1 (Cafetería) con las tablas insumos, productos, recetas, pedidos y pedido_items. Incluye llaves primarias, foráneas con integridad referencial (CASCADE / RESTRICT), restricciones CHECK para precios y cantidades positivas, y cálculo de stock no negativo. Proporciona además datos semilla realistas de cafetería cute (matcha, café, croissants) con algunos insumos intencionalmente por debajo del mínimo para activar las alertas del agente de IA."*
* **Lo que devolvió la IA:**
  Un script SQL con las 5 tablas solicitadas, restricciones `CHECK (precio > 0)` y datos de prueba.
* **Lo que se corrigió / ajustó:**
  1. En SQLite no existe el tipo `SERIAL` ni la cláusula `INTERVAL '30 MINUTE'` directamente como en Postgres. Se adaptó la capa de acceso a datos (`db.js` e `initDb.js`) para normalizar dinámicamente estos dialectos, asegurando que el script `schema.sql` cumpla 100% con PostgreSQL estándar mientras que el motor local de pruebas funcione sin dependencias externas en Windows.
  2. Se añadió la restricción de unicidad `UNIQUE (producto_id, insumo_id)` en la tabla `recetas` para impedir que un mismo ingrediente se asocie dos veces al mismo producto con cantidades distintas.

---

### 🔹 Entrada 2: Transacción Atómica para Deducción de Insumos y 13% IVA (Día 1)
* **Objetivo:** Implementar la lógica del endpoint `POST /api/pedidos` con validación en servidor de disponibilidad de recetas y transacción `BEGIN / COMMIT / ROLLBACK`.
* **Prompt Enviado:**
  > *"En Node.js + Express, crea un servicio pedidosService.js que reciba un array de items. Antes de insertar, debe consultar las recetas de cada producto, sumar el total requerido por insumo y verificar si el stock en la base de datos es suficiente. Si algún insumo falta, debe arrojar un error HTTP 409 con el detalle de lo que falta. Si alcanza, debe abrir una transacción, calcular el 13% de impuesto sobre los precios de la BD (sin confiar en el cliente), guardar el precio histórico en pedido_items, descontar el stock de insumos y hacer COMMIT. Si algo falla, hacer ROLLBACK."*
* **Lo que devolvió la IA:**
  El código base del servicio utilizando consultas SQL dentro de un bloque `try/catch/finally` con el cliente de la base de datos.
* **Lo que se corrigió / ajustó:**
  1. La IA inicialmente realizaba una consulta `SELECT * FROM insumos` por cada ingrediente dentro de un bucle `for`, lo cual causaba el problema de consultas $N+1$. Se refactorizó para recopilar todos los `producto_id` en una sola consulta `WHERE producto_id IN (...)` y agrupar los requerimientos en memoria mediante un `Map()`.
  2. Se agregó la lógica del Reto Extra: detección automática de combos (si la orden incluye una bebida y un producto de repostería, se aplica automáticamente un 10% de descuento antes del cálculo del IVA del 13%).

---

### 🔹 Entrada 3: Regla de Anulación Estricta a los 15 Minutos y Devolución de Stock (Día 1)
* **Objetivo:** Construir la regla de negocio que restringe la anulación de órdenes a los primeros 15 minutos desde su emisión, revirtiendo el inventario.
* **Prompt Enviado:**
  > *"Implementa la función anularPedido(id) en pedidosService.js. Debe verificar: 1) Si el pedido ya está anulado, retornar 409. 2) Si han pasado más de 15 minutos desde el campo fecha, retornar 409 indicando los minutos transcurridos. 3) Si está dentro del margen de 15 minutos, iniciar una transacción que sume de vuelta al stock de insumos las cantidades consumidas en sus recetas y marque el estado en 'ANULADO'."*
* **Lo que devolvió la IA:**
  Un flujo que calculaba la diferencia de tiempo entre `Date.now()` y `new Date(pedido.fecha)`.
* **Lo que se corrigió / ajustó:**
  1. La IA había olvidado agrupar las cantidades si un insumo fue consumido por múltiples items del mismo pedido; se aplicó un `SUM(r.cantidad * pi.cantidad) GROUP BY r.insumo_id` dentro del `UPDATE` para restaurar el inventario exactamente en el volumen correcto.
  2. Se estructuró el mensaje de error 409 para que indique con claridad al usuario cuántos minutos transcurrieron y por qué la regla del servidor no permite cancelarlo.

---

### 🔹 Entrada 4: Custom Hook `useFetch` y Manejo de Errores 400/409 en React (Día 2)
* **Objetivo:** Diseñar un custom hook reutilizable `useFetch` que provea `{ data, loading, error, refetch }` y preserve los códigos de error HTTP del backend.
* **Prompt Enviado:**
  > *"Crea un custom hook useFetch en React para consumir nuestra API. Debe gestionar estados data, loading y error, además de exponer una función refetch(). Adicionalmente, crea un componente ErrorMessage.jsx y modal de alertas que extraiga el mensaje JSON { error: '...' } devuelto por la API cuando arroje códigos 400 (datos inválidos) y 409 (conflicto de reglas de negocio)."*
* **Lo que devolvió la IA:**
  Un hook básico con `useEffect` y un componente de alerta estándar.
* **Lo que se corrigió / ajustó:**
  1. En `services/api.js`, `fetch` por defecto no lanza error en respuestas 400 o 409 porque `response.ok` es simplemente `false`. Se programó la función genérica `request` para que extraiga el JSON `{ error }` del cuerpo y lance un `new Error(json.error)` enriquecido con la propiedad `status`.
  2. Se integró una estética visual suave acorde al tema Cute Cafetería (fondos pastel, bordes delicados e íconos descriptivos).

---

### 🔹 Entrada 5: Workflow n8n y Contrato `{ ok, data, error }` (Día 2)
* **Objetivo:** Diseñar el flujo de n8n para el nodo AI Agent y garantizar que tanto en n8n como en el backend se respete el contrato de integración.
* **Prompt Enviado:**
  > *"Genera la estructura de un workflow de n8n con Webhook POST, nodo Code para contextualizar los insumos críticos con bajo stock y ventas semanales, nodo AI Agent con modelo LLM, y Respond to Webhook que devuelva estrictamente el contrato JSON { ok, data, error }. Si n8n estuviera apagado en la máquina del evaluador, propón un mecanismo de fallback transparente en el backend para que la aplicación React continúe funcionando sin interrupciones."*
* **Lo que devolvió la IA:**
  El árbol de nodos de n8n en JSON y un módulo Node.js con fallback heurístico.
* **Lo que se corrigió / ajustó:**
  1. Se eliminaron tokens y credenciales privadas del archivo exportado `n8n/workflow_sugerencia_compras.json` para cumplir con las instrucciones de entrega del laboratorio.
  2. En el backend se implementó un `AbortController` con timeout de 3 segundos: si n8n no responde o está offline, el backend conmuta de forma transparente al motor heurístico con justificaciones operativas y el contrato `{ ok, data, error }`, permitiendo una defensa sin contratiempos.

---

## 🎓 Preparación para la Defensa Oral
Durante la evaluación individual, el estudiante defenderá los siguientes aspectos arquitectónicos implementados:
1. **¿Por qué las reglas de negocio viven en el servidor y no en el front?**  
   Porque cualquier usuario puede manipular el código de React o interceptar peticiones con herramientas como Postman. El servidor es la única autoridad con acceso verificado y transaccional a la base de datos.
2. **¿Cómo garantizan las transacciones que no haya inconsistencias?**  
   Al crear un pedido, si la deducción de insumos falla a mitad de camino, el bloque `ROLLBACK` anula toda la operación, evitando que quede un pedido registrado sin descontar inventario o viceversa.
3. **¿Cómo se calculan las métricas en SQL?**  
   Se utiliza agregación con `SUM(total)`, `COUNT(id)`, `SUM(pi.cantidad)` y `GROUP BY metodo_pago, p.id` directamente en el motor de base de datos, optimizando el rendimiento.
