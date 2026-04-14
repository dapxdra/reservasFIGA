import admin from "firebase-admin";
import { ROLES } from "../../lib/roles.js";
import { getAuthUserContext, hasRole, unauthorizedResponse } from "../../lib/serverAuth.js";
import { db } from "../../lib/firebaseadmin.jsx";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function serializeRefValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (typeof value === "object") {
    try {
      if (typeof value.path === "string") {
        const parts = value.path.split("/");
        return parts[parts.length - 1] || value.path;
      }
      if (Array.isArray(value._path?.segments)) {
        const segments = value._path.segments;
        return segments[segments.length - 1] || "";
      }
    } catch (e) {
      console.warn("Error serializando ref value:", e);
      return "";
    }
  }

  return "";
}

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
    let query = db.collection("conductores");
    if (activos) {
      query = query.where("activo", "==", true);
    }

    const snapshot = await query.get();
    console.log(`GET /api/conductores: Se encontraron ${snapshot.size} conductores`);

    const conductores = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          nombre: String(data.nombre || "").trim(),
          telefono: String(data.telefono || "").trim(),
          email: String(data.email || "").trim(),
          cedula: String(data.cedula || "").trim(),
          uid: serializeRefValue(data.uid),
        };
      })
      .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")));

    return json(conductores);
  } catch (error) {
    console.error("GET /api/conductores: Error detallado:", error.message, error.code);
    return json({
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
    const nombre = String(body.nombre || "").trim();

    if (!nombre) {
      return json({ error: "nombre es requerido" }, 400);
    }

    const docRef = await db.collection("conductores").add({
      nombre,
      telefono: String(body.telefono || "").trim(),
      email: String(body.email || "").trim(),
      cedula: String(body.cedula || "").trim(),
      uid: String(body.uid || "").trim(),
      activo: body.activo !== false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return json({ message: "Conductor creado", id: docRef.id }, 201);
  } catch (error) {
    console.error("Error creando conductor:", error);
    return json({ message: "Error interno del servidor" }, 500);
  }
}
