import { db } from "../../../lib/firebaseadmin.js";

export async function GET(req, { params }) {
  if (!params || !params.id) {
    return new Response(JSON.stringify({ error: "ID no proporcionado" }), {
      status: 400,
    });
  }
  try {
    const id = params.id;

    if (!id) {
      return new Response(
        JSON.stringify({ message: "ID no proporcionado" }, { status: 400 })
      );
    }

    const doc = await db.collection("reservas").doc(id).get();

    if (!doc.exists) {
      return new Response(
        JSON.stringify({ message: "Reserva no encontrada" }, { status: 404 })
      );
    }

    return new Response(JSON.stringify({ id: doc.id, ...doc.data() }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error al obtener la reserva:", error);
    return Response(
      JSON.stringify(
        { message: "Error al obtener la reserva" },
        { status: 500 }
      )
    );
  }
}

// Método PUT para actualizar una reserva
export async function PUT(req, { params }) {
  if (!params || !params.id) {
    return new Response(JSON.stringify({ message: "ID no proporcionado" }), {
      status: 400,
    });
  }

  try {
    const data = await req.json();
    await db.collection("reservas").doc(params.id).update(data);

    return new Response(
      JSON.stringify({ message: "Reserva actualizada correctamente" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error al actualizar reserva:", error);
    return new Response(
      JSON.stringify({ message: "Error al actualizar reserva" }),
      { status: 500 }
    );
  }
}

// Método DELETE para marcar una reserva como cancelada
export async function DELETE(req, { params }) {
  if (!params || !params.id) {
    return new Response(JSON.stringify({ message: "ID no proporcionado" }), {
      status: 400,
    });
  }

  try {
    const reservaRef = db.collection("reservas").doc(params.id);
    const reservaDoc = await reservaRef.get();

    if (!reservaDoc.exists) {
      return new Response(
        JSON.stringify({ message: "Reserva no encontrada" }),
        { status: 404 }
      );
    }

    await reservaRef.update({ cancelada: true });

    return new Response(
      JSON.stringify({ message: "Reserva marcada como cancelada" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error al cancelar reserva:", error);
    return new Response(
      JSON.stringify({ message: "Error al cancelar reserva" }),
      { status: 500 }
    );
  }
}
// Método PATCH para actualizar el estado 'cancelada'
export async function PATCH(req) {
  try {
    const { id, cancelada } = await req.json();

    if (!id) {
      return new Response(JSON.stringify({ message: "ID no proporcionado" }), {
        status: 400,
      });
    }

    const reservaRef = db.collection("reservas").doc(id);
    const reservaDoc = await reservaRef.get();

    if (!reservaDoc.exists) {
      return new Response(
        JSON.stringify({ message: "Reserva no encontrada" }),
        { status: 404 }
      );
    }

    await reservaRef.update({ cancelada });

    return new Response(
      JSON.stringify({ message: "Reserva actualizada correctamente" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error al actualizar reserva:", error);
    return new Response(
      JSON.stringify({ message: "Error al actualizar reserva" }),
      { status: 500 }
    );
  }
}
