import { ROLES } from "../../lib/roles.js";
import { getAuthUserContext, hasRole, unauthorizedResponse } from "../../lib/serverAuth.js";
import { jsonResponse } from "../../core/shared/http/jsonResponse.js";
import {
  createUserUseCase,
  listUsersUseCase,
} from "../../core/server/users/usersUseCases.js";
import { isAppError } from "../../core/server/shared/appError.js";

export async function GET(req) {
  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, [ROLES.ADMIN])) {
    return unauthorizedResponse("Solo administradores pueden ver usuarios.");
  }

  try {
    const users = await listUsersUseCase();
    return jsonResponse(users);
  } catch (error) {
    console.error("Error listando users:", error);
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    return jsonResponse({ message: "Error interno del servidor" }, 500);
  }
}

export async function POST(req) {
  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, [ROLES.ADMIN])) {
    return unauthorizedResponse("Solo administradores pueden crear usuarios.");
  }

  try {
    const body = await req.json();
    const result = await createUserUseCase(body);
    return jsonResponse(result, 201);
  } catch (error) {
    console.error("Error creando user:", error);
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    if (error.code === "auth/email-already-exists") {
      return jsonResponse({ message: "El correo ya existe en Firebase Authentication." }, 409);
    }
    return jsonResponse({ message: error.message || "Error interno del servidor" }, 500);
  }
}
