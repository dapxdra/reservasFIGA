"use client";

import { useEffect, useRef } from "react";
import { ROLES } from "@/app/lib/roles.js";
import { authenticatedFetch } from "@/app/core/client/http/authenticatedFetch.js";

// Mínimo de distancia (metros) entre actualizaciones para evitar escrituras
// innecesarias cuando el conductor está estático.
const MIN_DISTANCE_METERS = 30;

// Mínimo de tiempo (ms) entre envíos al backend aunque haya movimiento.
const MIN_INTERVAL_MS = 20_000; // 20 segundos

/** Haversine simplificada — distancia en metros entre dos coordenadas. */
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6_371_000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Sigue la ubicación del conductor en tiempo real (watchPosition).
 *
 * - Solo activo para rol conductor.
 * - Throttling doble: distancia mínima Y intervalo mínimo de tiempo.
 * - Silencioso: sin errores visibles al usuario.
 * - Limpia el watcher automáticamente al desmontar o cambiar de usuario.
 */
export function useReportConductorLocation({ role, uid }) {
  const watchIdRef = useRef(null);
  const lastSentRef = useRef({ lat: null, lng: null, at: 0 });
  const sendingRef = useRef(false);

  useEffect(() => {
    if (role !== ROLES.CONDUCTOR) return;
    if (!uid) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    const sendLocation = async (lat, lng, accuracy) => {
      if (sendingRef.current) return;

      const now = Date.now();
      const last = lastSentRef.current;

      const tooSoon = now - last.at < MIN_INTERVAL_MS;
      const tooClose =
        last.lat !== null &&
        distanceMeters(last.lat, last.lng, lat, lng) < MIN_DISTANCE_METERS;

      if (tooSoon && tooClose) return;

      sendingRef.current = true;
      try {
        await authenticatedFetch("/api/conductores/location", {
          method: "POST",
          body: JSON.stringify({ lat, lng, accuracy: accuracy ?? null }),
        });
        lastSentRef.current = { lat, lng, at: Date.now() };
      } catch {
        // Silencioso
      } finally {
        sendingRef.current = false;
      }
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        sendLocation(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy
        );
      },
      () => {
        // Permiso denegado o error: silencioso
      },
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 10_000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [role, uid]);
}
