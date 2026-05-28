import { appError } from "@/app/core/server/shared/appError.js";
import {
  sanitizeEmail,
  sanitizeId,
  sanitizeObjectStrings,
  sanitizeString,
} from "@/app/core/server/shared/inputSanitizers.js";

function ensureObject(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw appError("Datos inválidos", 400, "ValidationError");
  }
}

export function validateConductorPayload(payload) {
  ensureObject(payload);
  const sanitized = sanitizeObjectStrings(payload);
  const nombre = sanitizeString(sanitized.nombre, { maxLength: 120 });
  if (!nombre) {
    throw appError("nombre es requerido", 400, "ValidationError");
  }
  return {
    nombre,
    telefono: sanitizeString(sanitized.telefono, { maxLength: 40 }),
    email: sanitizeEmail(sanitized.email, false),
    cedula: sanitizeString(sanitized.cedula, { maxLength: 30 }),
    uid: sanitizeString(sanitized.uid, { maxLength: 128 }),
    activo: sanitized.activo !== false,
  };
}

export function validateVehiculoPayload(payload) {
  ensureObject(payload);
  const sanitized = sanitizeObjectStrings(payload);
  const placa = sanitizeString(sanitized.placa, { upper: true, maxLength: 20 });
  if (!placa) {
    throw appError("placa es requerida", 400, "ValidationError");
  }
  return {
    placa,
    modelo: sanitizeString(sanitized.modelo, { maxLength: 80 }),
    tipo: sanitizeString(sanitized.tipo, { maxLength: 40 }),
    capacidad: Number(sanitized.capacidad) || 0,
    activo: sanitized.activo !== false,
  };
}

export function validateEntityId(id) {
  return sanitizeId(id, "ID");
}
