"use client";

import { useEffect } from "react";
import { ROLES } from "@/app/lib/roles.js";
import {
  authenticatedFetch,
  authenticatedJson,
} from "@/app/core/client/http/authenticatedFetch.js";
import {
  BackgroundGeolocation,
  isNativeApp,
  nativeAuthenticatedPost,
} from "@/app/core/client/native/nativeBridge.js";
import { TRACKING_REFRESH_EVENT } from "@/app/core/client/native/pushRegistration.js";

// Mínimo de distancia (metros) entre actualizaciones para evitar escrituras
// innecesarias cuando el conductor está estático.
const MIN_DISTANCE_METERS = 30;

// Mínimo de tiempo (ms) entre envíos al backend aunque haya movimiento.
const MIN_INTERVAL_MS = 20_000; // 20 segundos

// Cada cuánto se pregunta al servidor si toca seguir (ventana: 3 h antes del servicio).
const STATUS_POLL_MS = 5 * 60_000;

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
 * Fuente de ubicación que se enciende y apaga según la ventana de seguimiento.
 * - App nativa: plugin de geolocalización en segundo plano (sigue con la pantalla
 *   apagada o la app minimizada, con una notificación fija) + HTTP nativo.
 * - Navegador: watchPosition, solo mientras la página está abierta.
 */
function createTracker(native) {
  let watchId = null;
  let wanted = false;
  let hastaMs = null;
  let last = { lat: null, lng: null, at: 0 };
  let sending = false;
  let askedSettings = false;

  async function send(lat, lng, accuracy) {
    // Los timers se frenan en segundo plano: el fin de la ventana se revisa con cada lectura.
    if (hastaMs && Date.now() > hastaMs) {
      stop();
      return;
    }
    if (sending) return;

    const now = Date.now();
    const tooSoon = now - last.at < MIN_INTERVAL_MS;
    const tooClose =
      last.lat !== null && distanceMeters(last.lat, last.lng, lat, lng) < MIN_DISTANCE_METERS;
    if (tooSoon && tooClose) return;

    sending = true;
    try {
      const body = { lat, lng, accuracy: accuracy ?? null };
      if (native) {
        await nativeAuthenticatedPost("/api/conductores/location", body);
      } else {
        await authenticatedFetch("/api/conductores/location", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      last = { lat, lng, at: Date.now() };
    } catch {
      // Silencioso
    } finally {
      sending = false;
    }
  }

  function startNative() {
    BackgroundGeolocation.addWatcher(
      {
        backgroundTitle: "Seguimiento de servicio activo",
        backgroundMessage: "FIGA comparte tu ubicación mientras dura tu servicio.",
        requestPermissions: true,
        stale: false,
        distanceFilter: MIN_DISTANCE_METERS,
      },
      (location, error) => {
        if (error) {
          if (error.code === "NOT_AUTHORIZED" && !askedSettings) {
            askedSettings = true;
            if (
              window.confirm(
                "FIGA necesita acceso a tu ubicación para el seguimiento del servicio. ¿Abrir ajustes?"
              )
            ) {
              BackgroundGeolocation.openSettings();
            }
          }
          return;
        }
        if (location) send(location.latitude, location.longitude, location.accuracy);
      }
    )
      .then((id) => {
        // Si se pidió detener mientras arrancaba, se apaga de inmediato.
        if (wanted) watchId = id;
        else BackgroundGeolocation.removeWatcher({ id });
      })
      .catch(() => {
        // Plugin no disponible: no hay seguimiento nativo.
      });
  }

  function startWeb() {
    watchId = navigator.geolocation.watchPosition(
      (position) =>
        send(position.coords.latitude, position.coords.longitude, position.coords.accuracy),
      () => {
        // Permiso denegado o error: silencioso
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 }
    );
  }

  function start(nextHastaMs) {
    hastaMs = Number.isFinite(nextHastaMs) ? nextHastaMs : null;
    if (wanted) return;
    wanted = true;
    if (native) startNative();
    else startWeb();
  }

  function stop() {
    wanted = false;
    hastaMs = null;
    if (watchId === null) return;
    if (native) BackgroundGeolocation.removeWatcher({ id: watchId }).catch(() => {});
    else navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  return { start, stop };
}

/**
 * Comparte la ubicación del conductor durante la ventana de sus servicios
 * (desde 3 h antes hasta el fin estimado), según /api/conductores/tracking.
 *
 * - Solo activo para rol conductor.
 * - Throttling doble: distancia mínima Y intervalo mínimo de tiempo.
 * - Revisa la ventana cada 5 min, al volver a la app y al tocar el aviso push.
 * - Silencioso: sin errores visibles al usuario.
 */
export function useReportConductorLocation({ role, uid }) {
  useEffect(() => {
    if (role !== ROLES.CONDUCTOR) return;
    if (!uid) return;

    const native = isNativeApp();
    if (!native && (typeof navigator === "undefined" || !navigator.geolocation)) return;

    const tracker = createTracker(native);
    let cancelled = false;

    const refresh = async () => {
      try {
        const estado = await authenticatedJson("/api/conductores/tracking");
        if (cancelled) return;
        if (estado?.activo) tracker.start(Date.parse(estado.hasta));
        else tracker.stop();
      } catch {
        // Sin respuesta: en el navegador se mantiene el comportamiento anterior (seguir
        // con la página abierta); en la app se conserva el estado actual.
        if (!cancelled && !native) tracker.start(null);
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    refresh();
    const intervalId = window.setInterval(refresh, STATUS_POLL_MS);
    window.addEventListener(TRACKING_REFRESH_EVENT, refresh);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener(TRACKING_REFRESH_EVENT, refresh);
      document.removeEventListener("visibilitychange", onVisible);
      tracker.stop();
    };
  }, [role, uid]);
}
