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

  if (!hasRole(profile, [ROLES.ADMIN, ROLES.OPERADOR])) {
    return unauthorizedResponse("No tienes permisos para editar vehículos.");
  }

  const { id } = await params;
  if (!id) return json({ error: "ID no proporcionado" }, 400);

  try {
    const body = await req.json();
    const placa = String(body.placa || "").trim().toUpperCase();
    if (!placa) return json({ error: "placa es requerida" }, 400);

    await db.collection("vehiculos").doc(id).set(
      {
        placa,
        modelo: String(body.modelo || "").trim(),
        tipo: String(body.tipo || "").trim(),
        capacidad: Number(body.capacidad) || 0,
        activo: body.activo !== false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return json({ message: "Vehículo actualizado" });
  } catch (error) {
    console.error("Error actualizando vehículo:", error);
    return json({ message: "Error interno del servidor" }, 500);
  }
}

export async function PATCH(req, { params }) {
  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, [ROLES.ADMIN, ROLES.OPERADOR])) {
    return unauthorizedResponse("No tienes permisos para cambiar estado de vehículos.");
  }

  const { id } = await params;
  if (!id) return json({ error: "ID no proporcionado" }, 400);

  try {
    const body = await req.json();
    const activo = body.activo !== false;

    await db.collection("vehiculos").doc(id).set(
      {
        activo,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return json({ message: activo ? "Vehículo activado" : "Vehículo desactivado" });
  } catch (error) {
    console.error("Error actualizando estado vehículo:", error);
    return json({ message: "Error interno del servidor" }, 500);
  }
}
