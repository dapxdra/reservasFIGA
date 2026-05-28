import { ROLES } from "../../../lib/roles.js";
import { getAuthUserContext, hasRole, unauthorizedResponse } from "../../../lib/serverAuth.js";
import { jsonResponse } from "../../../core/shared/http/jsonResponse.js";
import {
  toggleUserStatusUseCase,
  updateUserUseCase,
} from "../../../core/server/users/usersUseCases.js";
import { isAppError } from "../../../core/server/shared/appError.js";
import {
  sanitizeId,
  sanitizeObjectStrings,
} from "../../../core/server/shared/inputSanitizers.js";
import { enforceRateLimit } from "@/app/core/server/shared/rateLimit.js";

export async function PUT(req, { params }) {
  const rateLimitResponse = enforceRateLimit(req, {
    routeKey: "api/users/id/put",
    limit: 30,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;
  if (!hasRole(profile, [ROLES.ADMIN])) return unauthorizedResponse("Solo administradores.");

  const { id } = await params;
  try {
    const body = sanitizeObjectStrings(await req.json());
    await updateUserUseCase(sanitizeId(id, "ID"), body);

    return jsonResponse({ message: "Usuario actualizado" });
  } catch (error) {
    console.error("Error actualizando user:", error);
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    return jsonResponse({ message: "Error interno del servidor" }, 500);
  }
}

export async function PATCH(req, { params }) {
  const rateLimitResponse = enforceRateLimit(req, {
    routeKey: "api/users/id/patch",
    limit: 30,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;
  if (!hasRole(profile, [ROLES.ADMIN])) return unauthorizedResponse("Solo administradores.");

  const { id } = await params;
  try {
    const body = sanitizeObjectStrings(await req.json());
    const activo = await toggleUserStatusUseCase(sanitizeId(id, "ID"), body.activo);

    return jsonResponse({ message: activo ? "Usuario activado" : "Usuario desactivado" });
  } catch (error) {
    console.error("Error cambiando estado user:", error);
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    return jsonResponse({ message: "Error interno del servidor" }, 500);
  }
}
