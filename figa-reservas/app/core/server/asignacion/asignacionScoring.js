// Reglas puras de auto-asignación de conductores y vehículos (sin Firestore).

import { GARAGE_COORDS, geocodeKnownPlace } from "@/app/core/server/shared/knownPlaces.js";
import { parseHoraToMinutes } from "@/app/core/shared/time/reservaDateTime.js";

export { parseHoraToMinutes };

export const DEFAULT_ASIGNACION_CONFIG = {
  // Respaldo cuando a algún servicio le falta ubicación: bloquea 5 horas, sin importar la ruta.
  duracionServicioMin: 300,
  margenMin: 0,
  maxServiciosPorDia: 6,
  // Estimación de tiempos cuando hay coordenadas (línea recta * factorRuta a velocidadKmh).
  velocidadKmh: 45,
  factorRuta: 1.35,
  // Con rutas reales (OSRM, tiempos de auto), una buseta tarda un poco más.
  factorTiempoReal: 1.15,
  // Subir/bajar pasajeros y equipaje en cada servicio.
  tiempoAbordajeMin: 15,
  // Colchón entre que el conductor llega al pickup y la hora de la reserva.
  holguraMin: 20,
  // Encadena: el pickup queda cerca del dropoff anterior y la espera es corta.
  radioEncadenarKm: 15,
  maxEsperaEncadenarMin: 120,
  // Km de recorrido vacío que "cuesta" cada servicio que ya tiene el conductor ese día.
  kmPorServicioDia: 40,
};

// Suma días a un YYYY-MM-DD sin pasar por la zona horaria local.
export function addDaysYmd(ymd, days) {
  const match = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizePlace(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function withDefaults(config) {
  return { ...DEFAULT_ASIGNACION_CONFIG, ...config };
}

function toCoords(lat, lng) {
  if (lat == null || lng == null || lat === "" || lng === "") return null;
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln) || (la === 0 && ln === 0)) return null;
  return { lat: la, lng: ln };
}

export function isReservaPendienteDeAsignar(reserva) {
  return !reserva.cancelada && !String(reserva.conductorId || "").trim();
}

export function pasajerosDe(reserva) {
  return (parseInt(reserva.AD) || 0) + (parseInt(reserva.NI) || 0);
}

/**
 * Servicio de agenda a partir de una reserva. Usa las coordenadas guardadas en la
 * reserva y, si faltan, las de lugares conocidos (aeropuertos, hoteles frecuentes).
 */
export function servicioDe(reserva) {
  return {
    minutos: parseHoraToMinutes(reserva.hora),
    pickUp: reserva.pickUp || "",
    dropOff: reserva.dropOff || "",
    origen:
      toCoords(reserva.pickUpLat, reserva.pickUpLng) ||
      geocodeKnownPlace(normalizePlace(reserva.pickUp)),
    destino:
      toCoords(reserva.dropOffLat, reserva.dropOffLng) ||
      geocodeKnownPlace(normalizePlace(reserva.dropOff)),
  };
}

export function distanciaKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Coordenadas redondeadas a ~100 m: un mismo hotel cae siempre en la misma clave.
export function claveCoord(p) {
  return `${Number(p.lat).toFixed(3)},${Number(p.lng).toFixed(3)}`;
}

export function claveViaje(a, b) {
  return `${claveCoord(a)}>${claveCoord(b)}`;
}

/**
 * Tiempos y km entre dos puntos. Usa `tiempos` (Map<claveViaje, { minutos, km }> con rutas
 * reales, p. ej. OSRM) cuando tiene el par; si no, estima por línea recta.
 */
function crearEstimador(cfg, tiempos) {
  const real = (a, b) => {
    if (claveCoord(a) === claveCoord(b)) return { minutos: 0, km: 0 };
    return tiempos?.get(claveViaje(a, b)) || null;
  };
  return {
    cfg,
    minutos(a, b) {
      if (!a || !b) return null;
      const ruta = real(a, b);
      if (ruta) return Math.round(ruta.minutos * cfg.factorTiempoReal);
      return Math.round(((distanciaKm(a, b) * cfg.factorRuta) / cfg.velocidadKmh) * 60);
    },
    km(a, b) {
      if (!a || !b) return null;
      const ruta = real(a, b);
      return ruta ? ruta.km : distanciaKm(a, b) * cfg.factorRuta;
    },
  };
}

