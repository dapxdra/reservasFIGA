import { getAuthUserContext } from "../../../lib/serverAuth.js";
import { normalizeRole } from "../../../lib/roles.js";
import { jsonResponse } from "../../../core/shared/http/jsonResponse.js";
import { enforceRateLimit } from "@/app/core/server/shared/rateLimit.js";

export async function GET(req) {
  const rateLimitResponse = enforceRateLimit(req, {
    routeKey: "api/auth/session",
    limit: 60,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { uid, profile, errorResponse } = await getAuthUserContext(req);
    if (errorResponse) return errorResponse;

    return jsonResponse({
      uid,
      role: normalizeRole(profile.role),
      nombre: profile.nombre || "",
      email: profile.email || "",
      activo: profile.activo !== false,
    });
  } catch (error) {
    console.error("Error obteniendo sesión:", error);
    return jsonResponse({ error: "ServerError", message: "No se pudo cargar la sesión." }, 500);
  }
}
