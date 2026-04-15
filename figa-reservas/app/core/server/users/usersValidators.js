import { ROLES, normalizeRole } from "@/app/lib/roles.js";
import { appError } from "@/app/core/server/shared/appError.js";

export function validateUserPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw appError("Datos inválidos", 400, "ValidationError");
  }

  const nombre = String(payload.nombre || "").trim();
  const email = String(payload.email || "").trim().toLowerCase();
  const role = normalizeRole(payload.role);
  const activo = payload.activo !== false;

  if (!nombre || !email || !role) {
    throw appError("nombre, email y role son requeridos", 400, "ValidationError");
  }

  if (!Object.values(ROLES).includes(role)) {
    throw appError("role inválido", 400, "ValidationError");
  }

  return { nombre, email, role, activo };
}

export function validateId(id) {
  if (!id) {
    throw appError("ID no proporcionado", 400, "ValidationError");
  }
}
