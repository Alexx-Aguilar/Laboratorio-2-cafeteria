import React from 'react';

export default function MetricCard({ title, value, subtitle, icon: Icon, color = 'coffee', badge }) {
  const colorStyles = {
    coffee: { bg: '#F5EBE6', text: '#8D5B4C', border: '#E4D5D0' },
    pink: { bg: '#FFF0F5', text: '#E85D88', border: '#F8BBD0' },
    matcha: { bg: '#F1F8F4', text: '#4E8A5E', border: '#C8E6C9' },
    caramel: { bg: '#FFF9E6', text: '#D97706', border: '#FDE68A' },
  };

  const currentTheme = colorStyles[color] || colorStyles.coffee;

  return (
    <div className="cute-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          {title}
        </span>
        {Icon && (
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-sm)',
              background: currentTheme.bg,
              color: currentTheme.text,
              border: `1px solid ${currentTheme.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={20} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <h2 style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.1 }}>
          {value}
        </h2>
        {badge && (
          <span className="cute-badge badge-matcha" style={{ fontSize: '0.7rem' }}>
            {badge}
          </span>
        )}
      </div>

      {subtitle && (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {subtitle}
        </span>
      )}
    </div>
  );
}
