import React, { useState, useMemo } from 'react';
import { useFetch } from '../hooks/useFetch';
import { getInsumos, createInsumo, updateInsumo, adjustStockInsumo, deleteInsumo, getProductos } from '../services/api';
import ErrorMessage from '../components/ErrorMessage';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { Layers, Plus, Search, AlertCircle, CheckCircle, Trash2, Edit, RefreshCw, BookOpen, Package } from 'lucide-react';

export default function InventarioView() {
  const { data: insumos, loading, error, refetch } = useFetch(getInsumos);
  const { data: productos } = useFetch(getProductos);

  // Pestaña activa: 'insumos' o 'recetas'
  const [activeTab, setActiveTab] = useState('insumos');

  // Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBajoStock, setFilterBajoStock] = useState('TODOS'); // TODOS, CRITICOS, NORMALES
  const [filterUnidad, setFilterUnidad] = useState('TODAS');

  // Estados de modales y formularios controlados
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' o 'edit'
  const [selectedInsumoId, setSelectedInsumoId] = useState(null);

  // Formulario controlado para crear/editar
  const [formNombre, setFormNombre] = useState('');
  const [formUnidad, setFormUnidad] = useState('g');
  const [formStock, setFormStock] = useState('0');
  const [formStockMinimo, setFormStockMinimo] = useState('0');

  // Modal para ajuste rápido de stock
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('100');
  const [adjustTargetInsumo, setAdjustTargetInsumo] = useState(null);

  // Estados de retroalimentación
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Unidades únicas para el filtro
  const unidadesDisponibles = useMemo(() => {
    if (!insumos) return ['TODAS'];
    const units = Array.from(new Set(insumos.map(i => i.unidad)));
    return ['TODAS', ...units];
  }, [insumos]);

  // Filtrado de insumos
  const insumosFiltrados = useMemo(() => {
    if (!insumos) return [];
    return insumos.filter(i => {
      const matchName = i.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCritico = filterBajoStock === 'TODOS' ||
                           (filterBajoStock === 'CRITICOS' && i.bajo_stock === 1) ||
                           (filterBajoStock === 'NORMALES' && i.bajo_stock === 0);
      const matchUnidad = filterUnidad === 'TODAS' || i.unidad === filterUnidad;
      return matchName && matchCritico && matchUnidad;
    });
  }, [insumos, searchTerm, filterBajoStock, filterUnidad]);

  // Abrir modal de creación
  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedInsumoId(null);
    setFormNombre('');
    setFormUnidad('g');
    setFormStock('0');
    setFormStockMinimo('0');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Abrir modal de edición
  const handleOpenEdit = (insumo) => {
    setModalMode('edit');
    setSelectedInsumoId(insumo.id);
    setFormNombre(insumo.nombre);
    setFormUnidad(insumo.unidad);
    setFormStock(insumo.stock.toString());
    setFormStockMinimo(insumo.stock_minimo.toString());
    setFormError(null);
    setIsModalOpen(true);
  };

  // Enviar formulario (crear o editar)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    // Validación en el cliente
    if (!formNombre.trim()) {
      setFormError('El nombre del insumo es obligatorio.');
      return;
    }
    if (parseFloat(formStock) < 0 || parseFloat(formStockMinimo) < 0) {
      setFormError('Los valores de stock y stock mínimo no pueden ser negativos.');
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        await createInsumo({
          nombre: formNombre,
          unidad: formUnidad,
          stock: parseFloat(formStock),
          stock_minimo: parseFloat(formStockMinimo),
        });
        setFormSuccess(`Insumo "${formNombre}" creado con éxito.`);
      } else {
        await updateInsumo(selectedInsumoId, {
          nombre: formNombre,
          unidad: formUnidad,
          stock: parseFloat(formStock),
          stock_minimo: parseFloat(formStockMinimo),
        });
        setFormSuccess(`Insumo "${formNombre}" actualizado.`);
      }
      setIsModalOpen(false);
      refetch();
    } catch (err) {
      // Muestra errores 400 devueltos por el servidor
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Ajuste rápido de stock (+ / -)
  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!adjustTargetInsumo) return;
    setFormError(null);
    setSubmitting(true);

    try {
      await adjustStockInsumo(adjustTargetInsumo.id, parseFloat(adjustAmount));
      setFormSuccess(`Stock de ${adjustTargetInsumo.nombre} ajustado en ${adjustAmount} ${adjustTargetInsumo.unidad}.`);
      setIsAdjustModalOpen(false);
      refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Eliminar insumo con prueba de 409 si está en recetas
  const handleDeleteInsumo = async (insumo) => {
    if (!window.confirm(`¿Intentar eliminar el insumo "${insumo.nombre}"? Si está en uso en recetas, la API rechazará con HTTP 409.`)) {
      return;
    }
    setFormError(null);
    setFormSuccess(null);

    try {
      await deleteInsumo(insumo.id);
      setFormSuccess(`Insumo "${insumo.nombre}" eliminado correctamente.`);
      refetch();
    } catch (err) {
      // Muestra el conflicto 409 devuelto por la API
      setFormError(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--color-primary)' }}>Inventario & Recetas 🥐</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Control de materia prima, stock mínimo de seguridad y fórmulas de elaboración.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => refetch()} className="cute-btn cute-btn-outline">
            <RefreshCw size={16} /> Refrescar
          </button>
          <button onClick={handleOpenCreate} className="cute-btn cute-btn-primary">
            <Plus size={16} /> Nuevo Insumo
          </button>
        </div>
      </div>

      {/* Selector de Pestañas: Insumos vs Recetas */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('insumos')}
          className={`cute-btn ${activeTab === 'insumos' ? 'cute-btn-primary' : 'cute-btn-outline'}`}
          style={{ padding: '0.5rem 1.25rem' }}
        >
          <Package size={16} /> Insumos & Materia Prima ({insumos ? insumos.length : 0})
        </button>
        <button
          onClick={() => setActiveTab('recetas')}
          className={`cute-btn ${activeTab === 'recetas' ? 'cute-btn-primary' : 'cute-btn-outline'}`}
          style={{ padding: '0.5rem 1.25rem' }}
        >
          <BookOpen size={16} /> Explorador de Recetas ({productos ? productos.length : 0})
        </button>
      </div>

      {error && <ErrorMessage message={error} />}
      {formError && <ErrorMessage title="Validación / Conflicto (400 / 409)" message={formError} onDismiss={() => setFormError(null)} />}
      {formSuccess && (
        <div className="cute-alert alert-success">
          <CheckCircle size={20} />
          <span>{formSuccess}</span>
        </div>
      )}

      {/* PESTAÑA 1: INSUMOS */}
      {activeTab === 'insumos' && (
        <>
          {/* Barra de Filtros y Búsqueda */}
          <div className="cute-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'end' }}>
              
              <div className="cute-input-group" style={{ margin: 0 }}>
                <label className="cute-label">Buscar Insumo:</label>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                  <input
                    type="text"
                    placeholder="Café, Leche, Té Matcha..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="cute-input"
                    style={{ paddingLeft: '2.2rem' }}
                  />
                </div>
              </div>

              <div className="cute-input-group" style={{ margin: 0 }}>
                <label className="cute-label">Estado de Stock:</label>
                <select
                  value={filterBajoStock}
                  onChange={(e) => setFilterBajoStock(e.target.value)}
                  className="cute-select"
                >
                  <option value="TODOS">Todos los Niveles</option>
                  <option value="CRITICOS">⚠️ Bajo Stock (Menor o igual al mínimo)</option>
                  <option value="NORMALES">✅ Stock Seguro</option>
                </select>
              </div>

              <div className="cute-input-group" style={{ margin: 0 }}>
                <label className="cute-label">Unidad de Medida:</label>
                <select
                  value={filterUnidad}
                  onChange={(e) => setFilterUnidad(e.target.value)}
                  className="cute-select"
                >
                  {unidadesDisponibles.map(u => (
                    <option key={u} value={u}>{u === 'TODAS' ? 'Todas las unidades' : u}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* Tabla de Insumos */}
          <div className="cute-card" style={{ padding: '0', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <Layers size={32} style={{ marginBottom: '0.5rem', opacity: 0.6 }} />
                <p>Consultando inventario de insumos...</p>
              </div>
            ) : insumosFiltrados.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)' }}>
                <p>No se encontraron insumos con los filtros seleccionados.</p>
              </div>
            ) : (
              <div className="cute-table-container" style={{ border: 'none' }}>
                <table className="cute-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Insumo</th>
                      <th>Unidad</th>
                      <th>Stock Actual</th>
                      <th>Stock Mínimo</th>
                      <th>Estado</th>
                      <th style={{ textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insumosFiltrados.map(ins => {
                      const esCritico = ins.bajo_stock === 1;
                      const porcentaje = ins.stock_minimo > 0 ? (ins.stock / ins.stock_minimo) * 100 : 100;

                      return (
                        <tr key={ins.id} style={{ background: esCritico ? '#FFF8F8' : '#FFFFFF' }}>
                          <td>#{ins.id}</td>
                          <td>
                            <strong>{ins.nombre}</strong>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{ins.unidad}</span>
                          </td>
                          <td>
                            <strong style={{ fontSize: '1.05rem', color: esCritico ? '#DC2626' : 'var(--text-main)' }}>
                              {parseFloat(ins.stock).toLocaleString()}
                            </strong>
                          </td>
                          <td>{parseFloat(ins.stock_minimo).toLocaleString()}</td>
                          <td>
                            {esCritico ? (
                              <Badge variant="danger" icon={<AlertCircle size={12} />}>
                                Crítico ({Math.round(porcentaje)}%)
                              </Badge>
                            ) : (
                              <Badge variant="matcha">Normal</Badge>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                              <button
                                onClick={() => {
                                  setAdjustTargetInsumo(ins);
                                  setAdjustAmount('100');
                                  setIsAdjustModalOpen(true);
                                }}
                                className="cute-btn cute-btn-outline"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                                title="Añadir stock rápido"
                              >
                                + Reabastecer
                              </button>
                              <button
                                onClick={() => handleOpenEdit(ins)}
                                className="cute-btn cute-btn-outline"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                                title="Editar insumo"
                              >
                                <Edit size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteInsumo(ins)}
                                className="cute-btn"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', background: '#FEE2E2', color: '#DC2626' }}
                                title="Eliminar (Rechazará 409 si está en receta)"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* PESTAÑA 2: EXPLORADOR DE RECETAS */}
      {activeTab === 'recetas' && (
        <div className="grid-2">
          {productos && productos.map(prod => (
            <div key={prod.id} className="cute-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '2rem' }}>{prod.icono || '☕'}</span>
                  <div>
                    <h4 style={{ fontSize: '1.15rem' }}>{prod.nombre}</h4>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Categoría: {prod.categoria}</span>
                  </div>
                </div>
                <Badge variant={prod.disponible ? 'matcha' : 'danger'}>
                  {prod.disponible ? `Puede preparar: ${prod.max_preparables}` : 'Sin stock de insumos'}
                </Badge>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Fórmula e Insumos requeridos por porción:
                </span>
                
                {prod.faltantes && prod.faltantes.length > 0 && (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#FEF2F2', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: '#991B1B' }}>
                    ⚠️ Insumo deficitario: {prod.faltantes.map(f => `${f.insumo} (Faltan ${(f.requerido - f.disponible).toFixed(1)} ${f.unidad})`).join(', ')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Controlado: Crear / Editar Insumo */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Crear Nuevo Insumo Cute ✨' : `Editar Insumo #${selectedInsumoId}`}
      >
        <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div className="cute-input-group" style={{ margin: 0 }}>
            <label className="cute-label">Nombre del Insumo:</label>
            <input
              type="text"
              value={formNombre}
              onChange={(e) => setFormNombre(e.target.value)}
              placeholder="Ej: Sirop de Lavanda, Chocolate Blanco..."
              required
              className="cute-input"
            />
          </div>

          <div className="cute-input-group" style={{ margin: 0 }}>
            <label className="cute-label">Unidad de Medida:</label>
            <select
              value={formUnidad}
              onChange={(e) => setFormUnidad(e.target.value)}
              className="cute-select"
            >
              <option value="g">Gramos (g)</option>
              <option value="ml">Mililitros (ml)</option>
              <option value="unidades">Unidades (piezas/vasos)</option>
              <option value="shots">Shots</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="cute-input-group" style={{ margin: 0 }}>
              <label className="cute-label">Stock Actual:</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formStock}
                onChange={(e) => setFormStock(e.target.value)}
                required
                className="cute-input"
              />
            </div>

            <div className="cute-input-group" style={{ margin: 0 }}>
              <label className="cute-label">Stock Mínimo (Alerta):</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formStockMinimo}
                onChange={(e) => setFormStockMinimo(e.target.value)}
                required
                className="cute-input"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="cute-btn cute-btn-outline"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="cute-btn cute-btn-primary"
            >
              {submitting ? 'Guardando...' : (modalMode === 'create' ? 'Crear Insumo' : 'Guardar Cambios')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Ajuste Rápido de Stock */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title={`Reabastecer ${adjustTargetInsumo?.nombre || ''}`}
        maxWidth="450px"
      >
        <form onSubmit={handleAdjustStock} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Ingresa la cantidad a sumar al inventario actual ({adjustTargetInsumo?.stock} {adjustTargetInsumo?.unidad}):
          </p>

          <div className="cute-input-group" style={{ margin: 0 }}>
            <label className="cute-label">Cantidad a ingresar ({adjustTargetInsumo?.unidad}):</label>
            <input
              type="number"
              step="0.01"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              required
              className="cute-input"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setIsAdjustModalOpen(false)}
              className="cute-btn cute-btn-outline"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="cute-btn cute-btn-primary"
            >
              {submitting ? 'Actualizando...' : 'Confirmar Reingreso'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
