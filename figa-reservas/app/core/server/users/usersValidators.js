import { ROLES, normalizeRole } from "@/app/lib/roles.js";
import { appError } from "@/app/core/server/shared/appError.js";
import {
  sanitizeEmail,
  sanitizeId,
  sanitizeObjectStrings,
  sanitizeString,
} from "@/app/core/server/shared/inputSanitizers.js";

export function validateUserPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw appError("Datos inválidos", 400, "ValidationError");
  }

  const sanitized = sanitizeObjectStrings(payload);

  const nombre = sanitizeString(sanitized.nombre, { maxLength: 120 });
  const email = sanitizeEmail(sanitized.email, true);
  const role = normalizeRole(sanitized.role);
  const activo = sanitized.activo !== false;

  if (!nombre || !email || !role) {
    throw appError("nombre, email y role son requeridos", 400, "ValidationError");
  }

  if (!Object.values(ROLES).includes(role)) {
    throw appError("role inválido", 400, "ValidationError");
  }

  return { nombre, email, role, activo };
}

export function validateId(id) {
  return sanitizeId(id, "ID");
}
