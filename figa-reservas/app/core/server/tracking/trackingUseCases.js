import {
  listReservasByFechaRange,
  updateReservaById,
} from "@/app/core/server/reservas/reservasRepository.js";
import {
  isReservaAssignedToConductor,
  toConductorScope,
} from "@/app/core/server/reservas/reservasUseCases.js";
import { addDaysYmd } from "@/app/core/server/asignacion/asignacionScoring.js";
import {
  estadoTracking,
  ventanaTracking,
  ymdEnCR,
} from "@/app/core/server/tracking/trackingWindow.js";
import {
  deleteDeviceToken,
  listDeviceTokensByUid,
  saveDeviceToken,
} from "@/app/core/server/tracking/deviceTokensRepository.js";
import { sendPushToTokens } from "@/app/core/server/tracking/providers/fcmPushProvider.js";
import { sanitizeString } from "@/app/core/server/shared/inputSanitizers.js";
import { appError } from "@/app/core/server/shared/appError.js";

const PLATFORMS = new Set(["android", "ios", "web"]);

// Ayer..mañana en CR: cubre servicios que cruzan medianoche y la ventana de 3 h previas.
async function reservasAlrededorDe(nowMs) {
  const hoy = ymdEnCR(nowMs);
  return listReservasByFechaRange(addDaysYmd(hoy, -1), addDaysYmd(hoy, 1));
}

/** ¿Debe el dispositivo del conductor estar enviando su ubicación ahora? */
export async function getTrackingStatusUseCase({ uid, profile, now = Date.now() }) {
  const reservas = await reservasAlrededorDe(now);
  const conductorNombre = toConductorScope(profile);
  const propias = reservas.filter((r) =>
    isReservaAssignedToConductor(r, String(uid || "").trim(), conductorNombre)
  );
  return estadoTracking(propias, now);
}

export async function registerDeviceTokenUseCase({ uid, token, platform }) {
  const safeToken = sanitizeString(token, { maxLength: 4096 });
  const safePlatform = String(platform || "").trim().toLowerCase();
  if (!safeToken || safeToken.length < 20) {
    throw appError("token inválido", 400, "ValidationError");
  }
  if (!PLATFORMS.has(safePlatform)) {
    throw appError("platform debe ser android, ios o web", 400, "ValidationError");
  }
  await saveDeviceToken({ uid, token: safeToken, platform: safePlatform });
}

export async function unregisterDeviceTokenUseCase({ token }) {
  const safeToken = sanitizeString(token, { maxLength: 4096 });
  if (!safeToken) throw appError("token requerido", 400, "ValidationError");
  await deleteDeviceToken(safeToken);
}

function mensajeInicio(reserva) {
  const ruta = [reserva.pickUp, reserva.dropOff].filter(Boolean).join(" → ");
  return {
    title: "Tu servicio inicia en unas 3 horas",
    body: `${reserva.hora || ""} ${ruta}`.trim() + ". Abre la app para activar el seguimiento.",
    data: { tipo: "tracking-start", reservaId: String(reserva.id) },
  };
}

/**
 * Avisa por push a cada conductor cuando se abre la ventana de seguimiento de su servicio
 * (3 h antes). Pensado para correr cada ~15 min; cada reserva se avisa una sola vez.
 */
export async function runTrackingStartPushUseCase({ now = Date.now(), dryRun = false } = {}) {
  const reservas = await reservasAlrededorDe(now);
  const summary = {
    dryRun,
    revisadas: 0,
    enviadas: 0,
    sinDispositivo: 0,
    errores: 0,
    detalles: [],
  };

  for (const reserva of reservas) {
    const uid = String(reserva.assignedUid || "").trim();
    if (reserva.cancelada || !uid || reserva.trackingPush?.sentAt) continue;

    const ventana = ventanaTracking(reserva);
    // Solo entre la apertura de la ventana y la hora del servicio.
    if (!ventana || now < ventana.desdeMs || now >= ventana.inicioMs) continue;
    summary.revisadas += 1;

    try {
      const tokens = await listDeviceTokensByUid(uid);
      if (tokens.length === 0) {
        summary.sinDispositivo += 1;
        summary.detalles.push({ reservaId: String(reserva.id), estado: "SinDispositivo" });
        continue;
      }
      if (dryRun) {
        summary.detalles.push({ reservaId: String(reserva.id), estado: "Pendiente", dispositivos: tokens.length });
        continue;
      }

      const result = await sendPushToTokens(tokens, mensajeInicio(reserva));
      await Promise.all(result.tokensInvalidos.map((t) => deleteDeviceToken(t).catch(() => {})));

      if (result.enviados > 0) {
        await updateReservaById(reserva.id, {
          trackingPush: { sentAt: new Date(now).toISOString(), enviados: result.enviados },
        });
        summary.enviadas += 1;
        summary.detalles.push({ reservaId: String(reserva.id), estado: "Enviada", dispositivos: result.enviados });
      } else {
        summary.errores += 1;
        summary.detalles.push({ reservaId: String(reserva.id), estado: "Fallida" });
      }
    } catch (error) {
      summary.errores += 1;
      summary.detalles.push({
        reservaId: String(reserva.id),
        estado: "Error",
        error: error?.message || String(error),
      });
    }
  }

  return summary;
}
