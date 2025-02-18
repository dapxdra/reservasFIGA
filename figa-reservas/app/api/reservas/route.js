import { db } from "../../lib/firebase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  try {
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
      itinId: req.body.itinId || 0,
      cliente: req.body.cliente || "",
      fecha: req.body.fecha || "",
      hora: req.body.hora || "",
      dropOff: req.body.dropOff || "",
      pickUp: req.body.pickUp || "",
      proveedor: req.body.proveedor || "",
      nota: req.body.nota || "",
      precio: req.body.precio || 0,
      AD: req.body.AD || 0,
      NI: req.body.NI || 0,
      createdAt: new Date(),
    };

    await reservasRef.doc(newId.toString()).set(newReserva);

    return res.status(200).json({ message: "Reserva creada", id: newId });
  } catch (error) {
    console.error("Error al insertar reserva:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
}
