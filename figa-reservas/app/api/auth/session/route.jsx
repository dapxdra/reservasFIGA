import { getAuthUserContext } from "../../../lib/serverAuth.js";
import { normalizeRole } from "../../../lib/roles.js";
import { jsonResponse } from "../../../core/shared/http/jsonResponse.js";

export async function GET(req) {
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
