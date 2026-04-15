import admin from "firebase-admin";
import { db } from "@/app/lib/firebaseadmin.jsx";
import { getUser } from "@/app/core/server/shared/providers/firebaseAdminAuthProvider.js";
import { validateAuthSetupPayload } from "@/app/core/server/auth/authValidators.js";
import { appError } from "@/app/core/server/shared/appError.js";

export async function createInitialAdminProfileUseCase({ uid, payload }) {
  if (!db || !admin.apps.length) {
    throw appError("Firebase Admin no inicializado.", 500, "ServerError");
  }

  if (!uid) {
    throw appError("Debes iniciar sesión.", 401, "Unauthenticated");
  }

  const existingAdmin = await db
    .collection("users")
    .where("role", "==", "admin")
    .limit(1)
    .get();

  if (!existingAdmin.empty) {
    throw appError("Ya existe un administrador.", 403, "SetupAlreadyDone");
  }

  const authUser = await getUser(uid);
  const { nombre } = validateAuthSetupPayload(payload);

  const normalizedName =
    nombre || authUser.displayName || authUser.email?.split("@")[0] || "Admin";

  await db.collection("users").doc(uid).set({
    uid,
    nombre: normalizedName,
    email: authUser.email || "",
    role: "admin",
    activo: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true, message: "Perfil admin creado", uid, role: "admin" };
}
