import { appError } from "@/app/core/server/shared/appError.js";

function ensureObject(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw appError("Datos inválidos", 400, "ValidationError");
  }
}

export function validateConductorPayload(payload) {
  ensureObject(payload);
  const nombre = String(payload.nombre || "").trim();
  if (!nombre) {
    throw appError("nombre es requerido", 400, "ValidationError");
  }
  return {
    nombre,
    telefono: String(payload.telefono || "").trim(),
    email: String(payload.email || "").trim(),
    cedula: String(payload.cedula || "").trim(),
    uid: String(payload.uid || "").trim(),
    activo: payload.activo !== false,
  };
}

export function validateVehiculoPayload(payload) {
  ensureObject(payload);
  const placa = String(payload.placa || "").trim().toUpperCase();
  if (!placa) {
    throw appError("placa es requerida", 400, "ValidationError");
  }
  return {
    placa,
    modelo: String(payload.modelo || "").trim(),
    tipo: String(payload.tipo || "").trim(),
    capacidad: Number(payload.capacidad) || 0,
    activo: payload.activo !== false,
  };
}

export function validateEntityId(id) {
  if (!id) {
    throw appError("ID no proporcionado", 400, "ValidationError");
  }
}
