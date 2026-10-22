import React from 'react';
import { useFetch } from '../hooks/useFetch';
import { getResumen } from '../services/api';
import MetricCard from '../components/MetricCard';
import ErrorMessage from '../components/ErrorMessage';
import Badge from '../components/Badge';
import { DollarSign, ShoppingBag, Receipt, Percent, RefreshCw, Trophy, AlertTriangle, CreditCard, PieChart } from 'lucide-react';

export default function MetricasView() {
  const { data: resumen, loading, error, refetch } = useFetch(getResumen);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        <p style={{ fontSize: '1.2rem' }}>Calculando indicadores de caja con SQL...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <ErrorMessage message={error} />
        <button onClick={() => refetch()} className="cute-btn cute-btn-primary" style={{ marginTop: '1rem' }}>
          Reintentar
        </button>
      </div>
    );
  }

  const { cierre_caja, ventas_por_metodo_pago = [], top_5_productos = [], insumos_criticos = [], ventas_por_categoria = [] } = resumen || {};
  const totalIngresos = cierre_caja?.total_ingresos || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--color-primary)' }}>Cierre de Caja & Métricas 📊</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Indicadores de ventas consolidados en tiempo real mediante consultas SQL (SUM, COUNT, GROUP BY).
          </p>
        </div>

        <button onClick={() => refetch()} className="cute-btn cute-btn-outline" style={{ gap: '0.4rem' }}>
          <RefreshCw size={16} /> Actualizar Datos
        </button>
      </div>

      {/* Tarjetas Principales de Indicadores */}
      <div className="grid-4">
        <MetricCard
          title="TOTAL INGRESOS (DÍA)"
          value={`₡${totalIngresos.toLocaleString()}`}
          subtitle={`${cierre_caja?.pedidos_confirmados || 0} órdenes confirmadas`}
          icon={DollarSign}
          color="matcha"
        />

        <MetricCard
          title="PEDIDOS ATENDIDOS"
          value={cierre_caja?.pedidos_confirmados || 0}
          subtitle={`${cierre_caja?.pedidos_anulados || 0} cancelados`}
          icon={ShoppingBag}
          color="coffee"
          badge="100% Auditado"
        />

        <MetricCard
          title="IMPUESTO IVA (13%)"
          value={`₡${(cierre_caja?.total_impuesto || 0).toLocaleString()}`}
          subtitle="Declaración tributaria"
          icon={Receipt}
          color="caramel"
        />

        <MetricCard
          title="AHORRO EN COMBOS"
          value={`₡${(cierre_caja?.total_descuentos || 0).toLocaleString()}`}
          subtitle="Descuentos 10% fidelización"
          icon={Percent}
          color="pink"
        />
      </div>

      {/* Cierre de Caja por Método de Pago & Ventas por Categoría */}
      <div className="grid-2">
        
        {/* Desglose por Método de Pago */}
        <div className="cute-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={20} color="var(--color-primary)" />
              <h3 style={{ fontSize: '1.2rem' }}>Cierre por Método de Pago</h3>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SQL GROUP BY</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {ventas_por_metodo_pago.map(v => {
              const porcentaje = totalIngresos > 0 ? (v.total_monto / totalIngresos) * 100 : 0;
              return (
                <div key={v.metodo_pago} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong>{v.metodo_pago}</strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        ({v.cantidad_transacciones} transacciones)
                      </span>
                    </div>
                    <strong>₡{v.total_monto.toLocaleString()} ({porcentaje.toFixed(1)}%)</strong>
                  </div>

                  {/* Barra de progreso visual */}
                  <div style={{ height: '8px', background: 'var(--bg-crema)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${porcentaje}%`,
                        background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-caramel) 100%)',
                        borderRadius: '999px',
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ventas por Categoría de Producto */}
        <div className="cute-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PieChart size={20} color="var(--color-primary)" />
              <h3 style={{ fontSize: '1.2rem' }}>Ventas por Categoría</h3>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Desglose</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {ventas_por_categoria.map(c => {
              const porcentaje = totalIngresos > 0 ? (c.total_ingresos / totalIngresos) * 100 : 0;
              return (
                <div key={c.categoria} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong>{c.categoria}</strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        ({c.unidades_vendidas} unidades)
                      </span>
                    </div>
                    <strong>₡{c.total_ingresos.toLocaleString()} ({porcentaje.toFixed(1)}%)</strong>
                  </div>

                  <div style={{ height: '8px', background: 'var(--bg-crema)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${porcentaje}%`,
                        background: 'linear-gradient(90deg, #E85D88 0%, #F59E0B 100%)',
                        borderRadius: '999px',
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Top 5 Productos Más Vendidos */}
      <div className="cute-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Trophy size={22} color="#D97706" />
            <h3 style={{ fontSize: '1.25rem' }}>Top 5 Productos Más Vendidos</h3>
          </div>
          <Badge variant="caramel">Ranking de Preferencia</Badge>
        </div>

        <div className="grid-5" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {top_5_productos.map((prod, index) => {
            const medallas = ['🥇', '🥈', '🥉', '✨', '🌸'];
            return (
              <div
                key={prod.id}
                style={{
                  background: index === 0 ? 'var(--bg-soft-caramel)' : '#FFFFFF',
                  border: index === 0 ? '1.5px solid #FDE68A' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.5rem' }}>{medallas[index]}</span>
                  <span style={{ fontSize: '1.6rem' }}>{prod.icono || '☕'}</span>
                </div>

                <h4 style={{ fontSize: '1rem', marginTop: '0.2rem' }}>{prod.nombre}</h4>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{prod.categoria}</div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                    {prod.unidades_vendidas} vendidos
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    ₡{prod.total_recaudado.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alerta de Insumos Críticos Detectados por SQL */}
      {insumos_criticos.length > 0 && (
        <div className="cute-card" style={{ border: '1.5px solid #FECACA', background: '#FFF9F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#DC2626', marginBottom: '0.75rem' }}>
            <AlertTriangle size={22} />
            <h3 style={{ fontSize: '1.2rem', color: '#DC2626' }}>
              Atención: {insumos_criticos.length} Insumos por Debajo del Mínimo
            </h3>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            El sistema ha detectado ingredientes en nivel de riesgo operativo que pueden bloquear pedidos en el POS.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {insumos_criticos.map(i => (
              <div
                key={i.id}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #FECACA',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.6rem 0.9rem',
                  fontSize: '0.85rem',
                }}
              >
                <strong>{i.nombre}:</strong> {i.stock_actual} / {i.stock_minimo} {i.unidad}{' '}
                <span style={{ color: '#DC2626', fontWeight: 600 }}>(Faltan {i.deficit} {i.unidad})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
