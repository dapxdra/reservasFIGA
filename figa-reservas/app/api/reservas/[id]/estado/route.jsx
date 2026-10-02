import { ROLES } from "@/app/lib/roles.js";
import {
  getAuthUserContext,
  hasRole,
  unauthorizedResponse,
} from "@/app/lib/serverAuth.js";
import { jsonResponse } from "@/app/core/shared/http/jsonResponse.js";
import { isAppError } from "@/app/core/server/shared/appError.js";
import { updateEstadoServicioUseCase } from "@/app/core/server/reservas/reservasUseCases.js";
import { sanitizeId, sanitizeString } from "@/app/core/server/shared/inputSanitizers.js";
import { enforceRateLimit } from "@/app/core/server/shared/rateLimit.js";

export const runtime = "nodejs";

// El conductor asignado confirma la reserva o marca el avance del servicio.
export async function PATCH(req, { params }) {
  const rateLimitResponse = enforceRateLimit(req, {
    routeKey: "api/reservas/id/estado/patch",
    limit: 30,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { uid, profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, [ROLES.CONDUCTOR])) {
    return unauthorizedResponse("Solo el conductor asignado puede cambiar el estado del servicio.");
  }

  try {
    const { id } = await params;
    const reservaId = sanitizeId(id, "ID");

    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const result = await updateEstadoServicioUseCase({
      id: reservaId,
      estado: sanitizeString(body?.estado, { maxLength: 32, lower: true }),
      uid: uid || profile?.uid,
      profile,
    });

    return jsonResponse({ ok: true, ...result });
  } catch (error) {
    if (isAppError(error)) {
      if (error.status === 403) return unauthorizedResponse(error.message);
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    return jsonResponse({ message: "Error actualizando el estado del servicio" }, 500);
  }
}
