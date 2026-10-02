import { ROLES } from "@/app/lib/roles.js";
import {
  getAuthUserContext,
  hasRole,
  unauthorizedResponse,
} from "@/app/lib/serverAuth.js";
import { jsonResponse } from "@/app/core/shared/http/jsonResponse.js";
import { isAppError } from "@/app/core/server/shared/appError.js";
import { runTrackingStartPushUseCase } from "@/app/core/server/tracking/trackingUseCases.js";
import { sanitizeString } from "@/app/core/server/shared/inputSanitizers.js";
import { enforceRateLimit } from "@/app/core/server/shared/rateLimit.js";

export const runtime = "nodejs";

// A diferencia de reservas-24h, aquí CRON_SECRET es obligatorio: este job envía pushes.
function isAuthorizedCron(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const keyParam = sanitizeString(req.nextUrl.searchParams.get("key"), { maxLength: 256 });
  return token === secret || keyParam === secret;
}

async function execute(options) {
  try {
    const summary = await runTrackingStartPushUseCase(options);
    return jsonResponse({ ok: true, ...summary });
  } catch (error) {
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    return jsonResponse({ message: "Error enviando avisos de seguimiento" }, 500);
  }
}

// Ejecución programada (cron externo cada ~15 min).
export async function GET(req) {
  const rateLimitResponse = enforceRateLimit(req, {
    routeKey: "api/notifications/tracking-start/get",
    limit: 20,
    windowMs: 60 * 1000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  if (!isAuthorizedCron(req)) {
    return jsonResponse({ message: "No autorizado" }, 401);
  }
  return execute();
}

// Ejecución manual de admin; con { "dryRun": true } solo informa qué enviaría.
export async function POST(req) {
  const rateLimitResponse = enforceRateLimit(req, {
    routeKey: "api/notifications/tracking-start/post",
    limit: 20,
    windowMs: 60 * 1000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, [ROLES.ADMIN])) {
    return unauthorizedResponse("Solo administradores pueden ejecutar avisos manuales.");
  }

  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  return execute({ dryRun: body?.dryRun === true });
}
