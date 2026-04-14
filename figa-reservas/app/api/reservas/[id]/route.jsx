import { db } from "../../../lib/firebaseadmin.jsx";
import admin from "firebase-admin";
import { ROLES } from "../../../lib/roles.js";
import { getAuthUserContext, hasRole, unauthorizedResponse } from "../../../lib/serverAuth.js";

// Función segura para las respuestas JSON
function jsonResponse(data = {}, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function ensureDb() {
  if (!db) {
    return jsonResponse(
      { message: "Firebase Admin no está configurado en el servidor" },
      500
    );
  }
  return null;
}

async function resolveAsignacion(conductorId, vehiculoId) {
  const [conductorDoc, vehiculoDoc] = await Promise.all([
    conductorId ? db.collection("conductores").doc(conductorId).get() : Promise.resolve(null),
    vehiculoId ? db.collection("vehiculos").doc(vehiculoId).get() : Promise.resolve(null),
  ]);

  const conductorData = conductorDoc?.exists ? conductorDoc.data() : null;
  const vehiculoData = vehiculoDoc?.exists ? vehiculoDoc.data() : null;

  return {
    conductorNombre: conductorData?.nombre || "",
    assignedUid: conductorData?.uid || "",
    vehiculoPlaca: vehiculoData?.placa || "",
  };
}

// Método GET para obtener una reserva por ID
export async function GET(req, { params }) {
  const dbError = ensureDb();
  if (dbError) return dbError;

  const { uid, profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  const re = await params;
  if (!re?.id) {
    return jsonResponse({ error: "ID no proporcionado" }, 400);
  }

  try {
    const doc = await db.collection("reservas").doc(re.id).get();

    if (!doc.exists) {
      return jsonResponse({ message: "Reserva no encontrada" }, 404);
    }

    const reserva = doc.data();
    if (hasRole(profile, [ROLES.CONDUCTOR])) {
      const assignedUid = String(reserva.assignedUid || "").trim();
      if (!assignedUid || assignedUid !== uid) {
        return unauthorizedResponse("No tienes permisos para ver esta reserva.");
      }
    }

    return jsonResponse({ id: doc.id, ...reserva });
  } catch (error) {
    console.error("Error al obtener la reserva:", error.message);
    return jsonResponse({ message: "Error interno del servidor" }, 500);
  }
}

// Método PUT para actualizar una reserva
export async function PUT(req, { params }) {
  const dbError = ensureDb();
  if (dbError) return dbError;

  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;
  if (!hasRole(profile, [ROLES.ADMIN, ROLES.OPERADOR])) {
    return unauthorizedResponse("No tienes permisos para editar reservas.");
  }

  const re = await params;
  if (!re?.id) {
    return jsonResponse({ error: "ID no proporcionado" }, 400);
  }

  try {
    const data = await req.json();

    if (!data || Object.keys(data).length === 0) {
      return jsonResponse({ error: "Datos inválidos" }, 400);
    }

    const updateData = { ...data };
    if (Object.prototype.hasOwnProperty.call(data, "conductorId") || Object.prototype.hasOwnProperty.call(data, "vehiculoId")) {
      const conductorId = data.conductorId || "";
      const vehiculoId = data.vehiculoId || "";
      const { conductorNombre, assignedUid, vehiculoPlaca } = await resolveAsignacion(
        conductorId,
        vehiculoId
      );

      updateData.conductorNombre = conductorNombre;
      updateData.chofer = conductorNombre;
      updateData.assignedUid = assignedUid;
      updateData.vehiculoPlaca = vehiculoPlaca;
      updateData.buseta = vehiculoPlaca;
    }

    await db.collection("reservas").doc(re.id).update(updateData);
    return jsonResponse({ message: "Reserva actualizada correctamente" });
  } catch (error) {
    console.error("Error al actualizar la reserva:", error.message);
    return jsonResponse({ message: "Error interno del servidor" }, 500);
  }
}

// Método DELETE para marcar una reserva como cancelada
export async function DELETE(req, { params }) {
  const dbError = ensureDb();
  if (dbError) return dbError;

  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;
  if (!hasRole(profile, [ROLES.ADMIN, ROLES.OPERADOR])) {
    return unauthorizedResponse("No tienes permisos para cancelar reservas.");
  }

  const re = await params;
  if (!re?.id) {
    return jsonResponse({ error: "ID no proporcionado" }, 400);
  }

  try {
    const reservaRef = db.collection("reservas").doc(re.id);
    const reservaDoc = await reservaRef.get();

    if (!reservaDoc.exists) {
      return jsonResponse({ message: "Reserva no encontrada" }, 404);
    }
    const data = reservaDoc.data();
    const updates = { cancelada: true };
    if (!data.canceledAt) {
      updates.canceledAt = new Date().toString();
    }

    await reservaRef.update(updates);
    return jsonResponse({ message: "Reserva marcada como cancelada" });
  } catch (error) {
    console.error("Error al cancelar la reserva:", error.message);
    return jsonResponse({ message: "Error interno del servidor" }, 500);
  }
}

// Método PATCH para actualizar campos específicos
export async function PATCH(req) {
  try {
    const dbError = ensureDb();
    if (dbError) return dbError;

    const { profile, errorResponse } = await getAuthUserContext(req);
    if (errorResponse) return errorResponse;
    if (!hasRole(profile, [ROLES.ADMIN, ROLES.OPERADOR])) {
      return unauthorizedResponse("No tienes permisos para actualizar reservas.");
    }

    const { id, cancelada } = await req.json();

    if (!id || cancelada === undefined) {
      return jsonResponse({ error: "ID o datos no proporcionados" }, 400);
    }

    const reservaRef = db.collection("reservas").doc(id);
    const reservaDoc = await reservaRef.get();

    if (!reservaDoc.exists) {
      return jsonResponse({ message: "Reserva no encontrada" }, 404);
    }

    const prev = reservaDoc.data();
    const updates = { cancelada };
    if (!prev.canceledAt && cancelada) {
      updates.canceledAt = new Date().toString();
    }

    await reservaRef.update(updates);
    return jsonResponse({ message: "Reserva actualizada correctamente" });
  } catch (error) {
    console.error("Error al actualizar la reserva:", error.message);
    return jsonResponse({ message: "Error interno del servidor" }, 500);
  }
}
