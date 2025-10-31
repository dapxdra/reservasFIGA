"use client";
import { createContext, useContext, useState, useCallback } from "react";
import { getReservas as fetchReservas } from "../lib/api";

const ReservasDataContext = createContext();

export function ReservasDataProvider({ children }) {
  const [cache, setCache] = useState({
    data: [],
    timestamp: null,
    loading: false,
  });

  // Tiempo de vida del caché: 5 minutos
  const CACHE_TTL = 5 * 60 * 1000;

  const getReservas = useCallback(
    async (force = false) => {
      const now = Date.now();

      // Si el caché es válido y no se fuerza actualización, retornar caché
      if (
        !force &&
        cache.data.length > 0 &&
        cache.timestamp &&
        now - cache.timestamp < CACHE_TTL
      ) {
        return cache.data;
      }

      // Si ya está cargando, esperar
      if (cache.loading) {
        return new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            if (!cache.loading) {
              clearInterval(checkInterval);
              resolve(cache.data);
            }
          }, 100);
        });
      }

      // Hacer la consulta
      setCache((prev) => ({ ...prev, loading: true }));

      try {
        const data = await fetchReservas({});
        setCache({
          data: Array.isArray(data) ? data : [],
          timestamp: now,
          loading: false,
        });
        return data;
      } catch (error) {
        console.error("Error al obtener reservas:", error);
        setCache((prev) => ({ ...prev, loading: false }));
        return [];
      }
    },
    [cache]
  );

  const invalidateCache = useCallback(() => {
    setCache({ data: [], timestamp: null, loading: false });
  }, []);

  const updateReservaInCache = useCallback((id, updates) => {
    setCache((prev) => ({
      ...prev,
      data: prev.data.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }));
  }, []);

  const removeReservaFromCache = useCallback((id) => {
    setCache((prev) => ({
      ...prev,
      data: prev.data.filter((r) => r.id !== id),
    }));
  }, []);

  const addReservaToCache = useCallback((reserva) => {
    setCache((prev) => ({
      ...prev,
      data: [...prev.data, reserva],
    }));
  }, []);

  return (
    <ReservasDataContext.Provider
      value={{
        getReservas,
        invalidateCache,
        updateReservaInCache,
        removeReservaFromCache,
        addReservaToCache,
        isLoading: cache.loading,
      }}
    >
      {children}
    </ReservasDataContext.Provider>
  );
}

export function useReservasData() {
  const context = useContext(ReservasDataContext);
  if (!context) {
    throw new Error(
      "useReservasData debe usarse dentro de ReservasDataProvider"
    );
  }
  return context;
}
