// Ventana en la que se sigue la ubicación de un conductor (reglas puras, sin Firestore).

import { duracionEstimadaMin, servicioDe } from "@/app/core/server/asignacion/asignacionScoring.js";
import { reservaInicioMs } from "@/app/core/shared/time/reservaDateTime.js";
import { ESTADOS_EN_CURSO } from "@/app/core/shared/reservas/estadoServicio.js";

export const TRACKING_CONFIG = {
  // Empieza 3 horas antes de la hora del servicio.
  minutosAntes: 180,
  // Sigue 1 hora después del fin estimado (retrasos, regreso).
  minutosDespues: 60,
  // Duración si no se puede estimar la ruta (faltan ubicaciones).
  duracionRespaldoMin: 300,
};

const MIN_MS = 60 * 1000;

export function ymdEnCR(ms) {
  return new Date(ms).toLocaleDateString("en-CA", { timeZone: "America/Costa_Rica" });
}

/** Instante (ms UTC) de la hora de la reserva en Costa Rica, o null sin fecha/hora válidas. */
export function inicioServicioMs(reserva) {
  return reservaInicioMs(reserva?.fecha, reserva?.hora);
}

export function ventanaTracking(reserva, config = TRACKING_CONFIG) {
  const cfg = { ...TRACKING_CONFIG, ...config };
  const inicioMs = inicioServicioMs(reserva);
  if (inicioMs == null) return null;
  const duracion = duracionEstimadaMin(servicioDe(reserva)) ?? cfg.duracionRespaldoMin;
  const desdeMs = inicioMs - cfg.minutosAntes * MIN_MS;
  return {
    reservaId: String(reserva.id),
    inicioMs,
    desdeMs,
    // Si el conductor ya marcó que salió, se sigue aunque falten más de 3 h.
    abiertaDesdeMs: ESTADOS_EN_CURSO.has(reserva.estadoServicio) ? -Infinity : desdeMs,
    hastaMs: inicioMs + (duracion + cfg.minutosDespues) * MIN_MS,
  };
}

/**
 * Estado de seguimiento para las reservas (ya filtradas) de un conductor.
 * Activo: { activo: true, reservaId, desde, hasta }; servicios encadenados extienden `hasta`.
 * Inactivo: { activo: false, proximo: { reservaId, desde } | null }.
 */
export function estadoTracking(reservas, nowMs, config = TRACKING_CONFIG) {
  const ventanas = reservas
    // Un servicio finalizado por el conductor ya no necesita seguimiento.
    .filter((r) => !r.cancelada && r.estadoServicio !== "finalizada")
    .map((r) => ventanaTracking(r, config))
    .filter(Boolean)
    .sort((a, b) => a.desdeMs - b.desdeMs);

  const activas = ventanas.filter((v) => v.abiertaDesdeMs <= nowMs && nowMs <= v.hastaMs);
  if (activas.length > 0) {
    // Si el siguiente servicio arranca antes de que termine este, la ventana se une.
    let hastaMs = Math.max(...activas.map((v) => v.hastaMs));
    for (const v of ventanas) {
      if (v.desdeMs > nowMs && v.desdeMs <= hastaMs) hastaMs = Math.max(hastaMs, v.hastaMs);
    }
    return {
      activo: true,
      reservaId: activas[0].reservaId,
      desde: new Date(activas[0].desdeMs).toISOString(),
      hasta: new Date(hastaMs).toISOString(),
    };
  }

  const proxima = ventanas.find((v) => v.desdeMs > nowMs);
  return {
    activo: false,
    proximo: proxima
      ? { reservaId: proxima.reservaId, desde: new Date(proxima.desdeMs).toISOString() }
      : null,
  };
}
