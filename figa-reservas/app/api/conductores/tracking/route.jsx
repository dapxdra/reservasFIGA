import { ROLES } from "@/app/lib/roles.js";
import {
  getAuthUserContext,
  hasRole,
  unauthorizedResponse,
} from "@/app/lib/serverAuth.js";
import { jsonResponse } from "@/app/core/shared/http/jsonResponse.js";
import { isAppError } from "@/app/core/server/shared/appError.js";
import { getTrackingStatusUseCase } from "@/app/core/server/tracking/trackingUseCases.js";
import { enforceRateLimit } from "@/app/core/server/shared/rateLimit.js";

export const runtime = "nodejs";

// El dispositivo del conductor consulta si debe enviar su ubicación (3 h antes del servicio).
export async function GET(req) {
  const rateLimitResponse = enforceRateLimit(req, {
    routeKey: "api/conductores/tracking/get",
    limit: 60,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, [ROLES.CONDUCTOR])) {
    return unauthorizedResponse("Solo conductores tienen seguimiento de ubicación.");
  }

  try {
    const estado = await getTrackingStatusUseCase({
      uid: profile.uid || profile.id,
      profile,
    });
    return jsonResponse({ ok: true, ...estado });
  } catch (error) {
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    return jsonResponse({ message: "Error consultando el seguimiento" }, 500);
  }
}
