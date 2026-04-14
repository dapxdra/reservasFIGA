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

export async function GET(req) {
  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, [ROLES.ADMIN, ROLES.OPERADOR])) {
    console.warn(`GET /api/vehiculos: Usuario ${profile?.email} sin permisos (rol: ${profile?.role})`);
    return unauthorizedResponse("No tienes permisos para ver vehículos.");
  }

  try {
    const url = new URL(req.url);
    const activos = url.searchParams.get("activos") === "true";
    let query = db.collection("vehiculos");
    if (activos) {
      query = query.where("activo", "==", true);
    }

    const snapshot = await query.get();
    console.log(`GET /api/vehiculos: Se encontraron ${snapshot.size} vehículos`);

    const vehiculos = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => String(a.placa || "").localeCompare(String(b.placa || "")));
    return json(vehiculos);
  } catch (error) {
    console.error("GET /api/vehiculos: Error detallado:", error.message, error.code);
    return json({
      message: "Error al cargar vehículos",
      error: error.message || "Error desconocido",
      code: error.code
    }, 500);
  }
}

export async function POST(req) {
  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, [ROLES.ADMIN, ROLES.OPERADOR])) {
    return unauthorizedResponse("No tienes permisos para crear vehículos.");
  }

  try {
    const body = await req.json();
    const placa = String(body.placa || "").trim().toUpperCase();
    if (!placa) return json({ error: "placa es requerida" }, 400);

    const docRef = await db.collection("vehiculos").add({
      placa,
      modelo: String(body.modelo || "").trim(),
      tipo: String(body.tipo || "").trim(),
      capacidad: Number(body.capacidad) || 0,
      activo: body.activo !== false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return json({ message: "Vehículo creado", id: docRef.id }, 201);
  } catch (error) {
    console.error("Error creando vehículo:", error);
    return json({ message: "Error interno del servidor" }, 500);
  }
}
