// Métricas de rendimiento por conductor (reglas puras, sin Firestore).

import { pasajerosDe } from "@/app/core/server/asignacion/asignacionScoring.js";
import { reservaInicioMs } from "@/app/core/shared/time/reservaDateTime.js";
import {
  ESTADOS_SERVICIO,
  estaConfirmadaPorConductor,
} from "@/app/core/shared/reservas/estadoServicio.js";

export const RENDIMIENTO_CONFIG = {
  // Minutos de gracia después de la hora programada para considerar la llegada a tiempo.
  toleranciaMin: 5,
  // Intervalos entre etapas por encima de esto se descartan (marcas olvidadas o tardías).
  maxIntervaloMin: 12 * 60,
};

const MIN_MS = 60 * 1000;

function normalizeNombre(value) {
  return String(value || "").trim().toLowerCase();
}

function toMs(value) {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function promedio(valores) {
  if (!valores.length) return null;
  return round1(valores.reduce((a, b) => a + b, 0) / valores.length);
}

function porcentaje(parte, total) {
  if (!total) return null;
  return round1((parte / total) * 100);
}

/** Minutos entre dos etapas marcadas, o null si falta alguna o el valor no es creíble. */
function intervaloMin(at, desde, hasta, maxMin) {
  const a = toMs(at?.[desde]);
  const b = toMs(at?.[hasta]);
  if (a == null || b == null || b < a) return null;
  const min = (b - a) / MIN_MS;
  return min > maxMin ? null : round1(min);
}

/**
 * Identifica al conductor de una reserva contra el catálogo. Devuelve la clave de
 * agrupación y el conductor del catálogo (si se encontró), o null si no tiene asignado.
 */
export function conductorDeReserva(reserva, indice) {
  const conductorId = String(reserva?.conductorId || "").trim();
  if (conductorId && indice.porId.has(conductorId)) {
    return { key: conductorId, conductor: indice.porId.get(conductorId) };
  }

  const uid = String(reserva?.assignedUid || "").trim();
  if (uid && indice.porUid.has(uid)) {
    const conductor = indice.porUid.get(uid);
    return { key: conductor.id, conductor };
  }

  const nombre = normalizeNombre(reserva?.conductorNombre || reserva?.chofer);
  if (nombre && indice.porNombre.has(nombre)) {
    const conductor = indice.porNombre.get(nombre);
    return { key: conductor.id, conductor };
  }

  if (conductorId) return { key: conductorId, conductor: null };
  if (nombre) return { key: `nombre:${nombre}`, conductor: null };
  return null;
}

export function indexarConductores(conductores = []) {
  const porId = new Map();
  const porUid = new Map();
  const porNombre = new Map();
  for (const c of conductores) {
    if (!c?.id) continue;
    porId.set(String(c.id), c);
    if (c.uid) porUid.set(String(c.uid), c);
    const nombre = normalizeNombre(c.nombre);
    if (nombre && !porNombre.has(nombre)) porNombre.set(nombre, c);
  }
  return { porId, porUid, porNombre };
}

/** Clasifica un servicio y calcula sus tiempos. */
export function analizarServicio(reserva, { nowMs, hoy, config = RENDIMIENTO_CONFIG }) {
  const cfg = { ...RENDIMIENTO_CONFIG, ...config };
  const at = reserva?.estadoServicioAt || {};
  const inicioMs = reservaInicioMs(reserva?.fecha, reserva?.hora);
  const cancelada = Boolean(reserva?.cancelada);
  const estado = reserva?.estadoServicio || null;
  const finalizada = estado === "finalizada";

  // Ya debió ocurrir: la hora pasó (o sin hora, la fecha es anterior a hoy).
  const vencida = inicioMs != null ? inicioMs <= nowMs : String(reserva?.fecha || "") < hoy;
  const realizada = !cancelada && (finalizada || vencida);
  const sinCerrar = realizada && !finalizada && String(reserva?.fecha || "") < hoy;

  let retrasoMin = null;
  const llegadaMs = toMs(at.en_pickup);
  if (!cancelada && inicioMs != null && llegadaMs != null) {
    const diff = (llegadaMs - inicioMs) / MIN_MS;
    // Llegadas absurdamente lejanas de la hora programada son marcas erróneas.
    if (Math.abs(diff) <= cfg.maxIntervaloMin) retrasoMin = round1(diff);
  }

  return {
    cancelada,
    realizada,
    finalizada,
    sinCerrar,
    confirmada: estaConfirmadaPorConductor(reserva),
    etapasCompletas: finalizada && ESTADOS_SERVICIO.every((e) => Boolean(at[e])),
    retrasoMin,
    aTiempo: retrasoMin == null ? null : retrasoMin <= cfg.toleranciaMin,
    trayectoPickupMin: intervaloMin(at, "en_camino", "en_pickup", cfg.maxIntervaloMin),
    esperaPickupMin: intervaloMin(at, "en_pickup", "a_bordo", cfg.maxIntervaloMin),
    duracionViajeMin: intervaloMin(at, "a_bordo", "finalizada", cfg.maxIntervaloMin),
    pasajeros: pasajerosDe(reserva),
    ingreso: Number(reserva?.precio) || 0,
  };
}

function resumenVacio() {
  return {
    asignados: 0,
    cancelados: 0,
    programados: 0,
    realizados: 0,
    finalizados: 0,
    sinCerrar: 0,
    pasajeros: 0,
    ingresos: 0,
    confirmados: 0,
    etapasCompletas: 0,
    llegadasMedidas: 0,
    llegadasATiempo: 0,
    llegadasTarde: 0,
  };
}

function cerrarResumen(acc, tiempos) {
  return {
    asignados: acc.asignados,
    cancelados: acc.cancelados,
    programados: acc.programados,
    realizados: acc.realizados,
    finalizados: acc.finalizados,
    sinCerrar: acc.sinCerrar,
    pasajeros: acc.pasajeros,
    ingresos: round1(acc.ingresos),
    cumplimiento: {
      confirmacionPct: porcentaje(acc.confirmados, acc.realizados),
      finalizacionPct: porcentaje(acc.finalizados, acc.realizados),
      etapasCompletasPct: porcentaje(acc.etapasCompletas, acc.finalizados),
    },
    puntualidad: {
      medidas: acc.llegadasMedidas,
      aTiempo: acc.llegadasATiempo,
      tarde: acc.llegadasTarde,
      aTiempoPct: porcentaje(acc.llegadasATiempo, acc.llegadasMedidas),
      retrasoPromedioMin: promedio(tiempos.retrasos),
    },
    tiempos: {
      trayectoPickupPromedioMin: promedio(tiempos.trayecto),
      esperaPickupPromedioMin: promedio(tiempos.espera),
      duracionViajePromedioMin: promedio(tiempos.viaje),
    },
  };
}

function acumular(acc, tiempos, s) {
  acc.asignados += 1;
  if (s.cancelada) {
    acc.cancelados += 1;
    return;
  }
  if (!s.realizada) {
    acc.programados += 1;
    return;
  }

  acc.realizados += 1;
  acc.pasajeros += s.pasajeros;
  acc.ingresos += s.ingreso;
  if (s.finalizada) acc.finalizados += 1;
  if (s.sinCerrar) acc.sinCerrar += 1;
  if (s.confirmada) acc.confirmados += 1;
  if (s.etapasCompletas) acc.etapasCompletas += 1;

  if (s.retrasoMin != null) {
    acc.llegadasMedidas += 1;
    if (s.aTiempo) acc.llegadasATiempo += 1;
    else acc.llegadasTarde += 1;
    // El promedio de retraso no se compensa con llegadas adelantadas.
    tiempos.retrasos.push(Math.max(0, s.retrasoMin));
  }
  if (s.trayectoPickupMin != null) tiempos.trayecto.push(s.trayectoPickupMin);
  if (s.esperaPickupMin != null) tiempos.espera.push(s.esperaPickupMin);
  if (s.duracionViajeMin != null) tiempos.viaje.push(s.duracionViajeMin);
}

function tiemposVacios() {
  return { retrasos: [], trayecto: [], espera: [], viaje: [] };
}

/**
 * Agrupa las reservas por conductor y calcula su rendimiento.
 * `incluirSinServicios` agrega conductores del catálogo sin reservas en el rango.
 */
export function calcularRendimientoConductores({
  reservas = [],
  conductores = [],
  nowMs,
  hoy,
  config = RENDIMIENTO_CONFIG,
  incluirSinServicios = false,
}) {
  const indice = indexarConductores(conductores);
  const grupos = new Map();
  const totalAcc = resumenVacio();
  const totalTiempos = tiemposVacios();
  let sinAsignar = 0;

  const grupoDe = (key, conductor, reserva) => {
    if (!grupos.has(key)) {
      grupos.set(key, {
        conductorId: conductor?.id || (key.startsWith("nombre:") ? null : key),
        nombre:
          conductor?.nombre ||
          String(reserva?.conductorNombre || reserva?.chofer || "").trim() ||
          "Sin nombre",
        activo: conductor ? conductor.activo !== false : null,
        acc: resumenVacio(),
        tiempos: tiemposVacios(),
        servicios: [],
      });
    }
    return grupos.get(key);
  };

  for (const reserva of reservas) {
    const match = conductorDeReserva(reserva, indice);
    if (!match) {
      if (!reserva?.cancelada) sinAsignar += 1;
      continue;
    }

    const s = analizarServicio(reserva, { nowMs, hoy, config });
    const grupo = grupoDe(match.key, match.conductor, reserva);
    acumular(grupo.acc, grupo.tiempos, s);
    acumular(totalAcc, totalTiempos, s);

    grupo.servicios.push({
      id: String(reserva.id ?? ""),
      fecha: reserva.fecha || "",
      hora: reserva.hora || "",
      cliente: reserva.cliente || "",
      pickUp: reserva.pickUp || "",
      dropOff: reserva.dropOff || "",
      vehiculo: reserva.vehiculoPlaca || reserva.buseta || "",
      estadoServicio: reserva.estadoServicio || null,
      cancelada: s.cancelada,
      sinCerrar: s.sinCerrar,
      pasajeros: s.pasajeros,
      retrasoMin: s.retrasoMin,
      trayectoPickupMin: s.trayectoPickupMin,
      duracionViajeMin: s.duracionViajeMin,
    });
  }

  if (incluirSinServicios) {
    for (const c of conductores) {
      if (c?.id && c.activo !== false && !grupos.has(String(c.id))) {
        grupoDe(String(c.id), c, null);
      }
    }
  }

  const porConductor = [...grupos.values()]
    .map((g) => ({
      conductorId: g.conductorId,
      nombre: g.nombre,
      activo: g.activo,
      ...cerrarResumen(g.acc, g.tiempos),
      servicios: g.servicios.sort((a, b) =>
        `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`)
      ),
    }))
    .sort((a, b) => b.realizados - a.realizados || a.nombre.localeCompare(b.nombre, "es"));

  return {
    totales: { ...cerrarResumen(totalAcc, totalTiempos), conductores: porConductor.length, sinAsignar },
    porConductor,
  };
}
