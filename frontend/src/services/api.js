const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Helper genérico para peticiones HTTP con manejo estandarizado de errores { error: "mensaje" }
 */
async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    let errorMessage = `Error HTTP ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson && errorJson.error) {
        errorMessage = errorJson.error;
      }
    } catch {
      // Si no es JSON, mantener error HTTP genérico
    }
    const err = new Error(errorMessage);
    err.status = response.status;
    throw err;
  }

  return response.json();
}

// ==========================================
// SERVICIOS DE PRODUCTOS
// ==========================================
export async function getProductos() {
  return request('/productos');
}

export async function getProducto(id) {
  return request(`/productos/${id}`);
}

export async function createProducto(data) {
  return request('/productos', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProducto(id, data) {
  return request(`/productos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteProducto(id) {
  return request(`/productos/${id}`, {
    method: 'DELETE',
  });
}

// ==========================================
// SERVICIOS DE INSUMOS (MATERIA PRIMA)
// ==========================================
export async function getInsumos() {
  return request('/insumos');
}

export async function getInsumo(id) {
  return request(`/insumos/${id}`);
}

export async function createInsumo(data) {
  return request('/insumos', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateInsumo(id, data) {
  return request(`/insumos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function adjustStockInsumo(id, ajuste) {
  return request(`/insumos/${id}/stock`, {
    method: 'PATCH',
    body: JSON.stringify({ ajuste }),
  });
}

export async function deleteInsumo(id) {
  return request(`/insumos/${id}`, {
    method: 'DELETE',
  });
}

// ==========================================
// SERVICIOS DE PEDIDOS
// ==========================================
export async function getPedidos(filters = {}) {
  const queryParams = new URLSearchParams();
  if (filters.estado) queryParams.append('estado', filters.estado);
  if (filters.metodo_pago) queryParams.append('metodo_pago', filters.metodo_pago);
  
  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return request(`/pedidos${query}`);
}

export async function getPedido(id) {
  return request(`/pedidos/${id}`);
}

export async function createPedido(data) {
  return request('/pedidos', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function anularPedido(id, motivo = '') {
  return request(`/pedidos/${id}/anular`, {
    method: 'PATCH',
    body: JSON.stringify({ motivo }),
  });
}

// ==========================================
// SERVICIOS DE RESUMEN Y MÉTRICAS
// ==========================================
export async function getResumen() {
  return request('/resumen');
}

// ==========================================
// SERVICIOS DE AGENTE DE IA (n8n / Heurístico)
// ==========================================
export async function getSugerenciaIA(datos = {}) {
  return request('/ia/sugerencia-compras', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

export async function getDatosAnalisisIA() {
  return request('/ia/datos-analisis');
}
