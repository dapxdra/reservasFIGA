import admin from "firebase-admin";

let db = null;
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!admin.apps.length && serviceAccountKey) {
  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error("FIREBASE_SERVICE_ACCOUNT_KEY inválida:", error);
  }
}

if (admin.apps.length) {
  db = admin.firestore();
}

export { db };
