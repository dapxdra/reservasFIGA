import admin from "firebase-admin";
// Asegura que la app de firebase-admin esté inicializada antes de usar messaging().
import "@/app/lib/firebaseadmin.jsx";

const TOKEN_INVALIDO = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

/**
 * Envía una notificación a varios dispositivos.
 * Devuelve { enviados, fallidos, tokensInvalidos } (los inválidos se deben borrar).
 */
export async function sendPushToTokens(tokens, { title, body, data = {} }) {
  if (!tokens.length) return { enviados: 0, fallidos: 0, tokensInvalidos: [] };

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    android: { priority: "high" },
    apns: { payload: { aps: { sound: "default" } } },
  });

  const tokensInvalidos = [];
  response.responses.forEach((r, i) => {
    if (!r.success && TOKEN_INVALIDO.has(r.error?.code)) tokensInvalidos.push(tokens[i]);
  });

  return {
    enviados: response.successCount,
    fallidos: response.failureCount,
    tokensInvalidos,
  };
}
