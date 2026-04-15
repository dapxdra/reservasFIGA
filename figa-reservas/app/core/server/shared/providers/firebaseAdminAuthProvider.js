import admin from "firebase-admin";

export async function getUserByEmail(email) {
  try {
    return await admin.auth().getUserByEmail(email);
  } catch (error) {
    if (error.code === "auth/user-not-found") return null;
    throw error;
  }
}

export async function createUser(data) {
  return admin.auth().createUser(data);
}

export async function updateUser(uid, data) {
  try {
    return await admin.auth().updateUser(uid, data);
  } catch (error) {
    if (error.code === "auth/user-not-found") return null;
    throw error;
  }
}

export async function getUser(uid) {
  return admin.auth().getUser(uid);
}
