import admin from "firebase-admin";
import { db } from "./firebaseadmin.jsx";
import { normalizeRole } from "./roles.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function dbUnavailableResponse() {
  return json({ error: "ServerError", message: "Firebase Admin no está configurado." }, 500);
}

export function unauthenticatedResponse(message = "No autenticado") {
  return json({ error: "Unauthenticated", message }, 401);
}

export function unauthorizedResponse(message = "No autorizado") {
  return json({ error: "Unauthorized", message }, 403);
}

export async function verifyAuthToken(authHeader) {
  const decoded = await verifyDecodedToken(authHeader);
  return decoded?.uid || null;
}

async function verifyDecodedToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);

  try {
    if (!admin.apps.length) return null;
    return await admin.auth().verifyIdToken(token);
  } catch (error) {
    console.error("Token inválido:", error.message);
    return null;
  }
}

export async function getUserProfile(uid) {
  if (!db || !uid) return null;
  const doc = await db.collection("users").doc(uid).get();
  if (!doc.exists) return null;
  return { uid: doc.id, ...doc.data() };
}

async function findUserProfileByEmail(email) {
  if (!db || !email) return null;

  const snapshot = await db
    .collection("users")
    .where("email", "==", email)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

export async function getAuthUserContext(req) {
  if (!db) return { errorResponse: dbUnavailableResponse() };

  const decoded = await verifyDecodedToken(req.headers.get("authorization"));
  if (!decoded?.uid) {
    return { errorResponse: unauthenticatedResponse("Token inválido o ausente.") };
  }

  const uid = decoded.uid;

  let profile = await getUserProfile(uid);

  // Recuperación automática: perfil existente con email correcto pero doc ID distinto al UID
  if (!profile && decoded.email) {
    const legacyProfile = await findUserProfileByEmail(decoded.email);
    if (legacyProfile) {
      const { id: legacyId, ...legacyData } = legacyProfile;

      await db.collection("users").doc(uid).set(
        {
          ...legacyData,
          uid,
          email: decoded.email,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      if (legacyId !== uid) {
        await db.collection("users").doc(legacyId).set(
          {
            migratedToUid: uid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      profile = await getUserProfile(uid);
    }
  }

  if (!profile) {
    return {
      errorResponse: json(
        {
          error: "ProfileNotFound",
          message: "Tu usuario existe en Firebase Auth, pero no tiene perfil en la colección users.",
        },
        404
      ),
    };
  }

  if (!profile.role) {
    return {
      errorResponse: json(
        {
          error: "RoleMissing",
          message: "Tu usuario no tiene un rol asignado en la colección users.",
        },
        403
      ),
    };
  }

  const normalizedRole = normalizeRole(profile.role);
  if (!normalizedRole) {
    return {
      errorResponse: json(
        {
          error: "RoleMissing",
          message: "Tu usuario no tiene un rol válido en la colección users.",
        },
        403
      ),
    };
  }

  if (profile.activo === false) {
    return {
      errorResponse: json(
        {
          error: "UserInactive",
          message: "Tu usuario está inactivo y no tiene permisos para ingresar.",
        },
        403
      ),
    };
  }

  return { uid, profile: { ...profile, role: normalizedRole } };
}

export function hasRole(profile, allowedRoles) {
  if (!profile?.role) return false;
  const current = normalizeRole(profile.role);
  const normalizedAllowed = allowedRoles.map((r) => normalizeRole(r));
  return normalizedAllowed.includes(current);
}
