import { ROLES } from "@/app/lib/roles.js";
import {
  getAuthUserContext,
  hasRole,
  unauthorizedResponse,
} from "@/app/lib/serverAuth.js";
import { jsonResponse } from "@/app/core/shared/http/jsonResponse.js";
import { isAppError } from "@/app/core/server/shared/appError.js";
import { resolveConductorUidByEmailUseCase } from "@/app/core/server/catalogos/catalogosUseCases.js";

export async function GET(req) {
  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, [ROLES.ADMIN, ROLES.OPERADOR])) {
    return unauthorizedResponse("No tienes permisos para consultar UID de conductores.");
  }

  try {
    const url = new URL(req.url);
    const email = String(url.searchParams.get("email") || "").trim().toLowerCase();

    if (!email) {
      return jsonResponse({ uid: "" });
    }

    const uid = await resolveConductorUidByEmailUseCase(email);
    return jsonResponse({ uid });
  } catch (error) {
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    return jsonResponse({ message: "Error resolviendo UID" }, 500);
  }
}
