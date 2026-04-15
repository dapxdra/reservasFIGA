import { verifyAuthToken } from "../../../lib/serverAuth.js";
import { jsonResponse } from "../../../core/shared/http/jsonResponse.js";
import { isAppError } from "../../../core/server/shared/appError.js";
import { createInitialAdminProfileUseCase } from "../../../core/server/auth/authSetupUseCase.js";

export async function POST(req) {
  try {
    const uid = await verifyAuthToken(req.headers.get("authorization"));
    const body = await req.json().catch(() => ({}));
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
