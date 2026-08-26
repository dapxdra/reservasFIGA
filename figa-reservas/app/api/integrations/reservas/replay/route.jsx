import { timingSafeEqual } from "node:crypto";
import { jsonResponse } from "@/app/core/shared/http/jsonResponse.js";
import { isAppError, appError } from "@/app/core/server/shared/appError.js";
import { sanitizeObjectStrings, sanitizeString } from "@/app/core/server/shared/inputSanitizers.js";
import { enforceRateLimit } from "@/app/core/server/shared/rateLimit.js";
import { replayFailedReservaIntegrationUseCase } from "@/app/core/server/reservas/reservasIntegrationUseCase.js";

function extractProvidedSecret(req) {
  const authHeader = String(req.headers.get("authorization") || "");
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  const keyHeader = String(req.headers.get("x-webhook-key") || "").trim();
  return keyHeader;
}

function safeSecretEquals(expected, provided) {
  const expectedBuffer = Buffer.from(expected || "");
  const providedBuffer = Buffer.from(provided || "");

  if (expectedBuffer.length === 0 || expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

function ensureAuthorizedWebhook(req) {
  const expectedSecret = sanitizeString(process.env.RESERVAS_WEBHOOK_SECRET, {
    maxLength: 256,
  });

  if (!expectedSecret) {
    throw appError(
      "RESERVAS_WEBHOOK_SECRET no está configurado",
      500,
      "ServerError"
    );
  }

  const providedSecret = extractProvidedSecret(req);

  if (!safeSecretEquals(expectedSecret, providedSecret)) {
    throw appError("No autorizado", 401, "Unauthorized");
  }
}

export async function POST(req) {
  const rateLimitResponse = enforceRateLimit(req, {
    routeKey: "api/integrations/reservas/replay/post",
    limit: 20,
    windowMs: 60 * 1000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    ensureAuthorizedWebhook(req);

    const payload = sanitizeObjectStrings(await req.json());
    const result = await replayFailedReservaIntegrationUseCase(payload);

    return jsonResponse(
      {
        message: result.idempotent
          ? "Integracion ya completada anteriormente"
          : "Replay ejecutado correctamente",
        id: result.id,
        idempotent: result.idempotent,
        replayed: result.replayed,
        integrationKey: result.integrationKey,
      },
      200
    );
  } catch (error) {
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }

    return jsonResponse({ message: "Error ejecutando replay de integracion" }, 500);
  }
}
