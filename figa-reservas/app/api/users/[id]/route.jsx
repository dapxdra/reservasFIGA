import admin from "firebase-admin";
import { normalizeRole, ROLES } from "../../../lib/roles.js";
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
  if (!hasRole(profile, [ROLES.ADMIN])) return unauthorizedResponse("Solo administradores.");

  const { id } = await params;
  if (!id) return json({ error: "ID no proporcionado" }, 400);

  try {
    const body = await req.json();
    const nombre = String(body.nombre || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const role = normalizeRole(body.role);
    const activo = body.activo !== false;

    if (!nombre || !email || !role) {
      return json({ error: "nombre, email y role son requeridos" }, 400);
    }
    if (!Object.values(ROLES).includes(role)) {
      return json({ error: "role inválido" }, 400);
    }

    try {
      await admin.auth().updateUser(id, {
        email,
        displayName: nombre,
        disabled: !activo,
      });
    } catch (error) {
      if (error.code !== "auth/user-not-found") {
        throw error;
      }
    }

    await db.collection("users").doc(id).set(
      {
        uid: id,
        nombre,
        email,
        role,
        activo,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return json({ message: "Usuario actualizado" });
  } catch (error) {
    console.error("Error actualizando user:", error);
    return json({ message: "Error interno del servidor" }, 500);
  }
}

export async function PATCH(req, { params }) {
  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;
  if (!hasRole(profile, [ROLES.ADMIN])) return unauthorizedResponse("Solo administradores.");

  const { id } = await params;
  if (!id) return json({ error: "ID no proporcionado" }, 400);

  try {
    const body = await req.json();
    const activo = body.activo !== false;

    try {
      await admin.auth().updateUser(id, {
        disabled: !activo,
      });
    } catch (error) {
      if (error.code !== "auth/user-not-found") {
        throw error;
      }
    }

    await db.collection("users").doc(id).set(
      {
        activo,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return json({ message: activo ? "Usuario activado" : "Usuario desactivado" });
  } catch (error) {
    console.error("Error cambiando estado user:", error);
    return json({ message: "Error interno del servidor" }, 500);
  }
}
