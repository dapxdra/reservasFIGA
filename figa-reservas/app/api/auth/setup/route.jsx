import { verifyAuthToken } from "../../../lib/serverAuth.js";
import { jsonResponse } from "../../../core/shared/http/jsonResponse.js";
import { isAppError } from "../../../core/server/shared/appError.js";
import { createInitialAdminProfileUseCase } from "../../../core/server/auth/authSetupUseCase.js";
import { sanitizeObjectStrings } from "../../../core/server/shared/inputSanitizers.js";
import { enforceRateLimit } from "@/app/core/server/shared/rateLimit.js";

export async function POST(req) {
  const rateLimitResponse = enforceRateLimit(req, {
    routeKey: "api/auth/setup",
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const uid = await verifyAuthToken(req.headers.get("authorization"));
    const body = sanitizeObjectStrings(await req.json().catch(() => ({})));
    const result = await createInitialAdminProfileUseCase({ uid, payload: body });
    return jsonResponse(result);
  } catch (error) {
    console.error("Error setup auth:", error);
    if (isAppError(error)) {
      return jsonResponse({ error: error.code, message: error.message }, error.status);
    }
    return jsonResponse({ error: "ServerError", message: "Error interno del servidor." }, 500);
  }
}
