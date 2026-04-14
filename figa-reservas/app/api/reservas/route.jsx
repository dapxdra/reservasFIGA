import { db } from "../../lib/firebaseadmin.jsx";
import { ROLES } from "../../lib/roles.js";
import { getAuthUserContext, hasRole, unauthorizedResponse } from "../../lib/serverAuth.js";

const dbUnavailable = () =>
  new Response(
    JSON.stringify({ message: "Firebase Admin no está configurado en el servidor" }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );

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

export const POST = async (req) => {
  try {
    if (!db) return dbUnavailable();

    const { profile, errorResponse } = await getAuthUserContext(req);
    if (errorResponse) return errorResponse;
    if (!hasRole(profile, [ROLES.ADMIN, ROLES.OPERADOR])) {
      return unauthorizedResponse("No tienes permisos para crear reservas.");
    }

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

    const conductorId = body.conductorId || "";
    const vehiculoId = body.vehiculoId || "";
    const { conductorNombre, assignedUid, vehiculoPlaca } = await resolveAsignacion(
      conductorId,
      vehiculoId
    );

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
      conductorId,
      conductorNombre,
      chofer: conductorNombre,
      vehiculoId,
      vehiculoPlaca,
      buseta: vehiculoPlaca,
      assignedUid,
      pago: body.pago == "on" || body.pago === true,
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
    if (!db) return dbUnavailable();

    const { uid, profile, errorResponse } = await getAuthUserContext(req);
    if (errorResponse) return errorResponse;

    const isConductor = hasRole(profile, [ROLES.CONDUCTOR]);

    const snapshot = await db.collection("reservas").orderBy("fecha", "asc").get();
    let reservas = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (isConductor) {
      const currentUid = String(uid || "").trim();
      const conductorNombre = String(profile?.nombre || "")
        .trim()
        .toLowerCase();

      reservas = reservas.filter((reserva) => {
        const assignedUid = String(reserva.assignedUid || "").trim();
        if (assignedUid && currentUid) {
          return assignedUid === currentUid;
        }

        const nombreAsignado = String(reserva.conductorNombre || reserva.chofer || "")
          .trim()
          .toLowerCase();

        return Boolean(conductorNombre) && nombreAsignado === conductorNombre;
      });
    }

    return new Response(JSON.stringify(reservas), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error al obtener reservas:", error);
    return new Response(
      JSON.stringify({ message: "Error al obtener reservas" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
