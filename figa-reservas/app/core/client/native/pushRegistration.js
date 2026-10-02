// Registro del celular del conductor para avisos push (solo app nativa).
import { authenticatedFetch } from "@/app/core/client/http/authenticatedFetch.js";
import { isNativeApp, nativePlatform } from "@/app/core/client/native/nativeBridge.js";

const TOKEN_STORAGE_KEY = "figa.pushToken";
export const TRACKING_REFRESH_EVENT = "figa:tracking-refresh";

function readStoredToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Sin storage solo se pierde el borrado al cerrar sesión.
  }
}

/**
 * Pide permiso de notificaciones, registra el token en el backend y escucha los toques
 * en avisos de "servicio en 3 horas". Devuelve una función para quitar los listeners.
 */
export async function registerPushDevice() {
  if (!isNativeApp()) return () => {};
  const { PushNotifications } = await import("@capacitor/push-notifications");

  let permission = await PushNotifications.checkPermissions();
  if (permission.receive === "prompt" || permission.receive === "prompt-with-rationale") {
    permission = await PushNotifications.requestPermissions();
  }
  if (permission.receive !== "granted") return () => {};

  const handles = await Promise.all([
    PushNotifications.addListener("registration", async ({ value }) => {
      try {
        await authenticatedFetch("/api/conductores/device-token", {
          method: "POST",
          body: JSON.stringify({ token: value, platform: nativePlatform() }),
        });
        storeToken(value);
      } catch {
        // Se reintenta en el próximo inicio de la app.
      }
    }),
    // Aviso recibido con la app abierta o tocado desde la barra: revisar el seguimiento ya.
    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      if (notification?.data?.tipo === "tracking-start") {
        window.dispatchEvent(new Event(TRACKING_REFRESH_EVENT));
      }
    }),
    PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
      if (notification?.data?.tipo === "tracking-start") {
        window.dispatchEvent(new Event(TRACKING_REFRESH_EVENT));
      }
    }),
  ]);

  await PushNotifications.register();
  return () => handles.forEach((h) => h.remove());
}

/** Llamar antes de signOut: el backend necesita la sesión para borrar el token. */
export async function unregisterPushDevice() {
  const token = readStoredToken();
  if (!token) return;
  try {
    await authenticatedFetch("/api/conductores/device-token", {
      method: "DELETE",
      body: JSON.stringify({ token }),
    });
  } finally {
    storeToken(null);
  }
}
