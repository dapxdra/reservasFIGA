// Tiempos reales por carretera para la auto-asignación: cache en Firestore + OSRM.
// Nunca lanza: si algo falla, el scoring estima esos pares por línea recta.

import { GARAGE_COORDS } from "@/app/core/server/shared/knownPlaces.js";
import { claveCoord, claveViaje } from "@/app/core/server/asignacion/asignacionScoring.js";
import { getTravelTimes, saveTravelTimes } from "@/app/core/server/asignacion/travelTimesRepository.js";
import { fetchOsrmTiempos } from "@/app/core/server/asignacion/providers/osrmTableProvider.js";

// Las rutas cambian poco; se recalculan cada 90 días.
const CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

function agregarPar(pares, desde, hasta) {
  if (!desde || !hasta) return;
  const claveDesde = claveCoord(desde);
  const claveHasta = claveCoord(hasta);
  if (claveDesde === claveHasta) return;
  const clave = claveViaje(desde, hasta);
  if (!pares.has(clave)) pares.set(clave, { clave, claveDesde, claveHasta, desde, hasta });
}

/**
 * Pares que el scoring puede consultar dentro de cada día:
 * garage -> pickup, pickup -> dropoff y dropoff de un servicio -> pickup de uno posterior.
 * serviciosPorDia: Array<Array<servicio>> (ver servicioDe).
 */
export function paresNecesarios(serviciosPorDia) {
  const pares = new Map();
  for (const servicios of serviciosPorDia) {
    const conHora = servicios.filter((s) => s.minutos != null);
    for (const s of conHora) {
      agregarPar(pares, GARAGE_COORDS, s.origen);
      agregarPar(pares, s.origen, s.destino);
      for (const t of conHora) {
        if (t !== s && t.minutos >= s.minutos) agregarPar(pares, s.destino, t.origen);
      }
    }
  }
  return [...pares.values()];
}

/**
 * Devuelve { tiempos: Map<claveViaje, { minutos, km }>, resumen }.
 * resumen: { pares, cache, osrm, estimados, error }
 */
export async function cargarTiemposReales(serviciosPorDia, { now = Date.now() } = {}) {
  const pares = paresNecesarios(serviciosPorDia);
  const tiempos = new Map();
  const resumen = { pares: pares.length, cache: 0, osrm: 0, estimados: 0, error: null };
  if (pares.length === 0) return { tiempos, resumen };

  try {
    const cache = await getTravelTimes(pares.map((p) => p.clave));
    for (const [clave, valor] of cache) {
      if (valor.updatedAtMs != null && now - valor.updatedAtMs > CACHE_TTL_MS) continue;
      tiempos.set(clave, { minutos: valor.minutos, km: valor.km });
    }
    resumen.cache = tiempos.size;
  } catch (err) {
    resumen.error = `cache: ${err?.message || err}`;
  }

  const faltantes = pares.filter((p) => !tiempos.has(p.clave));
  if (faltantes.length > 0) {
    const { tiempos: nuevos, error } = await fetchOsrmTiempos(faltantes);
    for (const [clave, valor] of nuevos) tiempos.set(clave, valor);
    resumen.osrm = nuevos.size;
    if (error) resumen.error = `osrm: ${error}`;

    if (nuevos.size > 0) {
      try {
        await saveTravelTimes(nuevos);
      } catch {
        // Guardar es best-effort: la asignación ya tiene los tiempos en memoria.
      }
    }
  }

  resumen.estimados = pares.length - tiempos.size;
  return { tiempos, resumen };
}
