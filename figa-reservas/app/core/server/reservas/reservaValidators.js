import { appError } from "@/app/core/server/shared/appError.js";
import {
  sanitizeId,
  sanitizeObjectStrings,
  sanitizeString,
} from "@/app/core/server/shared/inputSanitizers.js";

function ensureObject(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw appError("Datos inválidos", 400, "ValidationError");
  }
}

export function validateCreateReservaPayload(payload) {
  ensureObject(payload);
  return sanitizeObjectStrings(payload);
}

export function validateUpdateReservaPayload(payload) {
  ensureObject(payload);
  const sanitized = sanitizeObjectStrings(payload);
  if (Object.keys(sanitized).length === 0) {
    throw appError("Datos inválidos", 400, "ValidationError");
  }
  return sanitized;
}

export function validatePatchCancelPayload(payload) {
  ensureObject(payload);
  const sanitized = sanitizeObjectStrings(payload);
  const rawId = sanitizeString(sanitized.id, { maxLength: 128 });
  const { cancelada } = sanitized;
  if (!rawId || cancelada === undefined) {
    throw appError("ID o datos no proporcionados", 400, "ValidationError");
  }
  if (typeof cancelada !== "boolean") {
    throw appError("cancelada inválida", 400, "ValidationError");
  }
  const id = sanitizeId(rawId, "ID");
  return { id, cancelada };
}
