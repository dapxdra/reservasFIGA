"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "../lib/firebase.jsx";
import { authenticatedJson } from "@/app/core/client/http/authenticatedFetch.js";

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
        authenticatedJson("/api/conductores?activos=true"),
        authenticatedJson("/api/vehiculos?activos=true"),
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
