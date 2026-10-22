import React from 'react';

export default function Badge({ children, variant = 'coffee', icon }) {
  const variantClass = {
    matcha: 'badge-matcha',
    pink: 'badge-pink',
    caramel: 'badge-caramel',
    coffee: 'badge-coffee',
    danger: 'badge-danger',
  }[variant] || 'badge-coffee';

  return (
    <span className={`cute-badge ${variantClass}`}>
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </span>
  );
}
