import React, { useState, useMemo } from 'react';
import { useFetch } from '../hooks/useFetch';
import { getProductos, createPedido } from '../services/api';
import ErrorMessage from '../components/ErrorMessage';
import Badge from '../components/Badge';
import { ShoppingCart, Search, Plus, Minus, Trash2, Check, Sparkles, AlertCircle } from 'lucide-react';

export default function POSView() {
  const { data: productos, loading, error: fetchError, refetch } = useFetch(getProductos);

  // Estados del carrito de compra y formulario de pedido
  const [cart, setCart] = useState([]);
  const [clienteNombre, setClienteNombre] = useState('Cliente Casual');
  const [metodoPago, setMetodoPago] = useState('Tarjeta');
  const [notas, setNotas] = useState('');

  // Filtros y búsqueda
  const [selectedCategoria, setSelectedCategoria] = useState('Todas');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados de retroalimentación
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [lastSuccessOrder, setLastSuccessOrder] = useState(null);

  // Categorías dinámicas
  const categorias = useMemo(() => {
    if (!productos) return ['Todas'];
    const cats = Array.from(new Set(productos.map(p => p.categoria)));
    return ['Todas', ...cats];
  }, [productos]);

  // Filtrado de productos por texto y categoría
  const productosFiltrados = useMemo(() => {
    if (!productos) return [];
    return productos.filter(p => {
      const matchCat = selectedCategoria === 'Todas' || p.categoria === selectedCategoria;
      const matchSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.descripcion && p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [productos, selectedCategoria, searchTerm]);

  // Agregar producto al carrito
  const addToCart = (producto) => {
    if (!producto.disponible) return;
    setServerError(null);
    setLastSuccessOrder(null);

    setCart(prevCart => {
      const existing = prevCart.find(item => item.producto_id === producto.id);
      if (existing) {
        return prevCart.map(item =>
          item.producto_id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [
        ...prevCart,
        {
          producto_id: producto.id,
          nombre: producto.nombre,
          precio: parseFloat(producto.precio),
          categoria: producto.categoria,
          icono: producto.icono,
          cantidad: 1,
        }
      ];
    });
  };

  // Modificar cantidad en carrito
  const updateQuantity = (productoId, delta) => {
    setCart(prevCart => {
      return prevCart
        .map(item => {
          if (item.producto_id === productoId) {
            const nuevaCantidad = item.cantidad + delta;
            return nuevaCantidad > 0 ? { ...item, cantidad: nuevaCantidad } : null;
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  // Remover item del carrito
  const removeFromCart = (productoId) => {
    setCart(prevCart => prevCart.filter(item => item.producto_id !== productoId));
  };

  // Cálculos financieros y Combo Reto Extra
  const { subtotal, comboDescuento, tieneCombo, impuesto, total } = useMemo(() => {
    let sub = 0;
    let tieneCafe = false;
    let tieneReposteria = false;

    for (const item of cart) {
      sub += item.precio * item.cantidad;
      if (item.categoria === 'Cafetería' || item.categoria === 'Bebidas Frías') tieneCafe = true;
      if (item.categoria === 'Repostería') tieneReposteria = true;
    }

    const activaCombo = tieneCafe && tieneReposteria;
    const desc = activaCombo ? Math.round(sub * 0.10 * 100) / 100 : 0;
    const base = sub - desc;
    const imp = Math.round(base * 0.13 * 100) / 100;
    const tot = Math.round((base + imp) * 100) / 100;

    return {
      subtotal: sub,
      comboDescuento: desc,
      tieneCombo: activaCombo,
      impuesto: imp,
      total: tot
    };
  }, [cart]);

  // Manejo de confirmación de pedido (Validación en cliente + Servidor con transacciones)
  const handleConfirmOrder = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      setServerError('El carrito de compras está vacío.');
      return;
    }

    setSubmitting(true);
    setServerError(null);

    const payload = {
      cliente_nombre: clienteNombre.trim() || 'Cliente Casual',
      metodo_pago: metodoPago,
      notas: notas.trim(),
      items: cart.map(item => ({
        producto_id: item.producto_id,
        cantidad: item.cantidad
      }))
    };

    try {
      const pedidoCreado = await createPedido(payload);
      setLastSuccessOrder(pedidoCreado);
      setCart([]);
      setNotas('');
      // Refrescar catálogo para recalcular disponibilidades de insumos
      refetch();
    } catch (err) {
      // Captura y muestra errores 400 y 409 del servidor
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Encabezado POS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--color-primary)' }}>Punto de Venta Cute 🌸</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Selecciona los productos para armar el pedido. El servidor valida existencias de insumos mediante transacciones.
          </p>
        </div>
        {tieneCombo && (
          <div className="cute-badge badge-pink pulse-glow" style={{ padding: '0.5rem 1rem', fontSize: '0.88rem' }}>
            <Sparkles size={16} /> ¡Combo Café + Dulce Activado! (10% OFF)
          </div>
        )}
      </div>

      {fetchError && <ErrorMessage message={fetchError} onDismiss={() => setServerError(null)} />}
      {serverError && <ErrorMessage title="No se pudo procesar la orden" message={serverError} onDismiss={() => setServerError(null)} />}

      {/* Alerta de Pedido Exitoso */}
      {lastSuccessOrder && (
        <div className="cute-alert alert-success">
          <Check size={22} style={{ flexShrink: 0 }} />
          <div>
            <strong>¡Orden #{lastSuccessOrder.id} registrada con éxito! ✨</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              Total: ₡{parseFloat(lastSuccessOrder.total).toLocaleString()} · Método: {lastSuccessOrder.metodo_pago} · Los insumos han sido descontados en la base de datos.
            </p>
          </div>
        </div>
      )}

      {/* Contenedor Principal: Menú + Carrito lateral */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.75rem', alignItems: 'start' }}>
        
        {/* COLUMNA IZQUIERDA: Catálogo de Productos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Barra de Filtros y Búsqueda */}
          <div className="cute-card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              
              {/* Pestañas de Categoría */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {categorias.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategoria(cat)}
                    className={`cute-btn ${selectedCategoria === cat ? 'cute-btn-primary' : 'cute-btn-outline'}`}
                    style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Input de Búsqueda */}
              <div style={{ position: 'relative', minWidth: '220px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input
                  type="text"
                  placeholder="Buscar delicia..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="cute-input"
                  style={{ paddingLeft: '2.2rem', paddingRight: '0.75rem', height: '38px', fontSize: '0.88rem' }}
                />
              </div>
            </div>
          </div>

          {/* Grilla de Productos */}
          {loading ? (
            <div className="cute-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <span style={{ fontSize: '2rem' }}>☕</span>
              <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>Cargando catálogo delicioso...</p>
            </div>
          ) : (
            <div className="grid-3" style={{ gap: '1.2rem' }}>
              {productosFiltrados.map(prod => (
                <div
                  key={prod.id}
                  className={`cute-card interactive ${!prod.disponible ? 'opacity-disabled' : ''}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '1.25rem',
                    position: 'relative',
                    border: prod.disponible ? '1.5px solid var(--border-subtle)' : '1.5px dashed #FECACA',
                    background: prod.disponible ? '#FFFFFF' : '#FFF9F9'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '2.2rem' }}>{prod.icono || '☕'}</span>
                      {prod.disponible ? (
                        <Badge variant="matcha">Disponible ({prod.max_preparables})</Badge>
                      ) : (
                        <Badge variant="danger">Sin Insumos</Badge>
                      )}
                    </div>

                    <h4 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>{prod.nombre}</h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem', minHeight: '36px' }}>
                      {prod.descripcion || 'Especialidad preparada al momento.'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                      ₡{parseFloat(prod.precio).toLocaleString()}
                    </span>

                    <button
                      onClick={() => addToCart(prod)}
                      disabled={!prod.disponible}
                      className="cute-btn cute-btn-primary"
                      style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
                      title={prod.disponible ? 'Agregar a orden' : 'No disponible por falta de insumos'}
                    >
                      <Plus size={16} /> Agregar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: Carrito y Cierre de Pedido */}
        <div className="cute-card" style={{ padding: '1.5rem', position: 'sticky', top: '85px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1.5px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingCart size={22} color="var(--color-primary)" />
              <h3 style={{ fontSize: '1.25rem' }}>Orden Actual</h3>
            </div>
            <Badge variant="caramel">{cart.reduce((sum, i) => sum + i.cantidad, 0)} items</Badge>
          </div>

          {/* Formulario de Pedido */}
          <form onSubmit={handleConfirmOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div className="cute-input-group" style={{ margin: 0 }}>
              <label className="cute-label">Nombre del Cliente:</label>
              <input
                type="text"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                required
                className="cute-input"
                placeholder="Ej: Sofia Ramirez"
              />
            </div>

            <div className="cute-input-group" style={{ margin: 0 }}>
              <label className="cute-label">Método de Pago:</label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="cute-select"
              >
                <option value="Tarjeta">💳 Tarjeta Débito/Crédito</option>
                <option value="Sinpe Movil">📱 Sinpe Móvil</option>
                <option value="Efectivo">💵 Efectivo</option>
                <option value="Transferencia">🏦 Transferencia</option>
              </select>
            </div>

            {/* Lista de Items en Carrito */}
            <div style={{ minHeight: '140px', maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingRight: '4px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-light)' }}>
                  <p>El carrito está vacío ☕</p>
                  <span style={{ fontSize: '0.8rem' }}>Haz click en "Agregar" en los productos del menú.</span>
                </div>
              ) : (
                cart.map(item => (
                  <div
                    key={item.producto_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.6rem',
                      background: 'var(--bg-crema)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.88rem'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{item.nombre}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        ₡{item.precio.toLocaleString()} c/u
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.producto_id, -1)}
                        className="cute-btn cute-btn-outline"
                        style={{ width: '26px', height: '26px', padding: 0 }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>
                        {item.cantidad}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.producto_id, 1)}
                        className="cute-btn cute-btn-outline"
                        style={{ width: '26px', height: '26px', padding: 0 }}
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.producto_id)}
                        className="cute-btn"
                        style={{ width: '26px', height: '26px', padding: 0, color: '#EF4444', background: 'transparent' }}
                        title="Eliminar item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="cute-input-group" style={{ margin: 0 }}>
              <input
                type="text"
                placeholder="Notas (ej: Leche deslactosada, sin azúcar)..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="cute-input"
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            {/* Resumen de Totales e Impuesto 13% */}
            <div style={{ borderTop: '1.5px dashed var(--border-subtle)', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Subtotal:</span>
                <span>₡{subtotal.toLocaleString()}</span>
              </div>

              {tieneCombo && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-pink)', fontWeight: 600 }}>
                  <span>Descuento Combo (10%):</span>
                  <span>-₡{comboDescuento.toLocaleString()}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>IVA (13%):</span>
                <span>₡{impuesto.toLocaleString()}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', marginTop: '0.2rem' }}>
                <span>Total:</span>
                <span>₡{total.toLocaleString()}</span>
              </div>
            </div>

            {/* Botón de Enviar Pedido */}
            <button
              type="submit"
              disabled={submitting || cart.length === 0}
              className="cute-btn cute-btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', marginTop: '0.5rem' }}
            >
              {submitting ? 'Procesando Transacción...' : `Cobrar ₡${total.toLocaleString()}`}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
