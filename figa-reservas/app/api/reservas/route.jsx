import { db } from "../../lib/firebaseadmin.jsx";

export const POST = async (req) => {
  try {
    const body = await req.json();
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
      itinId: parseInt(body.itinId) || 0,
      cliente: body.cliente || "",
      fecha: body.fecha || "",
      hora: body.hora || "",
      dropOff: body.dropOff || "",
      pickUp: body.pickUp || "",
      proveedor: body.proveedor || "",
      nota: body.nota || "",
      precio: parseFloat(body.precio) || 0,
      AD: parseInt(body.AD) || 0,
      NI: parseInt(body.NI) || 0,
      chofer: body.chofer || "",
      buseta: parseInt(body.buseta) || 0,
      pago: body.pago == "on",
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
    const snapshot = await db
      .collection("reservas")
      .orderBy("fecha", "asc")
      .get();
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
