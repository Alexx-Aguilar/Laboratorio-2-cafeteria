import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = '550px' }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(62, 39, 35, 0.45)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="cute-card"
        style={{
          width: '100%',
          maxWidth,
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          padding: '2rem',
          animation: 'fadeIn 0.25s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
            borderBottom: '1.5px solid var(--border-subtle)',
            paddingBottom: '0.85rem',
          }}
        >
          <h3 style={{ fontSize: '1.35rem', color: 'var(--color-primary)' }}>{title}</h3>
          <button
            onClick={onClose}
            className="cute-btn cute-btn-outline"
            style={{ width: '36px', height: '36px', padding: 0 }}
            title="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}
