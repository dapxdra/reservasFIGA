import { appError } from "@/app/core/server/shared/appError.js";

function ensureObject(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw appError("Datos inválidos", 400, "ValidationError");
  }
}

export function validateCreateReservaPayload(payload) {
  ensureObject(payload);
}

export function validateUpdateReservaPayload(payload) {
  ensureObject(payload);
  if (Object.keys(payload).length === 0) {
    throw appError("Datos inválidos", 400, "ValidationError");
  }
}

export function validatePatchCancelPayload(payload) {
  ensureObject(payload);
  const { id, cancelada } = payload;
  if (!id || cancelada === undefined) {
    throw appError("ID o datos no proporcionados", 400, "ValidationError");
  }
}
