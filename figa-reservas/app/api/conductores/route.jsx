import { ROLES } from "../../lib/roles.js";
import { getAuthUserContext, hasRole, unauthorizedResponse } from "../../lib/serverAuth.js";
import { jsonResponse } from "../../core/shared/http/jsonResponse.js";
import {
  createConductorUseCase,
  listConductoresUseCase,
} from "../../core/server/catalogos/catalogosUseCases.js";
import { isAppError } from "../../core/server/shared/appError.js";

export async function GET(req) {
  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, [ROLES.ADMIN, ROLES.OPERADOR])) {
    console.warn(`GET /api/conductores: Usuario ${profile?.email} sin permisos (rol: ${profile?.role})`);
    return unauthorizedResponse("No tienes permisos para ver conductores.");
  }

  try {
    const url = new URL(req.url);
    const activos = url.searchParams.get("activos") === "true";
    const conductores = await listConductoresUseCase({ activos });
    console.log(`GET /api/conductores: Se encontraron ${conductores.length} conductores`);

    return jsonResponse(conductores);
  } catch (error) {
    console.error("GET /api/conductores: Error detallado:", error.message, error.code);
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    return jsonResponse({
      message: "Error al cargar conductores",
      error: error.message || "Error desconocido",
      code: error.code
    }, 500);
  }
}

export async function POST(req) {
  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, [ROLES.ADMIN, ROLES.OPERADOR])) {
    return unauthorizedResponse("No tienes permisos para crear conductores.");
  }

  try {
    const body = await req.json();
    const id = await createConductorUseCase(body);

    return jsonResponse({ message: "Conductor creado", id }, 201);
  } catch (error) {
    console.error("Error creando conductor:", error);
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    return jsonResponse({ message: "Error interno del servidor" }, 500);
  }
}
