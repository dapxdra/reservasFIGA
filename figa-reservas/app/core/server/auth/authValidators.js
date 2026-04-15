import { appError } from "@/app/core/server/shared/appError.js";

export function validateAuthSetupPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { nombre: "" };
  }

  const nombre = String(payload.nombre || "").trim();
  if (payload.nombre !== undefined && !nombre) {
    throw appError("nombre inválido", 400, "ValidationError");
  }

  return { nombre };
}
