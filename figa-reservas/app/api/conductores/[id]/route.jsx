import admin from "firebase-admin";
import { ROLES } from "../../../lib/roles.js";
import { getAuthUserContext, hasRole, unauthorizedResponse } from "../../../lib/serverAuth.js";
import { db } from "../../../lib/firebaseadmin.jsx";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function PUT(req, { params }) {
  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, ["admin", "operador"])) {
    return unauthorizedResponse("No tienes permisos para editar conductores.");
  }

  const { id } = await params;
  if (!id) return json({ error: "ID no proporcionado" }, 400);

  try {
    const body = await req.json();
    const nombre = String(body.nombre || "").trim();
    if (!nombre) return json({ error: "nombre es requerido" }, 400);

    await db.collection("conductores").doc(id).set(
      {
        nombre,
        telefono: String(body.telefono || "").trim(),
        email: String(body.email || "").trim(),
        cedula: String(body.cedula || "").trim(),
        uid: String(body.uid || "").trim(),
        activo: body.activo !== false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return json({ message: "Conductor actualizado" });
  } catch (error) {
    console.error("Error actualizando conductor:", error);
    return json({ message: "Error interno del servidor" }, 500);
  }
}

export async function PATCH(req, { params }) {
  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, [ROLES.ADMIN, ROLES.OPERADOR])) {
    return unauthorizedResponse("No tienes permisos para cambiar estado de conductores.");
  }

  const { id } = await params;
  if (!id) return json({ error: "ID no proporcionado" }, 400);

  try {
    const body = await req.json();
    const activo = body.activo !== false;

    await db.collection("conductores").doc(id).set(
      {
        activo,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return json({ message: activo ? "Conductor activado" : "Conductor desactivado" });
  } catch (error) {
    console.error("Error actualizando estado conductor:", error);
    return json({ message: "Error interno del servidor" }, 500);
  }
}
