import admin from "firebase-admin";
import { db } from "@/app/lib/firebaseadmin.jsx";

export async function listVehiculos({ activos = false } = {}) {
  let query = db.collection("vehiculos");
  if (activos) query = query.where("activo", "==", true);

  const snapshot = await query.get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => String(a.placa || "").localeCompare(String(b.placa || "")));
}

export async function createVehiculo(data) {
  const docRef = await db.collection("vehiculos").add({
    ...data,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return docRef.id;
}

export async function updateVehiculo(id, data) {
  await db.collection("vehiculos").doc(id).set(
    {
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function setVehiculoActivo(id, activo) {
  await db.collection("vehiculos").doc(id).set(
    {
      activo,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}
