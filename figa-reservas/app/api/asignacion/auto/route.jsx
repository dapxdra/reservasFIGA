import { ROLES } from "@/app/lib/roles.js";
import {
  getAuthUserContext,
  hasRole,
  unauthorizedResponse,
} from "@/app/lib/serverAuth.js";
import { jsonResponse } from "@/app/core/shared/http/jsonResponse.js";
import { isAppError } from "@/app/core/server/shared/appError.js";
import { runAutoAsignacionUseCase } from "@/app/core/server/asignacion/asignacionUseCase.js";
import { enforceRateLimit } from "@/app/core/server/shared/rateLimit.js";

export const runtime = "nodejs";
// Incluye la consulta de tiempos reales a OSRM (con timeout por request).
export const maxDuration = 30;

// Se ejecuta solo a demanda desde el botón "Auto-asignar" del dashboard.
export async function POST(req) {
  const rateLimitResponse = enforceRateLimit(req, {
    routeKey: "api/asignacion/auto/post",
    limit: 10,
    windowMs: 60 * 1000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, [ROLES.ADMIN, ROLES.OPERADOR])) {
    return unauthorizedResponse(
      "Solo administradores u operadores pueden ejecutar la auto-asignación."
    );
  }

  let body = {};
  try {
    body = (await req.json()) || {};
  } catch {
    body = {};
  }

  return executeAutoAsignacion({
    // Por defecto solo propone; hay que pedir dryRun:false para escribir.
    dryRun: body.dryRun !== false,
    ...(body.dias !== undefined ? { dias: body.dias } : {}),
  });
}

async function executeAutoAsignacion(options) {
  try {
    const summary = await runAutoAsignacionUseCase(options);
    return jsonResponse(summary, 200);
  } catch (error) {
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    return jsonResponse(
      { message: "Error ejecutando auto-asignación", error: error.message },
      500
    );
  }
}
