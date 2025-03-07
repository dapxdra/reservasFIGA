import { db } from "../../lib/firebaseadmin.js";
import { collection, query, where, getDocs } from "firebase/firestore";

export const POST = async (req) => {
  try {
    const body = await req.JSON();
    const reservasRef = db.collection("reservas");

    // Obtener el último ID registrado
    const lastReservaSnap = await reservasRef
      .orderBy("figaId", "desc")
      .limit(1)
      .get();
    let newId = 1;

    if (!lastReservaSnap.empty) {
      newId = lastReservaSnap.docs[0].data().figaId + 1;
    }

    // Crear la nueva reserva con ID incremental
    const newReserva = {
      figaId: newId,
      itinId: body.itinId || 0,
      cliente: body.cliente || "",
      fecha: body.fecha || "",
      hora: body.hora || "",
      dropOff: body.dropOff || "",
      pickUp: body.pickUp || "",
      proveedor: body.proveedor || "",
      nota: body.nota || "",
      precio: body.precio || 0,
      AD: body.AD || 0,
      NI: body.NI || 0,
      pago: body.pago || false,
      fechaPago: body.fechaPago || "",
      cancelada: body.cancelada || false,
      createdAt: new Date().toString(),
    };

    await reservasRef.doc(newId.toString()).set(newReserva);

    return new Response(
      JSON.stringify({ message: "Reserva creada", id: newId }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error al insertar reserva:", error);
    return new Response(JSON.stringify({ message: "Error en el servidor" }), {
      status: 500,
    });
  }
};

// Obtiene todas las reservas
export const GET = async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter");

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Resetea las horas para comparar solo fechas

    let query = db.collection("reservas").where("cancelada", "==", false);

    if (filter === "antiguas") {
      query = query.where("fecha", "<", today);
    } else {
      // Por defecto muestra las actuales (hoy en adelante)
      query = query.where("fecha", ">=", today);
    }
    const snapshot = await db.collection("reservas").get();
    const reservas = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return new Response(JSON.stringify(reservas));
  } catch (error) {
    return new Response(
      JSON.stringify({ message: "Error al obtener reservas" }, { status: 500 })
    );
  }
};
// Elimina una reserva
/* export const DELETE = async (req) => {
  try {
    const { id } = await req.json();
    await db.collection("reservas").doc(id).delete();

    return Response.json({ message: "Reserva eliminada correctamente" });
  } catch (error) {
    return Response.json(
      { message: "Error al eliminar reserva" },
      { status: 500 }
    );
  }
}; */
