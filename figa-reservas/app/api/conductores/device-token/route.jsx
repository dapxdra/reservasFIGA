import { ROLES } from "@/app/lib/roles.js";
import {
  getAuthUserContext,
  hasRole,
  unauthorizedResponse,
} from "@/app/lib/serverAuth.js";
import { jsonResponse } from "@/app/core/shared/http/jsonResponse.js";
import { isAppError } from "@/app/core/server/shared/appError.js";
import {
  registerDeviceTokenUseCase,
  unregisterDeviceTokenUseCase,
} from "@/app/core/server/tracking/trackingUseCases.js";
import { enforceRateLimit } from "@/app/core/server/shared/rateLimit.js";

export const runtime = "nodejs";

async function readBody(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function errorResponse(error, fallback) {
  if (isAppError(error)) {
    return jsonResponse({ message: error.message, error: error.code }, error.status);
  }
  return jsonResponse({ message: fallback }, 500);
}

async function authorize(req, routeKey) {
  const rateLimitResponse = enforceRateLimit(req, { routeKey, limit: 20 });
  if (rateLimitResponse) return { response: rateLimitResponse };

  const { profile, errorResponse: authError } = await getAuthUserContext(req);
  if (authError) return { response: authError };

  if (!hasRole(profile, [ROLES.CONDUCTOR])) {
    return {
      response: unauthorizedResponse("Solo conductores registran dispositivos para avisos."),
    };
  }
  return { profile };
}

// Registra el token push (FCM) del celular del conductor.
export async function POST(req) {
  const { profile, response } = await authorize(req, "api/conductores/device-token/post");
  if (response) return response;

  try {
    const body = await readBody(req);
    await registerDeviceTokenUseCase({
      uid: profile.uid || profile.id,
      token: body?.token,
      platform: body?.platform,
    });
    return jsonResponse({ ok: true });
  } catch (error) {
    return errorResponse(error, "Error registrando el dispositivo");
  }
}

// Quita el token al cerrar sesión, para no avisar a un celular que ya no es del conductor.
export async function DELETE(req) {
  const { response } = await authorize(req, "api/conductores/device-token/delete");
  if (response) return response;

  try {
    const body = await readBody(req);
    await unregisterDeviceTokenUseCase({ token: body?.token });
    return jsonResponse({ ok: true });
  } catch (error) {
    return errorResponse(error, "Error quitando el dispositivo");
  }
}
