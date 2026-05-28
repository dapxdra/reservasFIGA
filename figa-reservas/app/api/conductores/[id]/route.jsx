import { ROLES } from "../../../lib/roles.js";
import { getAuthUserContext, hasRole, unauthorizedResponse } from "../../../lib/serverAuth.js";
import { jsonResponse } from "../../../core/shared/http/jsonResponse.js";
import {
  setConductorActivoUseCase,
  updateConductorUseCase,
} from "../../../core/server/catalogos/catalogosUseCases.js";
import { isAppError } from "../../../core/server/shared/appError.js";
import {
  sanitizeId,
  sanitizeObjectStrings,
} from "../../../core/server/shared/inputSanitizers.js";
import { enforceRateLimit } from "@/app/core/server/shared/rateLimit.js";

export async function PUT(req, { params }) {
  const rateLimitResponse = enforceRateLimit(req, {
    routeKey: "api/conductores/id/put",
    limit: 40,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, ["admin", "operador"])) {
    return unauthorizedResponse("No tienes permisos para editar conductores.");
  }

  const { id } = await params;

  try {
    const body = sanitizeObjectStrings(await req.json());
    await updateConductorUseCase(sanitizeId(id, "ID"), body);

    return jsonResponse({ message: "Conductor actualizado" });
  } catch (error) {
    console.error("Error actualizando conductor:", error);
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    return jsonResponse({ message: "Error interno del servidor" }, 500);
  }
}

export async function PATCH(req, { params }) {
  const rateLimitResponse = enforceRateLimit(req, {
    routeKey: "api/conductores/id/patch",
    limit: 40,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, [ROLES.ADMIN, ROLES.OPERADOR])) {
    return unauthorizedResponse("No tienes permisos para cambiar estado de conductores.");
  }

  const { id } = await params;

  try {
    const body = sanitizeObjectStrings(await req.json());
    const activo = await setConductorActivoUseCase(sanitizeId(id, "ID"), body.activo);

    return jsonResponse({ message: activo ? "Conductor activado" : "Conductor desactivado" });
  } catch (error) {
    console.error("Error actualizando estado conductor:", error);
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    return jsonResponse({ message: "Error interno del servidor" }, 500);
  }
}
