import { ROLES } from "../../lib/roles.js";
import { getAuthUserContext, hasRole, unauthorizedResponse } from "../../lib/serverAuth.js";
import { jsonResponse } from "../../core/shared/http/jsonResponse.js";
import {
  createVehiculoUseCase,
  listVehiculosUseCase,
} from "../../core/server/catalogos/catalogosUseCases.js";
import { isAppError } from "../../core/server/shared/appError.js";
import {
  sanitizeBoolean,
  sanitizeObjectStrings,
} from "../../core/server/shared/inputSanitizers.js";
import { enforceRateLimit } from "@/app/core/server/shared/rateLimit.js";

export async function GET(req) {
  const rateLimitResponse = enforceRateLimit(req, {
    routeKey: "api/vehiculos/get",
    limit: 120,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, [ROLES.ADMIN, ROLES.OPERADOR])) {
    console.warn(`GET /api/vehiculos: Usuario ${profile?.email} sin permisos (rol: ${profile?.role})`);
    return unauthorizedResponse("No tienes permisos para ver vehículos.");
  }

  try {
    const url = new URL(req.url);
    const activos = sanitizeBoolean(url.searchParams.get("activos"), false);
    const vehiculos = await listVehiculosUseCase({ activos });
    console.log(`GET /api/vehiculos: Se encontraron ${vehiculos.length} vehículos`);
    return jsonResponse(vehiculos);
  } catch (error) {
    console.error("GET /api/vehiculos: Error detallado:", error.message, error.code);
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    return jsonResponse({
      message: "Error al cargar vehículos",
      error: error.message || "Error desconocido",
      code: error.code
    }, 500);
  }
}

export async function POST(req) {
  const rateLimitResponse = enforceRateLimit(req, {
    routeKey: "api/vehiculos/post",
    limit: 40,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, [ROLES.ADMIN, ROLES.OPERADOR])) {
    return unauthorizedResponse("No tienes permisos para crear vehículos.");
  }

  try {
    const body = sanitizeObjectStrings(await req.json());
    const id = await createVehiculoUseCase(body);

    return jsonResponse({ message: "Vehículo creado", id }, 201);
  } catch (error) {
    console.error("Error creando vehículo:", error);
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    return jsonResponse({ message: "Error interno del servidor" }, 500);
  }
}
