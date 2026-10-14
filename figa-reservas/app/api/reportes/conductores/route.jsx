import { ROLES } from "@/app/lib/roles.js";
import {
  getAuthUserContext,
  hasRole,
  unauthorizedResponse,
} from "@/app/lib/serverAuth.js";
import { db } from "@/app/lib/firebaseadmin.jsx";
import { jsonResponse } from "@/app/core/shared/http/jsonResponse.js";
import { isAppError } from "@/app/core/server/shared/appError.js";
import { enforceRateLimit } from "@/app/core/server/shared/rateLimit.js";
import { getRendimientoConductoresUseCase } from "@/app/core/server/reportes/rendimientoConductoresUseCase.js";

export const runtime = "nodejs";

// Reporte de rendimiento: el admin ve a todos los conductores; el conductor, solo el suyo.
export async function GET(req) {
  const rateLimitResponse = enforceRateLimit(req, {
    routeKey: "api/reportes/conductores/get",
    limit: 60,
  });
  if (rateLimitResponse) return rateLimitResponse;

  if (!db) {
    return jsonResponse({ message: "Firebase Admin no está configurado en el servidor" }, 500);
  }

  const { uid, profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, [ROLES.ADMIN, ROLES.CONDUCTOR])) {
    return unauthorizedResponse("No tienes permisos para ver el rendimiento de conductores.");
  }

  try {
    const { searchParams } = new URL(req.url);
    const result = await getRendimientoConductoresUseCase({
      query: {
        desde: searchParams.get("desde"),
        hasta: searchParams.get("hasta"),
        tolerancia: searchParams.get("tolerancia"),
      },
      isConductor: !hasRole(profile, [ROLES.ADMIN]),
      uid,
      profile,
    });
    return jsonResponse({ ok: true, ...result });
  } catch (error) {
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    console.error("Error calculando rendimiento de conductores:", error);
    return jsonResponse({ message: "Error calculando el rendimiento de conductores" }, 500);
  }
}
