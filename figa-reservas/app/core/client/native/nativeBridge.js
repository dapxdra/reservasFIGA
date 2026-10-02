// Puente con la app nativa (Capacitor). En el navegador todo esto queda inactivo.
import { Capacitor, CapacitorHttp, registerPlugin } from "@capacitor/core";
import { buildAuthHeaders } from "@/app/core/client/http/authenticatedFetch.js";

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export function nativePlatform() {
  return Capacitor.getPlatform();
}

// Plugin nativo sin paquete JS propio: se registra por nombre.
export const BackgroundGeolocation = registerPlugin("BackgroundGeolocation");

/**
 * POST autenticado por la capa HTTP nativa. Android limita los fetch de la WebView
 * tras unos minutos en segundo plano; CapacitorHttp no tiene esa limitación.
 */
export async function nativeAuthenticatedPost(path, body) {
  const headers = await buildAuthHeaders({ "Content-Type": "application/json" });
  const response = await CapacitorHttp.post({
    url: new URL(path, window.location.origin).toString(),
    headers,
    data: body,
  });
  if (response.status >= 400) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.data;
}
