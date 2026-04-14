import admin from "firebase-admin";
import { randomBytes } from "node:crypto";
import { normalizeRole, ROLES } from "../../lib/roles.js";
import { getAuthUserContext, hasRole, unauthorizedResponse } from "../../lib/serverAuth.js";
import { db } from "../../lib/firebaseadmin.jsx";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function serializeRefValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    if (typeof value.path === "string") {
      const parts = value.path.split("/");
      return parts[parts.length - 1] || value.path;
    }
    if (Array.isArray(value._path?.segments)) {
      const segments = value._path.segments;
      return segments[segments.length - 1] || "";
    }
  }
  return "";
}

function buildTemporaryPassword() {
  const base = randomBytes(12).toString("base64url");
  return `Tmp#${base}9a`;
}

export async function GET(req) {
  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, [ROLES.ADMIN])) {
    return unauthorizedResponse("Solo administradores pueden ver usuarios.");
  }

  try {
    const snapshot = await db.collection("users").orderBy("nombre", "asc").get();
    const users = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        uid: serializeRefValue(data.uid) || doc.id,
        nombre: String(data.nombre || "").trim(),
        email: String(data.email || "").trim(),
        role: String(data.role || "").trim(),
      };
    });
    return json(users);
  } catch (error) {
    console.error("Error listando users:", error);
    return json({ message: "Error interno del servidor" }, 500);
  }
}

export async function POST(req) {
  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, [ROLES.ADMIN])) {
    return unauthorizedResponse("Solo administradores pueden crear usuarios.");
  }

  try {
    const body = await req.json();
    const nombre = String(body.nombre || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const role = normalizeRole(body.role);
    const activo = body.activo !== false;

    if (!nombre || !email || !role) {
      return json({ error: "nombre, email y role son requeridos" }, 400);
    }

    if (!Object.values(ROLES).includes(role)) {
      return json({ error: "role inválido" }, 400);
    }

    let authUser = null;
    let createdNewAuthUser = false;
    try {
      authUser = await admin.auth().getUserByEmail(email);
    } catch (error) {
      if (error.code !== "auth/user-not-found") {
        throw error;
      }
    }

    if (!authUser) {
      authUser = await admin.auth().createUser({
        email,
        password: buildTemporaryPassword(),
        displayName: nombre,
        disabled: !activo,
      });
      createdNewAuthUser = true;
    } else {
      authUser = await admin.auth().updateUser(authUser.uid, {
        email,
        displayName: nombre,
        disabled: !activo,
      });
    }

    const uid = authUser.uid;

    await db.collection("users").doc(uid).set(
      {
        uid,
        nombre,
        email,
        role,
        activo,
        ...(createdNewAuthUser
          ? { createdAt: admin.firestore.FieldValue.serverTimestamp() }
          : {}),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return json(
      {
        message: createdNewAuthUser ? "Usuario creado" : "Usuario actualizado",
        id: uid,
        email,
        created: createdNewAuthUser,
      },
      201
    );
  } catch (error) {
    console.error("Error creando user:", error);
    if (error.code === "auth/email-already-exists") {
      return json({ message: "El correo ya existe en Firebase Authentication." }, 409);
    }
    return json({ message: error.message || "Error interno del servidor" }, 500);
  }
}
