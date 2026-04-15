import { db } from "@/app/lib/firebaseadmin.jsx";

export async function getLastFigaId() {
  const snapshot = await db
    .collection("reservas")
    .orderBy("figaId", "desc")
    .limit(1)
    .get();

  if (snapshot.empty) return 0;
  return Number(snapshot.docs[0].data()?.figaId || 0);
}

export async function createReservaById(id, data) {
  await db.collection("reservas").doc(String(id)).set(data);
}

export async function listReservasOrderedByFecha() {
  const snapshot = await db.collection("reservas").orderBy("fecha", "asc").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getReservaById(id) {
  const doc = await db.collection("reservas").doc(String(id)).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

export async function updateReservaById(id, updates) {
  await db.collection("reservas").doc(String(id)).update(updates);
}
