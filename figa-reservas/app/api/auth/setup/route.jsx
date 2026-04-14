import admin from "firebase-admin";
import { db } from "../../../lib/firebaseadmin.jsx";
import { verifyAuthToken } from "../../../lib/serverAuth.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req) {
  try {
    if (!db || !admin.apps.length) {
      return json({ error: "ServerError", message: "Firebase Admin no inicializado." }, 500);
    }

    const uid = await verifyAuthToken(req.headers.get("authorization"));
    if (!uid) {
      return json({ error: "Unauthenticated", message: "Debes iniciar sesión." }, 401);
    }

    const existingAdmin = await db.collection("users").where("role", "==", "admin").limit(1).get();
    if (!existingAdmin.empty) {
      return json({ error: "SetupAlreadyDone", message: "Ya existe un administrador." }, 403);
    }

    const authUser = await admin.auth().getUser(uid);
    const body = await req.json().catch(() => ({}));
    const nombre = body.nombre || authUser.displayName || authUser.email?.split("@")[0] || "Admin";

    await db.collection("users").doc(uid).set({
      uid,
      nombre,
      email: authUser.email || "",
      role: "admin",
      activo: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return json({ ok: true, message: "Perfil admin creado", uid, role: "admin" });
  } catch (error) {
    console.error("Error setup auth:", error);
    return json({ error: "ServerError", message: "Error interno del servidor." }, 500);
  }
}