export function estimarViajeMin(a, b, config = DEFAULT_ASIGNACION_CONFIG, tiempos = null) {
  return crearEstimador(withDefaults(config), tiempos).minutos(a, b);
}

function duracionCon(servicio, est) {
  const viaje = est.minutos(servicio.origen, servicio.destino);
  return viaje == null ? null : viaje + est.cfg.tiempoAbordajeMin;
}

// Minutos desde la hora del servicio hasta que el conductor queda libre en el dropoff.
export function duracionEstimadaMin(servicio, config = DEFAULT_ASIGNACION_CONFIG, tiempos = null) {
  return duracionCon(servicio, crearEstimador(withDefaults(config), tiempos));
}

/**
 * Minutos libres entre terminar `antes` (y trasladarse a su siguiente pickup) y la hora
 * de `despues`. null si falta alguna ubicación para estimarlo.
 */
function esperaEntre(antes, despues, est) {
  const duracion = duracionCon(antes, est);
  const traslado = est.minutos(antes.destino, despues.origen);
  if (duracion == null || traslado == null) return null;
  return despues.minutos - (antes.minutos + duracion + traslado);
}

// ¿El mismo conductor alcanza a hacer `antes` y luego `despues`?
function alcanza(antes, despues, est) {
  const espera = esperaEntre(antes, despues, est);
  if (espera == null) {
    return despues.minutos - antes.minutos >= est.cfg.duracionServicioMin + est.cfg.margenMin;
  }
  return espera >= est.cfg.holguraMin;
}

function conflictoCon(agendaDia, nuevo, est) {
  return agendaDia.some((item) => {
    // Un servicio agendado sin hora conocida bloquea el día completo por seguridad.
    if (item.minutos == null) return true;
    if (item.minutos === nuevo.minutos) return true;
    return item.minutos < nuevo.minutos ? !alcanza(item, nuevo, est) : !alcanza(nuevo, item, est);
  });
}

/**
 * ¿El servicio nuevo choca con alguno de los ya agendados ese día?
 * `servicio` puede ser un objeto de servicioDe() o solo los minutos de la hora.
 */
export function hasConflict(agendaDia, servicio, config = DEFAULT_ASIGNACION_CONFIG, tiempos = null) {
  const nuevo = typeof servicio === "number" ? { minutos: servicio } : servicio;
  return conflictoCon(agendaDia, nuevo, crearEstimador(withDefaults(config), tiempos));
}

function agendaDiaDe(agenda, id, fecha) {
  if (!id) return [];
  return agenda.get(id)?.get(fecha) || [];
}

/**
 * Vehículo que usaría el conductor para esta reserva:
 * - si la reserva ya trae un vehículo elegido a mano, se respeta;
 * - si no, el vehículo fijo del conductor (solo si existe y está activo).
 */
export function resolveVehiculoParaReserva(reserva, conductor, vehiculosById) {
  const vehiculoReserva = String(reserva.vehiculoId || "").trim();
  if (vehiculoReserva) {
    return { vehiculo: vehiculosById.get(vehiculoReserva) || null, esFijo: false };
  }

  const vehiculo = vehiculosById.get(String(conductor.vehiculoId || "").trim());
  if (!vehiculo || vehiculo.activo === false) return { vehiculo: null, esFijo: false };
  return { vehiculo, esFijo: true };
}

/**
 * Cómo llega el conductor a este servicio: desde el dropoff de su servicio anterior
 * del día o, si no tiene, desde el garage.
 */
function evaluarLlegada(agendaDia, nuevo, est) {
  const { cfg } = est;
  const anterior = agendaDia
    .filter((item) => item.minutos != null && item.minutos < nuevo.minutos)
    .sort((a, b) => b.minutos - a.minutos)[0];

  if (!anterior) {
    const km = est.km(GARAGE_COORDS, nuevo.origen);
    return { kmVacio: km == null ? null : Math.round(km), esperaMin: null, encadena: false };
  }

  const km = est.km(anterior.destino, nuevo.origen);
  const esperaMin = esperaEntre(anterior, nuevo, est);
  const mismoLugar =
    Boolean(normalizePlace(nuevo.pickUp)) &&
    normalizePlace(anterior.dropOff) === normalizePlace(nuevo.pickUp);
  const cerca = mismoLugar || (km != null && km <= cfg.radioEncadenarKm);
  // Sin ubicaciones no se puede medir la espera: basta con que el lugar coincida.
  const esperaCorta = esperaMin == null ? mismoLugar : esperaMin <= cfg.maxEsperaEncadenarMin;

  return {
    kmVacio: km == null ? null : Math.round(km),
    esperaMin,
    encadena: cerca && esperaCorta,
  };
}

