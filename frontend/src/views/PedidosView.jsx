import React, { useState, useMemo } from 'react';
import { useFetch } from '../hooks/useFetch';
import { getPedidos, getPedido, anularPedido } from '../services/api';
import ErrorMessage from '../components/ErrorMessage';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { ShoppingBag, Search, Clock, AlertTriangle, CheckCircle, XCircle, Eye, RefreshCw } from 'lucide-react';

export default function PedidosView() {
  const { data: pedidos, loading, error, refetch } = useFetch(getPedidos);

  // Estados de filtros, búsqueda y ordenamiento
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('TODOS');
  const [filterMetodo, setFilterMetodo] = useState('TODOS');
  const [sortBy, setSortBy] = useState('fecha_desc'); // fecha_desc, fecha_asc, total_desc, total_asc

  // Modal de Detalle
  const [selectedPedidoId, setSelectedPedidoId] = useState(null);
  const [pedidoDetalle, setPedidoDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // Modal y Proceso de Anulación
  const [anulando, setAnulando] = useState(false);
  const [motivoAnulacion, setMotivoAnulacion] = useState('Cliente solicitó cancelar orden');
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Cargar detalle de pedido
  const handleOpenDetalle = async (id) => {
    setSelectedPedidoId(id);
    setLoadingDetalle(true);
    setActionError(null);
    try {
      const data = await getPedido(id);
      setPedidoDetalle(data);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setLoadingDetalle(false);
    }
  };

  // Ejecutar anulación con validación de 15 minutos en servidor
  const handleAnularPedido = async (id) => {
    if (!window.confirm(`¿Estás seguro de anular el pedido #${id}? Esta acción reintegrará los insumos al inventario dentro de una transacción.`)) {
      return;
    }

    setAnulando(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await anularPedido(id, motivoAnulacion);
      setActionSuccess(res.message);
      // Actualizar detalle abierto
      setPedidoDetalle(res.pedido);
      // Refrescar lista general
      refetch();
    } catch (err) {
      // Muestra el error 409 con el detalle del tiempo transcurrido
      setActionError(err.message);
    } finally {
      setAnulando(false);
    }
  };

  // Filtrado y ordenamiento de pedidos
  const pedidosProcesados = useMemo(() => {
    if (!pedidos) return [];

    return pedidos
      .filter(p => {
        const matchSearch = p.id.toString().includes(searchTerm) ||
                            (p.cliente_nombre && p.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchEstado = filterEstado === 'TODOS' || p.estado === filterEstado;
        const matchMetodo = filterMetodo === 'TODOS' || p.metodo_pago === filterMetodo;
        return matchSearch && matchEstado && matchMetodo;
      })
      .sort((a, b) => {
        if (sortBy === 'fecha_desc') return new Date(b.fecha) - new Date(a.fecha);
        if (sortBy === 'fecha_asc') return new Date(a.fecha) - new Date(b.fecha);
        if (sortBy === 'total_desc') return parseFloat(b.total) - parseFloat(a.total);
        if (sortBy === 'total_asc') return parseFloat(a.total) - parseFloat(b.total);
        return 0;
      });
  }, [pedidos, searchTerm, filterEstado, filterMetodo, sortBy]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--color-primary)' }}>Historial de Pedidos 📋</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Auditoría de ventas realizadas, detalle de items con precios históricos y anulación regulada a 15 minutos.
          </p>
        </div>

        <button onClick={() => refetch()} className="cute-btn cute-btn-outline" style={{ gap: '0.4rem' }}>
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>

      {error && <ErrorMessage message={error} />}
      {actionError && <ErrorMessage title="Conflicto en Regla de Negocio (409)" message={actionError} onDismiss={() => setActionError(null)} />}
      {actionSuccess && (
        <div className="cute-alert alert-success">
          <CheckCircle size={20} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Barra de Filtros, Búsqueda y Ordenamiento */}
      <div className="cute-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          
          {/* Búsqueda */}
          <div className="cute-input-group" style={{ margin: 0 }}>
            <label className="cute-label">Buscar Orden o Cliente:</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input
                type="text"
                placeholder="ID o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="cute-input"
                style={{ paddingLeft: '2.2rem' }}
              />
            </div>
          </div>

          {/* Filtro por Estado */}
          <div className="cute-input-group" style={{ margin: 0 }}>
            <label className="cute-label">Estado:</label>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="cute-select"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="CONFIRMADO">Confirmados</option>
              <option value="ANULADO">Anulados</option>
            </select>
          </div>

          {/* Filtro por Método de Pago */}
          <div className="cute-input-group" style={{ margin: 0 }}>
            <label className="cute-label">Método de Pago:</label>
            <select
              value={filterMetodo}
              onChange={(e) => setFilterMetodo(e.target.value)}
              className="cute-select"
            >
              <option value="TODOS">Todos los Métodos</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Sinpe Movil">Sinpe Móvil</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
            </select>
          </div>

          {/* Criterio de Ordenamiento */}
          <div className="cute-input-group" style={{ margin: 0 }}>
            <label className="cute-label">Ordenar Por:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="cute-select"
            >
              <option value="fecha_desc">Fecha (Más recientes primero)</option>
              <option value="fecha_asc">Fecha (Más antiguas primero)</option>
              <option value="total_desc">Total (Mayor a menor)</option>
              <option value="total_asc">Total (Menor a mayor)</option>
            </select>
          </div>

        </div>
      </div>

      {/* Tabla de Pedidos */}
      <div className="cute-card" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <ShoppingBag size={32} style={{ marginBottom: '0.5rem', opacity: 0.6 }} />
            <p>Consultando pedidos registrados...</p>
          </div>
        ) : pedidosProcesados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)' }}>
            <p>No se encontraron pedidos con los filtros aplicados.</p>
          </div>
        ) : (
          <div className="cute-table-container" style={{ border: 'none' }}>
            <table className="cute-table">
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Fecha & Hora</th>
                  <th>Cliente</th>
                  <th>Método de Pago</th>
                  <th>Items</th>
                  <th>Total (IVA 13%)</th>
                  <th>Estado</th>
                  <th>Regla 15 Min</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pedidosProcesados.map(p => (
                  <tr key={p.id}>
                    <td>
                      <strong style={{ color: 'var(--color-primary)' }}>#{p.id}</strong>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem' }}>
                        {new Date(p.fecha).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </td>
                    <td>{p.cliente_nombre || 'Cliente Casual'}</td>
                    <td>
                      <Badge variant="coffee">{p.metodo_pago}</Badge>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                        {p.total_unidades || p.total_items || 1} uds.
                      </span>
                    </td>
                    <td>
                      <strong style={{ fontSize: '0.98rem' }}>₡{parseFloat(p.total).toLocaleString()}</strong>
                    </td>
                    <td>
                      {p.estado === 'CONFIRMADO' ? (
                        <Badge variant="matcha" icon={<CheckCircle size={12} />}>CONFIRMADO</Badge>
                      ) : (
                        <Badge variant="danger" icon={<XCircle size={12} />}>ANULADO</Badge>
                      )}
                    </td>
                    <td>
                      {p.estado === 'ANULADO' ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>-</span>
                      ) : p.cancelable ? (
                        <span className="cute-badge badge-caramel" style={{ fontSize: '0.75rem' }}>
                          <Clock size={12} /> {p.minutos_restantes_anulacion} min restantes
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>
                          Expiró (&gt;15 min)
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => handleOpenDetalle(p.id)}
                        className="cute-btn cute-btn-outline"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
                      >
                        <Eye size={14} /> Ver Detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalle de Pedido (GET /api/pedidos/:id con datos relacionados) */}
      <Modal
        isOpen={Boolean(selectedPedidoId)}
        onClose={() => { setSelectedPedidoId(null); setPedidoDetalle(null); }}
        title={`Detalle de Pedido #${selectedPedidoId || ''}`}
        maxWidth="620px"
      >
        {loadingDetalle || !pedidoDetalle ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando datos del pedido...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Cabecera del pedido */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'var(--bg-crema)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '2px' }}>{pedidoDetalle.cliente_nombre}</h4>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Fecha: {new Date(pedidoDetalle.fecha).toLocaleString()}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Método de Pago: <strong>{pedidoDetalle.metodo_pago}</strong>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {pedidoDetalle.estado === 'CONFIRMADO' ? (
                  <Badge variant="matcha">CONFIRMADO</Badge>
                ) : (
                  <Badge variant="danger">ANULADO</Badge>
                )}
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {pedidoDetalle.cancelable 
                    ? `⏱️ Quedan ${pedidoDetalle.minutos_restantes_anulacion} min para anular`
                    : `Tiempo transcurrido: ${pedidoDetalle.minutos_transcurridos} min`
                  }
                </div>
              </div>
            </div>

            {/* Lista de Items con precios históricos */}
            <div>
              <h5 style={{ fontSize: '0.95rem', marginBottom: '0.6rem', color: 'var(--text-muted)' }}>
                PRODUCTOS ORDENADOS (PRECIO HISTÓRICO)
              </h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {pedidoDetalle.items && pedidoDetalle.items.map(item => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.65rem 0.85rem',
                      background: '#FFFFFF',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontSize: '1.3rem' }}>{item.producto_icono || '☕'}</span>
                      <div>
                        <strong>{item.producto_nombre}</strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {item.cantidad} × ₡{parseFloat(item.precio_unitario).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <strong style={{ color: 'var(--color-primary)' }}>
                      ₡{parseFloat(item.subtotal_item).toLocaleString()}
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Desglose de Totales */}
            <div style={{ borderTop: '1.5px dashed var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.92rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Subtotal:</span>
                <span>₡{parseFloat(pedidoDetalle.subtotal).toLocaleString()}</span>
              </div>
              {parseFloat(pedidoDetalle.descuento) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-pink)' }}>
                  <span>Descuento de Combo:</span>
                  <span>-₡{parseFloat(pedidoDetalle.descuento).toLocaleString()}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>IVA (13%):</span>
                <span>₡{parseFloat(pedidoDetalle.impuesto).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
                <span>Total Cobrado:</span>
                <span>₡{parseFloat(pedidoDetalle.total).toLocaleString()}</span>
              </div>
            </div>

            {pedidoDetalle.notas && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'var(--bg-crema)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)' }}>
                <strong>Notas:</strong> {pedidoDetalle.notas}
              </div>
            )}

            {/* Zona de Anulación (Regla 15 minutos) */}
            {pedidoDetalle.estado === 'CONFIRMADO' && (
              <div style={{ borderTop: '1.5px solid var(--border-subtle)', paddingTop: '1rem' }}>
                {pedidoDetalle.cancelable ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-caramel)', fontSize: '0.85rem' }}>
                      <AlertTriangle size={18} />
                      <span>El pedido está dentro del límite de 15 minutos para ser anulado.</span>
                    </div>

                    <div className="cute-input-group" style={{ margin: 0 }}>
                      <input
                        type="text"
                        placeholder="Motivo de anulación..."
                        value={motivoAnulacion}
                        onChange={(e) => setMotivoAnulacion(e.target.value)}
                        className="cute-input"
                        style={{ fontSize: '0.88rem' }}
                      />
                    </div>

                    <button
                      onClick={() => handleAnularPedido(pedidoDetalle.id)}
                      disabled={anulando}
                      className="cute-btn cute-btn-danger"
                      style={{ width: '100%' }}
                    >
                      {anulando ? 'Anulando y reintegrando stock...' : 'Anular Pedido y Devolver Insumos (Transacción)'}
                    </button>
                  </div>
                ) : (
                  <div style={{ background: '#F3F4F6', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    🔒 Han transcurrido más de 15 minutos desde su emisión ({pedidoDetalle.minutos_transcurridos} min). El servidor rechazará cualquier anulación con código 409.
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </Modal>
    </div>
  );
}
