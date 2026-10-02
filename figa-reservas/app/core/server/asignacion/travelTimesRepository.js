import admin from "firebase-admin";
import { db } from "@/app/lib/firebaseadmin.jsx";

// Cache de tiempos por carretera entre dos puntos. Doc id = claveViaje ("lat,lng>lat,lng").
const COLLECTION = "travelTimes";
const READ_CHUNK = 300;
const WRITE_CHUNK = 400;

function toMillis(value) {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** Devuelve Map<clave, { minutos, km, updatedAtMs }> con los pares que existan. */
export async function getTravelTimes(claves) {
  const result = new Map();
  for (let i = 0; i < claves.length; i += READ_CHUNK) {
    const refs = claves.slice(i, i + READ_CHUNK).map((c) => db.collection(COLLECTION).doc(c));
    if (refs.length === 0) continue;
    const snaps = await db.getAll(...refs);
    for (const snap of snaps) {
      if (!snap.exists) continue;
      const data = snap.data() || {};
      const minutos = Number(data.minutos);
      const km = Number(data.km);
      if (!Number.isFinite(minutos) || !Number.isFinite(km)) continue;
      result.set(snap.id, { minutos, km, updatedAtMs: toMillis(data.updatedAt) });
    }
  }
  return result;
}

/** entries: Map<clave, { minutos, km }> */
export async function saveTravelTimes(entries, provider = "osrm") {
  const list = [...entries.entries()];
  for (let i = 0; i < list.length; i += WRITE_CHUNK) {
    const batch = db.batch();
    for (const [clave, { minutos, km }] of list.slice(i, i + WRITE_CHUNK)) {
      batch.set(db.collection(COLLECTION).doc(clave), {
        minutos,
        km,
        provider,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }
}
