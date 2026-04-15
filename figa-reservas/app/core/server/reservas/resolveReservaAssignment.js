import { db } from "@/app/lib/firebaseadmin.jsx";

export async function resolveReservaAssignment(conductorId, vehiculoId) {
  const [conductorDoc, vehiculoDoc] = await Promise.all([
    conductorId
      ? db.collection("conductores").doc(conductorId).get()
      : Promise.resolve(null),
    vehiculoId
      ? db.collection("vehiculos").doc(vehiculoId).get()
      : Promise.resolve(null),
  ]);

  const conductorData = conductorDoc?.exists ? conductorDoc.data() : null;
  const vehiculoData = vehiculoDoc?.exists ? vehiculoDoc.data() : null;

  return {
    conductorNombre: conductorData?.nombre || "",
    assignedUid: conductorData?.uid || "",
    vehiculoPlaca: vehiculoData?.placa || "",
  };
}
