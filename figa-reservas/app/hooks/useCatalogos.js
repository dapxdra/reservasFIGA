"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "../lib/firebase.jsx";

async function authFetch(url) {
  if (!auth.currentUser) {
    throw new Error("Usuario no autenticado");
  }

  let token;
  try {
    token = await auth.currentUser.getIdToken();
  } catch (error) {
    console.error("Error obteniendo token:", error);
    throw new Error("No se pudo obtener token de autenticación");
  }

  if (!token) {
    throw new Error("Token vacío o inválido");
  }

  let response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    console.error("Error en fetch de catálogos:", error);
    throw new Error(`Error de conexión: ${error.message}`);
  }

  if (!response.ok) {
    let data = {};
    try {
      data = await response.json();
    } catch (e) {
      console.error("Error parseando respuesta:", e);
    }
    
    const errorMessage = data.message || data.error || `Error HTTP ${response.status}`;
    console.error(`Error cargando ${url}:`, errorMessage);
    throw new Error(errorMessage);
  }

  return response.json();
}

export function useCatalogos() {
  const [conductores, setConductores] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);
  const [catalogosError, setCatalogosError] = useState("");

  const cargarCatalogos = useCallback(async () => {
    if (!auth.currentUser) {
      console.log("useCatalogos: No hay usuario autenticado");
      setConductores([]);
      setVehiculos([]);
      setLoadingCatalogos(false);
      setCatalogosError("");
      return;
    }

    setLoadingCatalogos(true);
    setCatalogosError("");
    try {
      console.log("useCatalogos: Iniciando carga de catálogos para", auth.currentUser.email);
      const [conductoresResult, vehiculosResult] = await Promise.allSettled([
        authFetch("/api/conductores?activos=true"),
        authFetch("/api/vehiculos?activos=true"),
      ]);

      const errores = [];

      if (conductoresResult.status === "fulfilled") {
        setConductores(Array.isArray(conductoresResult.value) ? conductoresResult.value : []);
      } else {
        setConductores([]);
        errores.push("Error al cargar conductores");
        console.error("useCatalogos: Error en conductores:", conductoresResult.reason);
      }

      if (vehiculosResult.status === "fulfilled") {
        setVehiculos(Array.isArray(vehiculosResult.value) ? vehiculosResult.value : []);
      } else {
        setVehiculos([]);
        errores.push("Error al cargar vehículos");
        console.error("useCatalogos: Error en vehículos:", vehiculosResult.reason);
      }

      if (errores.length) {
        setCatalogosError(errores.join(". "));
      }
    } catch (error) {
      console.error("useCatalogos: Error completo:", error);
      const errorMsg = error.message || "Error desconocido cargando catálogos";
      setConductores([]);
      setVehiculos([]);
      setCatalogosError(errorMsg);
    } finally {
      setLoadingCatalogos(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log("useCatalogos: Usuario autenticado:", user.email);
        cargarCatalogos();
      } else {
        console.log("useCatalogos: Usuario sin autenticar");
        setConductores([]);
        setVehiculos([]);
        setLoadingCatalogos(false);
      }
    });

    return () => unsubscribe();
  }, [cargarCatalogos]);

  return {
    conductores,
    vehiculos,
    loadingCatalogos,
    catalogosError,
    recargarCatalogos: cargarCatalogos,
  };
}
