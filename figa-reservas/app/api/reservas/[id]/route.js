import { db } from "../../../lib/firebaseadmin.js";

export async function GET(req, { params }) {
  try {
    const id = params?.id;

    if (!id) {
      return Response.json({ message: "ID no proporcionado" }, { status: 400 });
    }

    const doc = await db.collection("reservas").doc(id).get();

    if (!doc.exists) {
      return Response.json(
        { message: "Reserva no encontrada" },
        { status: 404 }
      );
    }

    return Response.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error("Error al obtener la reserva:", error);
    return Response.json(
      { message: "Error al obtener la reserva" },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    const data = await req.json();
    await db.collection("reservas").doc(params.id).update(data);

    return Response.json({ message: "Reserva actualizada correctamente" });
  } catch (error) {
    return Response.json(
      { message: "Error al actualizar reserva" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    if (!params || !params.id) {
      return Response.json({ message: "ID no proporcionado" }, { status: 400 });
    }

    const reservaId = params.id;

    const reservaRef = db.collection("reservas").doc(reservaId);
    const reservaDoc = await reservaRef.get();

    if (!reservaDoc.exists) {
      return Response.json(
        { message: "Reserva no encontrada" },
        { status: 404 }
      );
    }

    // Actualizar el campo "cancelada" a true
    await reservaRef.update({ cancelada: true });

    return Response.json({ message: "Reserva marcada como cancelada" });
  } catch (error) {
    console.error("Error al cancelar reserva:", error);
    return Response.json(
      { message: "Error al cancelar reserva" },
      { status: 500 }
    );
  }
}
export async function PATCH(req) {
  try {
    const { id, cancelada } = await req.json(); // Obtener el ID desde el cuerpo de la solicitud

    if (!id) {
      return Response.json({ message: "ID no proporcionado" }, { status: 400 });
    }

    const reservaRef = db.collection("reservas").doc(id);
    const reservaDoc = await reservaRef.get();

    if (!reservaDoc.exists) {
      return Response.json(
        { message: "Reserva no encontrada" },
        { status: 404 }
      );
    }

    // Actualiza el campo 'cancelada' a true
    await reservaRef.update({ cancelada });

    return Response.json({ message: "Reserva actualizada correctamente" });
  } catch (error) {
    console.error("Error al actualizar reserva:", error);
    return Response.json(
      { message: "Error al actualizar reserva" },
      { status: 500 }
    );
  }
}
