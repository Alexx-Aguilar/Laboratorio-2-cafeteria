import React from 'react';
import { AlertCircle, X } from 'lucide-react';

export default function ErrorMessage({ message, onDismiss, title = 'Atención' }) {
  if (!message) return null;

  return (
    <div className="cute-alert alert-error">
      <AlertCircle size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
      <div style={{ flex: 1 }}>
        <strong style={{ display: 'block', marginBottom: '2px', fontFamily: 'var(--font-display)' }}>
          {title}
        </strong>
        <p style={{ margin: 0, lineHeight: 1.4 }}>{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            padding: '2px',
          }}
          title="Cerrar alerta"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}
