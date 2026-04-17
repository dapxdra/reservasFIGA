import { ROLES } from "@/app/lib/roles.js";
import {
  getAuthUserContext,
  hasRole,
  unauthorizedResponse,
} from "@/app/lib/serverAuth.js";
import { jsonResponse } from "@/app/core/shared/http/jsonResponse.js";
import { isAppError } from "@/app/core/server/shared/appError.js";
import { saveConductorLocationUseCase } from "@/app/core/server/catalogos/catalogosUseCases.js";

export async function POST(req) {
  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, [ROLES.CONDUCTOR])) {
    return unauthorizedResponse("Solo conductores pueden reportar su ubicación.");
  }

  try {
    const body = await req.json();
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    const accuracy = body?.accuracy != null ? Number(body.accuracy) : null;

    if (!isFinite(lat) || !isFinite(lng)) {
      return jsonResponse({ message: "lat y lng son requeridos y deben ser numéricos" }, 400);
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return jsonResponse({ message: "Coordenadas fuera de rango válido" }, 400);
    }

    const uid = profile.uid || profile.id;
    await saveConductorLocationUseCase(uid, { lat, lng, accuracy });

    return jsonResponse({ ok: true });
  } catch (error) {
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    return jsonResponse({ message: "Error guardando ubicación" }, 500);
  }
}
