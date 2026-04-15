import { db } from "@/app/lib/firebaseadmin.jsx";
import { serializeFirestoreRefValue } from "@/app/core/shared/firebase/serializeFirestoreRefValue.js";
import {
  createUser,
  getUserByEmail,
  updateUser,
} from "@/app/core/server/shared/providers/firebaseAdminAuthProvider.js";

export async function listUsersOrderedByNombre() {
  const snapshot = await db.collection("users").orderBy("nombre", "asc").get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      uid: serializeFirestoreRefValue(data.uid) || doc.id,
      nombre: String(data.nombre || "").trim(),
      email: String(data.email || "").trim(),
      role: String(data.role || "").trim(),
    };
  });
}

export async function findUserUidByEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return "";

  const snapshot = await db
    .collection("users")
    .where("email", "==", normalizedEmail)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return "";
  }

  const doc = snapshot.docs[0];
  const data = doc.data() || {};
  return String(data.uid || doc.id || "").trim();
}

export async function getAuthUserByEmail(email) {
  return getUserByEmail(email);
}

export async function createAuthUser({ email, password, displayName, disabled }) {
  return createUser({ email, password, displayName, disabled });
}

export async function updateAuthUser(uid, data) {
  return updateUser(uid, data);
}

export async function upsertUserDoc(uid, data, merge = true) {
  await db.collection("users").doc(uid).set(data, { merge });
}
