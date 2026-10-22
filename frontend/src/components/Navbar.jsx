import React from 'react';
import { NavLink } from 'react-router-dom';
import { Coffee, ShoppingBag, Layers, BarChart3, Sparkles } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="cute-navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="brand-logo">
          <div className="brand-icon">
            <span>☕</span>
          </div>
          <div className="brand-text">
            <h1>Komorebi Café</h1>
            <span>BAKERY & SPECIALTY COFFEE · POS CUTE</span>
          </div>
        </NavLink>

        <nav className="nav-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
          >
            <Coffee size={18} />
            <span>Punto de Venta</span>
          </NavLink>

          <NavLink
            to="/pedidos"
            className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
          >
            <ShoppingBag size={18} />
            <span>Pedidos</span>
          </NavLink>

          <NavLink
            to="/inventario"
            className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
          >
            <Layers size={18} />
            <span>Inventario & Insumos</span>
          </NavLink>

          <NavLink
            to="/metricas"
            className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
          >
            <BarChart3 size={18} />
            <span>Métricas & Caja</span>
          </NavLink>

          <NavLink
            to="/asistente-ia"
            className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
            style={{
              background: 'linear-gradient(135deg, #FFF0F5 0%, #FCE4EC 100%)',
              color: '#D81B60',
              border: '1.5px solid #F8BBD0'
            }}
          >
            <Sparkles size={18} className="pulse-glow" />
            <span style={{ fontWeight: 700 }}>Agente IA (n8n)</span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
