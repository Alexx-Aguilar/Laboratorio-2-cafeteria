import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import POSView from './views/POSView';
import PedidosView from './views/PedidosView';
import InventarioView from './views/InventarioView';
import MetricasView from './views/MetricasView';
import IAAssistantView from './views/IAAssistantView';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Navbar />
        <main className="main-container">
          <Routes>
            <Route path="/" element={<POSView />} />
            <Route path="/pos" element={<Navigate to="/" replace />} />
            <Route path="/pedidos" element={<PedidosView />} />
            <Route path="/inventario" element={<InventarioView />} />
            <Route path="/metricas" element={<MetricasView />} />
            <Route path="/asistente-ia" element={<IAAssistantView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        
        <footer style={{ borderTop: '1px solid var(--border-subtle)', background: 'white', padding: '1.25rem', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          🌸 <strong>Komorebi Café & Bakery</strong> · Laboratorio #2 (React + Node.js + BD Relacional + Agente IA n8n) · {new Date().getFullYear()}
        </footer>
      </div>
    </BrowserRouter>
  );
}
