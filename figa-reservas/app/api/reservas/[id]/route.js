import { db } from "../../../lib/firebaseadmin.js";

export async function GET(req, { params }) {
  try {
    const doc = await db.collection("reservas").doc(params.id).get();
    if (!doc.exists)
      return Response.json(
        { message: "Reserva no encontrada" },
        { status: 404 }
      );

    return Response.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    return Response.json(
      { message: "Error al obtener reserva" },
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
