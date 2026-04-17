import admin from "firebase-admin";
import { db } from "@/app/lib/firebaseadmin.jsx";
import { serializeFirestoreRefValue } from "@/app/core/shared/firebase/serializeFirestoreRefValue.js";

export async function listConductores({ activos = false } = {}) {
  let query = db.collection("conductores");
  if (activos) query = query.where("activo", "==", true);

  const snapshot = await query.get();
  return snapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        nombre: String(data.nombre || "").trim(),
        telefono: String(data.telefono || "").trim(),
        email: String(data.email || "").trim(),
        cedula: String(data.cedula || "").trim(),
        uid: serializeFirestoreRefValue(data.uid),
      };
    })
    .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")));
}

export async function createConductor(data) {
  const docRef = await db.collection("conductores").add({
    ...data,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return docRef.id;
}

export async function updateConductor(id, data) {
  await db.collection("conductores").doc(id).set(
    {
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function setConductorActivo(id, activo) {
  await db.collection("conductores").doc(id).set(
    {
      activo,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function saveConductorLocation(uid, { lat, lng, accuracy }) {
  const snap = await db
    .collection("conductores")
    .where("uid", "==", uid)
    .limit(1)
    .get();

  const locationData = {
    lastLocation: {
      lat,
      lng,
      accuracy: accuracy != null ? accuracy : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (!snap.empty) {
    await snap.docs[0].ref.set(locationData, { merge: true });
  } else {
    // Fallback: guarda en colección separada por uid para no perder el dato
    await db
      .collection("conductorLocations")
      .doc(uid)
      .set({ uid, ...locationData }, { merge: true });
  }
}
