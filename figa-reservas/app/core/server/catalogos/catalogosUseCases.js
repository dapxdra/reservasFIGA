import {
  validateConductorPayload,
  validateEntityId,
  validateVehiculoPayload,
} from "@/app/core/server/catalogos/catalogValidators.js";
import {
  createConductor,
  listConductores,
  saveConductorLocation,
  setConductorActivo,
  updateConductor,
} from "@/app/core/server/catalogos/conductoresRepository.js";
import { findUserUidByEmail } from "@/app/core/server/users/usersRepository.js";
import {
  createVehiculo,
  listVehiculos,
  setVehiculoActivo,
  updateVehiculo,
} from "@/app/core/server/catalogos/vehiculosRepository.js";

async function enrichConductorUidByEmail(data) {
  const normalizedEmail = String(data.email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return { ...data, email: "", uid: "" };
  }

  const resolvedUid = await findUserUidByEmail(normalizedEmail);
  return {
    ...data,
    email: normalizedEmail,
    uid: resolvedUid,
  };
}

export async function listConductoresUseCase({ activos = false } = {}) {
  return listConductores({ activos });
}

export async function createConductorUseCase(payload) {
  const data = validateConductorPayload(payload);
  const enrichedData = await enrichConductorUidByEmail(data);
  return createConductor(enrichedData);
}

export async function updateConductorUseCase(id, payload) {
  validateEntityId(id);
  const data = validateConductorPayload(payload);
  const enrichedData = await enrichConductorUidByEmail(data);
  await updateConductor(id, enrichedData);
}

export async function resolveConductorUidByEmailUseCase(email) {
  return findUserUidByEmail(email);
}

export async function saveConductorLocationUseCase(uid, { lat, lng, accuracy }) {
  return saveConductorLocation(uid, { lat, lng, accuracy });
}

export async function setConductorActivoUseCase(id, activo) {
  validateEntityId(id);
  const status = activo !== false;
  await setConductorActivo(id, status);
  return status;
}

export async function listVehiculosUseCase({ activos = false } = {}) {
  return listVehiculos({ activos });
}

export async function createVehiculoUseCase(payload) {
  const data = validateVehiculoPayload(payload);
  return createVehiculo(data);
}

export async function updateVehiculoUseCase(id, payload) {
  validateEntityId(id);
  const data = validateVehiculoPayload(payload);
  await updateVehiculo(id, data);
}

export async function setVehiculoActivoUseCase(id, activo) {
  validateEntityId(id);
  const status = activo !== false;
  await setVehiculoActivo(id, status);
  return status;
}
