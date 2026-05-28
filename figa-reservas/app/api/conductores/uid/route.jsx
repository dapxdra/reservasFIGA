import { ROLES } from "@/app/lib/roles.js";
import {
  getAuthUserContext,
  hasRole,
  unauthorizedResponse,
} from "@/app/lib/serverAuth.js";
import { jsonResponse } from "@/app/core/shared/http/jsonResponse.js";
import { isAppError } from "@/app/core/server/shared/appError.js";
import { resolveConductorUidByEmailUseCase } from "@/app/core/server/catalogos/catalogosUseCases.js";
import { sanitizeEmail, sanitizeString } from "@/app/core/server/shared/inputSanitizers.js";
import { enforceRateLimit } from "@/app/core/server/shared/rateLimit.js";

export async function GET(req) {
  const rateLimitResponse = enforceRateLimit(req, {
    routeKey: "api/conductores/uid",
    limit: 60,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, [ROLES.ADMIN, ROLES.OPERADOR])) {
    return unauthorizedResponse("No tienes permisos para consultar UID de conductores.");
  }

  try {
    const url = new URL(req.url);
    const rawEmail = sanitizeString(url.searchParams.get("email"), {
      lower: true,
      maxLength: 320,
    });

    if (!rawEmail) {
      return jsonResponse({ uid: "" });
    }

    const email = sanitizeEmail(rawEmail);

    const uid = await resolveConductorUidByEmailUseCase(email);
    return jsonResponse({ uid });
  } catch (error) {
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    return jsonResponse({ message: "Error resolviendo UID" }, 500);
  }
}
