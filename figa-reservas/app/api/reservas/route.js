import { db } from "../../lib/firebaseadmin.js";

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
      newId = lastReservaSnap.docs[0].data().figaIdId + 1;
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
      createdAt: new Date(),
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
