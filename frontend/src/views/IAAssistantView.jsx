import React, { useState } from 'react';
import { getSugerenciaIA, adjustStockInsumo } from '../services/api';
import ErrorMessage from '../components/ErrorMessage';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { Sparkles, Bot, CheckCircle, RefreshCw, AlertCircle, ShoppingCart, Download, ExternalLink, Code2 } from 'lucide-react';

export default function IAAssistantView() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resultadoIA, setResultadoIA] = useState(null);
  const [aplicandoInsumoId, setAplicandoInsumoId] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);
  const [isN8nInfoModalOpen, setIsN8nInfoModalOpen] = useState(false);

  // Ejecuta la llamada al webhook del agente de IA
  const handleEjecutarAnalisis = async () => {
    setLoading(true);
    setError(null);
    setMensajeExito(null);

    try {
      const response = await getSugerenciaIA();
      if (!response.ok) {
        throw new Error(response.error || 'El agente de IA no pudo completar el análisis.');
      }
      setResultadoIA(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reabastecer automáticamente el insumo con la cantidad sugerida por la IA
  const handleAplicarSugerencia = async (item) => {
    setAplicandoInsumoId(item.insumo_id);
    setError(null);
    try {
      await adjustStockInsumo(item.insumo_id, item.cantidad_sugerida);
      setMensajeExito(`¡Se reabasteció exitosamente "${item.nombre}" con +${item.cantidad_sugerida} ${item.unidad}!`);
      
      // Actualizar el item localmente para reflejar que ya fue ordenado/recibido
      setResultadoIA(prev => {
        if (!prev || !prev.data) return prev;
        return {
          ...prev,
          data: {
            ...prev.data,
            recomendaciones: prev.data.recomendaciones.filter(r => r.insumo_id !== item.insumo_id)
          }
        };
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setAplicandoInsumoId(null);
    }
  };

  // Descargar el JSON del workflow de n8n
  const handleDescargarWorkflow = () => {
    fetch('/n8n_workflow.json')
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'workflow_sugerencia_compras.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(() => {
        window.open('/n8n_workflow.json', '_blank');
      });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Encabezado con estética Barista IA */}
      <div
        className="cute-card"
        style={{
          background: 'linear-gradient(135deg, #FFF0F5 0%, #FAF5EF 100%)',
          border: '1.5px solid #F8BBD0',
          padding: '2rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: '780px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '2.5rem' }}>🤖🌸</span>
            <div>
              <h2 style={{ fontSize: '1.9rem', color: '#B91C1C', lineHeight: 1.1 }}>
                Komorebi Barista Intelligence
              </h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                AGENTE DE IA EN N8N · REABASTECIMIENTO & VENTAS PREDICTIVAS
              </span>
            </div>
          </div>

          <p style={{ color: 'var(--text-main)', fontSize: '0.98rem', lineHeight: 1.5, marginTop: '0.75rem' }}>
            Este agente inteligente analiza en tiempo real los insumos que están por debajo del mínimo de seguridad junto con el historial de pedidos de la semana. Mediante un modelo LLM, redacta una orden de compra optimizada con cantidades matemáticamente justificadas para evitar que el café se quede sin productos estrella.
          </p>

          <div style={{ display: 'flex', gap: '0.85rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleEjecutarAnalisis}
              disabled={loading}
              className="cute-btn cute-btn-pink pulse-glow"
              style={{ padding: '0.75rem 1.6rem', fontSize: '1rem', fontWeight: 700 }}
            >
              <Sparkles size={18} />
              {loading ? 'Consultando Agente de IA...' : 'Ejecutar Análisis con IA'}
            </button>

            <button
              onClick={() => setIsN8nInfoModalOpen(true)}
              className="cute-btn cute-btn-outline"
            >
              <Code2 size={16} /> Ver Contrato JSON y Workflow n8n
            </button>
          </div>
        </div>
      </div>

      {error && <ErrorMessage title="Error en el Agente de IA" message={error} onDismiss={() => setError(null)} />}
      {mensajeExito && (
        <div className="cute-alert alert-success">
          <CheckCircle size={20} />
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* Estado Cargando */}
      {loading && (
        <div className="cute-card" style={{ textAlign: 'center', padding: '3.5rem' }}>
          <div className="pulse-glow" style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            ✨☕✨
          </div>
          <h3 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
            El Agente de IA está analizando los déficits...
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            Evaluando recetas de Cappuccino, Matcha Latte, Vasos 16oz y velocidad de consumo.
          </p>
        </div>
      )}

      {/* Resultados del Análisis de IA */}
      {resultadoIA && resultadoIA.data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.4s ease' }}>
          
          {/* Tarjeta de Resumen Ejecutivo */}
          <div className="cute-card" style={{ borderLeft: '5px solid var(--color-pink)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bot size={22} color="var(--color-pink)" />
                <h3 style={{ fontSize: '1.25rem' }}>Diagnóstico y Dictamen del Agente</h3>
              </div>
              <Badge variant="pink">
                Fuente: {resultadoIA.fuente === 'n8n_live_agent' ? 'n8n Live Webhook' : 'Asistente Heurístico (Fallback Activo)'}
              </Badge>
            </div>

            <p style={{ fontSize: '0.96rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
              {resultadoIA.data.resumen_ejecutivo}
            </p>

            {resultadoIA.data.analisis_ia && (
              <div style={{ marginTop: '0.75rem', padding: '0.85rem', background: 'var(--bg-crema)', borderRadius: 'var(--radius-sm)', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                <strong>Observaciones operativas:</strong> {resultadoIA.data.analisis_ia}
              </div>
            )}
          </div>

          {/* Tarjetas de Recomendaciones Específicas por Insumo */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.35rem', color: 'var(--color-primary)' }}>
                Sugerencias de Compra Justificadas ({resultadoIA.data.recomendaciones.length})
              </h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Déficit + Cobertura estimada de 7 días
              </span>
            </div>

            {resultadoIA.data.recomendaciones.length === 0 ? (
              <div className="cute-card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-matcha)' }}>
                <CheckCircle size={36} style={{ marginBottom: '0.5rem' }} />
                <h4>¡Todo el inventario está en niveles óptimos!</h4>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  No hay insumos por debajo del stock mínimo en este momento.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {resultadoIA.data.recomendaciones.map((rec, index) => {
                  const esCritico = rec.urgencia === 'Crítica';

                  return (
                    <div
                      key={rec.insumo_id || index}
                      className="cute-card"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.85rem',
                        borderLeft: esCritico ? '5px solid #EF4444' : '5px solid #F59E0B',
                        padding: '1.25rem 1.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <h4 style={{ fontSize: '1.2rem' }}>{rec.nombre}</h4>
                            <Badge variant={esCritico ? 'danger' : 'caramel'}>
                              Urgencia {rec.urgencia}
                            </Badge>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Stock actual: <strong>{rec.stock_actual} {rec.unidad}</strong> · Mínimo requerido: {rec.stock_minimo} {rec.unidad}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            Cantidad sugerida a comprar:
                          </span>
                          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                            +{rec.cantidad_sugerida} {rec.unidad}
                          </div>
                        </div>
                      </div>

                      <div style={{ background: 'var(--bg-crema)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.45 }}>
                        <strong>🧠 Justificación del Agente IA:</strong> {rec.justificacion}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.2rem' }}>
                        <button
                          onClick={() => handleAplicarSugerencia(rec)}
                          disabled={aplicandoInsumoId === rec.insumo_id}
                          className="cute-btn cute-btn-matcha"
                          style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                        >
                          <ShoppingCart size={15} />
                          {aplicandoInsumoId === rec.insumo_id ? 'Actualizando stock...' : 'Ingresar al Inventario (+)'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Modal Informativo de n8n y Contrato JSON */}
      <Modal
        isOpen={isN8nInfoModalOpen}
        onClose={() => setIsN8nInfoModalOpen(false)}
        title="Integración n8n AI Agent & Contrato JSON"
        maxWidth="680px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
          <p>
            El sistema se comunica con el workflow de n8n a través del endpoint Webhook POST:
            <br />
            <code>http://localhost:5678/webhook/sugerencia-compras</code>
          </p>

          <h5 style={{ color: 'var(--color-primary)' }}>Contrato de Respuesta Exigido en el Laboratorio:</h5>
          <pre
            style={{
              background: '#2D2B2A',
              color: '#F8F8F2',
              padding: '0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              overflowX: 'auto',
            }}
          >
{`{
  "ok": true,
  "data": {
    "fecha_analisis": "2026-10-22T...",
    "resumen_ejecutivo": "...",
    "recomendaciones": [
      {
        "insumo_id": 4,
        "nombre": "Té Matcha Ceremonial Uji",
        "unidad": "g",
        "stock_actual": 180,
        "stock_minimo": 300,
        "cantidad_sugerida": 570,
        "urgencia": "Crítica",
        "justificacion": "..."
      }
    ]
  },
  "error": null
}`}
          </pre>

          <h5 style={{ color: 'var(--color-primary)' }}>Workflow Exportado para Entrega:</h5>
          <p style={{ color: 'var(--text-muted)' }}>
            El archivo <code>n8n/workflow_sugerencia_compras.json</code> está incluido en el repositorio listo para ser importado en n8n mediante <em>Workflow &gt; Import from File</em> sin credenciales.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button onClick={handleDescargarWorkflow} className="cute-btn cute-btn-primary">
              <Download size={16} /> Descargar JSON del Workflow
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
