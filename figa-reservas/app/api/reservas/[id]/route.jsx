import { db } from "../../../lib/firebaseadmin.jsx";

// Función segura para las respuestas JSON
function jsonResponse(data = {}, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Método GET para obtener una reserva por ID
export async function GET(req, { params }) {
  const re = await params;
  if (!re?.id) {
    return jsonResponse({ error: "ID no proporcionado" }, 400);
  }

  try {
    const doc = await db.collection("reservas").doc(re.id).get();

    if (!doc.exists) {
      return jsonResponse({ message: "Reserva no encontrada" }, 404);
    }

    return jsonResponse({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error("Error al obtener la reserva:", error.message);
    return jsonResponse({ message: "Error interno del servidor" }, 500);
  }
}

// Método PUT para actualizar una reserva
export async function PUT(req, { params }) {
  const re = await params;
  if (!re?.id) {
    return jsonResponse({ error: "ID no proporcionado" }, 400);
  }

  try {
    const data = await req.json();

    if (!data || Object.keys(data).length === 0) {
      return jsonResponse({ error: "Datos inválidos" }, 400);
    }

    await db.collection("reservas").doc(re.id).update(data);
    return jsonResponse({ message: "Reserva actualizada correctamente" });
  } catch (error) {
    console.error("Error al actualizar la reserva:", error.message);
    return jsonResponse({ message: "Error interno del servidor" }, 500);
  }
}

// Método DELETE para marcar una reserva como cancelada
export async function DELETE(req, { params }) {
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

    await reservaRef.update({ cancelada: true });
    return jsonResponse({ message: "Reserva marcada como cancelada" });
  } catch (error) {
    console.error("Error al cancelar la reserva:", error.message);
    return jsonResponse({ message: "Error interno del servidor" }, 500);
  }
}

// Método PATCH para actualizar campos específicos
export async function PATCH(req) {
  try {
    const { id, cancelada } = await req.json();

    if (!id || cancelada === undefined) {
      return jsonResponse({ error: "ID o datos no proporcionados" }, 400);
    }

    const reservaRef = db.collection("reservas").doc(id);
    const reservaDoc = await reservaRef.get();

    if (!reservaDoc.exists) {
      return jsonResponse({ message: "Reserva no encontrada" }, 404);
    }

    await reservaRef.update({ cancelada });
    return jsonResponse({ message: "Reserva actualizada correctamente" });
  } catch (error) {
    console.error("Error al actualizar la reserva:", error.message);
    return jsonResponse({ message: "Error interno del servidor" }, 500);
  }
}
