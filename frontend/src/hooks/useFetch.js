import { useState, useEffect, useCallback } from 'react';

/**
 * Custom Hook para gestionar peticiones asíncronas con estados: data, loading y error
 * @param {Function} fetchFn - Función que devuelve una promesa (ej: desde api.js)
 * @param {Array} deps - Dependencias opcionales que disparan refetch automático
 */
export function useFetch(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      console.error('[useFetch Error]:', err);
      setError(err.message || 'Error al cargar los datos.');
    } finally {
      setLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let isMounted = true;
    execute();
    return () => {
      isMounted = false;
    };
  }, [execute]);

  return { data, loading, error, refetch: execute, setData };
}
