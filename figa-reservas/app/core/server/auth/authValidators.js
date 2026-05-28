import { appError } from "@/app/core/server/shared/appError.js";
import {
  sanitizeObjectStrings,
  sanitizeString,
} from "@/app/core/server/shared/inputSanitizers.js";

export function validateAuthSetupPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { nombre: "" };
  }

  const sanitized = sanitizeObjectStrings(payload);
  const nombre = sanitizeString(sanitized.nombre, { maxLength: 120 });
  if (payload.nombre !== undefined && !nombre) {
    throw appError("nombre inválido", 400, "ValidationError");
  }

  return { nombre };
}
