import { createHmac, timingSafeEqual } from "node:crypto";
import { jsonResponse } from "@/app/core/shared/http/jsonResponse.js";
import { isAppError, appError } from "@/app/core/server/shared/appError.js";
import { sanitizeObjectStrings, sanitizeString } from "@/app/core/server/shared/inputSanitizers.js";
import { enforceRateLimit } from "@/app/core/server/shared/rateLimit.js";
import { createReservaFromIntegrationUseCase } from "@/app/core/server/reservas/reservasIntegrationUseCase.js";

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

function normalizeProvidedSignature(signatureHeader) {
  const raw = sanitizeString(signatureHeader, { maxLength: 256 });
  if (!raw) return "";
  return raw.startsWith("sha256=") ? raw.slice(7) : raw;
}

function ensureValidHmacSignature(req, rawBody) {
  const hmacSecret = sanitizeString(process.env.RESERVAS_WEBHOOK_HMAC_SECRET, {
    maxLength: 256,
  });

  if (!hmacSecret) {
    return;
  }

  const timestampHeader = sanitizeString(req.headers.get("x-webhook-timestamp"), {
    maxLength: 20,
  });
  const signatureHeader = req.headers.get("x-webhook-signature");
  const providedSignature = normalizeProvidedSignature(signatureHeader);

  if (!timestampHeader || !providedSignature) {
    throw appError("Firma HMAC requerida", 401, "Unauthorized");
  }

  const timestampMs = Number(timestampHeader) * 1000;
  if (!Number.isFinite(timestampMs)) {
    throw appError("Timestamp de firma invalido", 401, "Unauthorized");
  }

  const maxSkewMs = 5 * 60 * 1000;
  if (Math.abs(Date.now() - timestampMs) > maxSkewMs) {
    throw appError("Firma expirada", 401, "Unauthorized");
  }

  const expectedSignature = createHmac("sha256", hmacSecret)
    .update(`${timestampHeader}.${rawBody}`)
    .digest("hex");

  if (!safeSecretEquals(expectedSignature, providedSignature)) {
    throw appError("Firma invalida", 401, "Unauthorized");
  }
}

function ensureAuthorizedWebhook(req, rawBody) {
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

  ensureValidHmacSignature(req, rawBody);
}

export async function POST(req) {
  const rateLimitResponse = enforceRateLimit(req, {
    routeKey: "api/integrations/reservas/post",
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const rawBody = await req.text();
    ensureAuthorizedWebhook(req, rawBody);

    let parsed;
    try {
      parsed = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      throw appError("JSON invalido", 400, "ValidationError");
    }

    const payload = sanitizeObjectStrings(parsed);
    const result = await createReservaFromIntegrationUseCase(payload);

    return jsonResponse(
      {
        message: result.idempotent
          ? "Reserva ya procesada anteriormente"
          : "Reserva insertada correctamente",
        id: result.id,
        idempotent: result.idempotent,
        integrationKey: result.integrationKey,
      },
      result.idempotent ? 200 : 201
    );
  } catch (error) {
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }

    return jsonResponse({ message: "Error insertando reserva desde integración" }, 500);
  }
}
