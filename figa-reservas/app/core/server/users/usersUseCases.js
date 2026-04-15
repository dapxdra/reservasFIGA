import admin from "firebase-admin";
import { randomBytes } from "node:crypto";
import {
  createAuthUser,
  getAuthUserByEmail,
  listUsersOrderedByNombre,
  updateAuthUser,
  upsertUserDoc,
} from "@/app/core/server/users/usersRepository.js";
import {
  validateId,
  validateUserPayload,
} from "@/app/core/server/users/usersValidators.js";

function buildTemporaryPassword() {
  const base = randomBytes(12).toString("base64url");
  return `Tmp#${base}9a`;
}

export async function listUsersUseCase() {
  return listUsersOrderedByNombre();
}

export async function createUserUseCase(payload) {
  const { nombre, email, role, activo } = validateUserPayload(payload);

  let authUser = await getAuthUserByEmail(email);
  let createdNewAuthUser = false;

  if (!authUser) {
    authUser = await createAuthUser({
      email,
      password: buildTemporaryPassword(),
      displayName: nombre,
      disabled: !activo,
    });
    createdNewAuthUser = true;
  } else {
    authUser = await updateAuthUser(authUser.uid, {
      email,
      displayName: nombre,
      disabled: !activo,
    });
  }

  const uid = authUser.uid;

  await upsertUserDoc(
    uid,
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
    true
  );

  return {
    message: createdNewAuthUser ? "Usuario creado" : "Usuario actualizado",
    id: uid,
    email,
    created: createdNewAuthUser,
  };
}

export async function updateUserUseCase(id, payload) {
  validateId(id);
  const { nombre, email, role, activo } = validateUserPayload(payload);

  await updateAuthUser(id, {
    email,
    displayName: nombre,
    disabled: !activo,
  });

  await upsertUserDoc(
    id,
    {
      uid: id,
      nombre,
      email,
      role,
      activo,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    true
  );
}

export async function toggleUserStatusUseCase(id, activo) {
  validateId(id);
  const status = activo !== false;

  await updateAuthUser(id, { disabled: !status });

  await upsertUserDoc(
    id,
    {
      activo: status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    true
  );

  return status;
}
