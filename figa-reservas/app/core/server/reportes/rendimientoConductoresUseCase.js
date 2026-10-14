import { listReservasByFechaRange } from "@/app/core/server/reservas/reservasRepository.js";
import { listConductores } from "@/app/core/server/catalogos/conductoresRepository.js";
import {
  isReservaAssignedToConductor,
  toConductorScope,
} from "@/app/core/server/reservas/reservasUseCases.js";
import { ymdEnCR } from "@/app/core/server/tracking/trackingWindow.js";
import { appError } from "@/app/core/server/shared/appError.js";
import {
  RENDIMIENTO_CONFIG,
  calcularRendimientoConductores,
} from "@/app/core/server/reportes/rendimientoConductores.js";

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGO_DIAS = 366;

function diasEntre(desde, hasta) {
  return (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000;
}

/** Rango por defecto: del primer día del mes en curso (CR) hasta hoy. */
export function validateRendimientoQuery({ desde, hasta, tolerancia } = {}, nowMs = Date.now()) {
  const hoy = ymdEnCR(nowMs);
  const safeDesde = String(desde || "").trim() || `${hoy.slice(0, 8)}01`;
  const safeHasta = String(hasta || "").trim() || hoy;

  if (!YMD_RE.test(safeDesde) || !YMD_RE.test(safeHasta) || Number.isNaN(diasEntre(safeDesde, safeHasta))) {
    throw appError("Las fechas deben tener formato YYYY-MM-DD", 400, "ValidationError");
  }
  if (safeDesde > safeHasta) {
    throw appError("La fecha inicial no puede ser mayor que la final", 400, "ValidationError");
  }
  if (diasEntre(safeDesde, safeHasta) > MAX_RANGO_DIAS) {
    throw appError(`El rango no puede superar ${MAX_RANGO_DIAS} días`, 400, "ValidationError");
  }

  let toleranciaMin = RENDIMIENTO_CONFIG.toleranciaMin;
  if (tolerancia != null && String(tolerancia).trim() !== "") {
    toleranciaMin = Number(tolerancia);
    if (!Number.isInteger(toleranciaMin) || toleranciaMin < 0 || toleranciaMin > 60) {
      throw appError("La tolerancia debe ser un entero entre 0 y 60 minutos", 400, "ValidationError");
    }
  }

  return { desde: safeDesde, hasta: safeHasta, toleranciaMin, hoy };
}

/**
 * Admin: todos los conductores. Conductor: solo sus propios servicios, sin importar
 * los parámetros que envíe.
 */
export async function getRendimientoConductoresUseCase({
  query,
  isConductor,
  uid,
  profile,
  nowMs = Date.now(),
}) {
  const { desde, hasta, toleranciaMin, hoy } = validateRendimientoQuery(query, nowMs);

  const [reservasRango, conductores] = await Promise.all([
    listReservasByFechaRange(desde, hasta),
    listConductores(),
  ]);

  let reservas = reservasRango;
  let catalogo = conductores;

  if (isConductor) {
    const currentUid = String(uid || "").trim();
    const nombre = toConductorScope(profile);
    const propio = conductores.find(
      (c) =>
        (currentUid && String(c.uid || "") === currentUid) ||
        (nombre && String(c.nombre || "").trim().toLowerCase() === nombre)
    ) || {
      id: currentUid || "propio",
      nombre: String(profile?.nombre || "").trim() || "Mi rendimiento",
    };

    // Todas sus reservas quedan bajo una sola ficha aunque falte conductorId en alguna.
    reservas = reservasRango
      .filter((r) => isReservaAssignedToConductor(r, currentUid, nombre))
      .map((r) => ({ ...r, conductorId: propio.id }));
    catalogo = [propio];
  }

  const { totales, porConductor } = calcularRendimientoConductores({
    reservas,
    conductores: catalogo,
    nowMs,
    hoy,
    config: { toleranciaMin },
    incluirSinServicios: !isConductor,
  });

  // El conductor no ve montos, igual que en el dashboard.
  const sinIngresos = ({ ingresos, ...resto }) => resto;

  return {
    rango: { desde, hasta, toleranciaMin, hoy },
    totales: isConductor ? sinIngresos(totales) : totales,
    porConductor: isConductor ? porConductor.map(sinIngresos) : porConductor,
  };
}
