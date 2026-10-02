import { createHash } from "node:crypto";
import admin from "firebase-admin";
import { db } from "@/app/lib/firebaseadmin.jsx";

// Un doc por dispositivo (token FCM). El id es un hash para no depender del formato del token.
const COLLECTION = "deviceTokens";

function docId(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

export async function saveDeviceToken({ uid, token, platform }) {
  await db.collection(COLLECTION).doc(docId(token)).set({
    uid,
    token,
    platform,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function deleteDeviceToken(token) {
  await db.collection(COLLECTION).doc(docId(token)).delete();
}

export async function listDeviceTokensByUid(uid) {
  const snapshot = await db.collection(COLLECTION).where("uid", "==", uid).get();
  return snapshot.docs.map((doc) => doc.data()?.token).filter(Boolean);
}
