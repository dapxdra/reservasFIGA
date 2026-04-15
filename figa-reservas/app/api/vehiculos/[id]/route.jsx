import { ROLES } from "../../../lib/roles.js";
import { getAuthUserContext, hasRole, unauthorizedResponse } from "../../../lib/serverAuth.js";
import { jsonResponse } from "../../../core/shared/http/jsonResponse.js";
import {
  setVehiculoActivoUseCase,
  updateVehiculoUseCase,
} from "../../../core/server/catalogos/catalogosUseCases.js";
import { isAppError } from "../../../core/server/shared/appError.js";

export async function PUT(req, { params }) {
  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, [ROLES.ADMIN, ROLES.OPERADOR])) {
    return unauthorizedResponse("No tienes permisos para editar vehículos.");
  }

  const { id } = await params;

  try {
    const body = await req.json();
    await updateVehiculoUseCase(id, body);

    return jsonResponse({ message: "Vehículo actualizado" });
  } catch (error) {
    console.error("Error actualizando vehículo:", error);
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    return jsonResponse({ message: "Error interno del servidor" }, 500);
  }
}

export async function PATCH(req, { params }) {
  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, [ROLES.ADMIN, ROLES.OPERADOR])) {
    return unauthorizedResponse("No tienes permisos para cambiar estado de vehículos.");
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const activo = await setVehiculoActivoUseCase(id, body.activo);

    return jsonResponse({ message: activo ? "Vehículo activado" : "Vehículo desactivado" });
  } catch (error) {
    console.error("Error actualizando estado vehículo:", error);
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    return jsonResponse({ message: "Error interno del servidor" }, 500);
  }
}