/**
 * Elige el mejor conductor (y su vehículo fijo) para una reserva.
 * ctx: {
 *   agendaConductor: Map<conductorId, Map<fecha, Array<servicio>>>,
 *   agendaVehiculo:  Map<vehiculoId,  Map<fecha, Array<servicio>>>,
 *   vehiculosById:   Map<vehiculoId, vehiculo>,
 *   tiempos?:        Map<claveViaje, { minutos, km }> (rutas reales; opcional),
 * }
 * servicio = { minutos, pickUp, dropOff, origen, destino } (ver servicioDe).
 * Devuelve { conductor, vehiculo, asignaVehiculo, motivo, serviciosDia, kmVacio, esperaMin }
 * o { conductor: null, motivo }.
 */
export function pickConductor(reserva, conductores, ctx, config = DEFAULT_ASIGNACION_CONFIG) {
  const cfg = withDefaults(config);
  const est = crearEstimador(cfg, ctx.tiempos);
  const { agendaConductor, agendaVehiculo, vehiculosById } = ctx;
  const nuevo = servicioDe(reserva);
  if (nuevo.minutos == null) {
    return { conductor: null, motivo: "SinHora" };
  }

  const pasajeros = pasajerosDe(reserva);
  const candidatos = [];
  let descartadosPorCapacidad = 0;

  for (const conductor of conductores) {
    const agendaDia = agendaDiaDe(agendaConductor, conductor.id, reserva.fecha);
    if (agendaDia.length >= cfg.maxServiciosPorDia) continue;
    if (conflictoCon(agendaDia, nuevo, est)) continue;

    const { vehiculo, esFijo } = resolveVehiculoParaReserva(reserva, conductor, vehiculosById);
    if (vehiculo) {
      const capacidad = Number(vehiculo.capacidad) || 0;
      if (capacidad > 0 && pasajeros > capacidad) {
        descartadosPorCapacidad += 1;
        continue;
      }
      // Solo se revisa la agenda del vehículo cuando lo pone el conductor (vehículo fijo);
      // si la reserva ya traía vehículo, ese choque ya lo decidió quien la creó.
      if (esFijo && conflictoCon(agendaDiaDe(agendaVehiculo, vehiculo.id, reserva.fecha), nuevo, est)) {
        continue;
      }
    }

    const llegada = evaluarLlegada(agendaDia, nuevo, est);
    // Recorrido vacío desconocido cuenta como un servicio extra, para no premiarlo.
    const costo = (llegada.kmVacio ?? cfg.kmPorServicioDia) + agendaDia.length * cfg.kmPorServicioDia;

    candidatos.push({
      conductor,
      vehiculo,
      asignaVehiculo: esFijo,
      serviciosDia: agendaDia.length,
      costo,
      ...llegada,
    });
  }

  if (candidatos.length === 0) {
    return {
      conductor: null,
      motivo: descartadosPorCapacidad > 0 ? "CapacidadInsuficiente" : "SinConductorDisponible",
    };
  }

  candidatos.sort(
    (a, b) =>
      Number(b.encadena) - Number(a.encadena) ||
      a.costo - b.costo ||
      // A igual costo, se prefiere quien trae vehículo fijo (la reserva sale completa).
      Number(Boolean(b.vehiculo)) - Number(Boolean(a.vehiculo)) ||
      String(a.conductor.nombre || "").localeCompare(String(b.conductor.nombre || ""))
  );

  const best = candidatos[0];
  // "Menor recorrido vacío" solo cuando la distancia realmente marcó la diferencia.
  const ahorraKm =
    best.kmVacio != null &&
    candidatos.some((c) => c.kmVacio != null && c.kmVacio - best.kmVacio > 5);

  return {
    conductor: best.conductor,
    vehiculo: best.vehiculo,
    asignaVehiculo: best.asignaVehiculo,
    serviciosDia: best.serviciosDia,
    kmVacio: best.kmVacio,
    esperaMin: best.esperaMin,
    motivo: best.encadena ? "EncadenaServicio" : ahorraKm ? "MenorRecorridoVacio" : "MenorCargaDelDia",
  };
}
