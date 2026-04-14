import { getAuthUserContext } from "../../../lib/serverAuth.js";
import { normalizeRole } from "../../../lib/roles.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(req) {
  try {
    const { uid, profile, errorResponse } = await getAuthUserContext(req);
    if (errorResponse) return errorResponse;

    return json({
      uid,
      role: normalizeRole(profile.role),
      nombre: profile.nombre || "",
      email: profile.email || "",
      activo: profile.activo !== false,
    });
  } catch (error) {
    console.error("Error obteniendo sesión:", error);
    return json({ error: "ServerError", message: "No se pudo cargar la sesión." }, 500);
  }
}
