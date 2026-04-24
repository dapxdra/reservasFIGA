import { ROLES } from "@/app/lib/roles.js";
import {
  getAuthUserContext,
  hasRole,
  unauthorizedResponse,
} from "@/app/lib/serverAuth.js";
import { jsonResponse } from "@/app/core/shared/http/jsonResponse.js";
import { isAppError } from "@/app/core/server/shared/appError.js";
import { runReservas24hReminderUseCase } from "@/app/core/server/notifications/reservas24hUseCase.js";

export const runtime = "nodejs";

function isAuthorizedRequest(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const keyParam = req.nextUrl.searchParams.get("key") || "";

  return token === secret || keyParam === secret;
}

export async function GET(req) {
  if (!isAuthorizedRequest(req)) {
    return jsonResponse({ message: "No autorizado" }, 401);
  }

  return executeReminderJob();
}

export async function POST(req) {
  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, [ROLES.ADMIN])) {
    return unauthorizedResponse(
      "Solo administradores pueden ejecutar recordatorios manuales."
    );
  }

  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const minHours = Number(body?.minHours);
  const maxHours = Number(body?.maxHours);
  const maxSends = Number(body?.maxSends);
  const onlyActive = body?.onlyActive === true;

  const hasManualWindow = Number.isFinite(minHours) && Number.isFinite(maxHours);

  return executeReminderJob({
    ignoreWindow: body?.ignoreWindow === true,
    onlyActive,
    ...(Number.isFinite(maxSends)
      ? {
          maxSends,
        }
      : {}),
    ...(hasManualWindow
      ? {
          minHours,
          maxHours,
        }
      : {}),
  });
}

async function executeReminderJob(options = {}) {
  let summary;
  try {
    summary = await runReservas24hReminderUseCase(options);
    return jsonResponse(summary, 200);
  } catch (error) {
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    return jsonResponse(
      {
        message: "Error ejecutando recordatorios 24h",
        error: error.message,
        summary,
      },
      500
    );
  }
}
