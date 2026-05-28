import {
  createReservaById,
  getLastFigaId,
  getReservaById,
  listReservasOrderedByFecha,
  updateReservaById,
} from "@/app/core/server/reservas/reservasRepository.js";
import { resolveReservaAssignment } from "@/app/core/server/reservas/resolveReservaAssignment.js";
import {
  validateCreateReservaPayload,
  validatePatchCancelPayload,
  validateUpdateReservaPayload,
} from "@/app/core/server/reservas/reservaValidators.js";
import { appError } from "@/app/core/server/shared/appError.js";

function parseBool(value) {
  return value === true || value === "on";
}

function toConductorScope(profile = {}) {
  return String(profile?.nombre || "")
    .trim()
    .toLowerCase();
}

function isReservaAssignedToConductor(reserva, uid, conductorNombre) {
  const assignedUid = String(reserva.assignedUid || "").trim();
  if (assignedUid && uid) {
    return assignedUid === uid;
  }

  const nombreAsignado = String(reserva.conductorNombre || reserva.chofer || "")
    .trim()
    .toLowerCase();

  return Boolean(conductorNombre) && nombreAsignado === conductorNombre;
}

export async function createReservaUseCase(body) {
  const sanitizedBody = validateCreateReservaPayload(body);

  const currentLast = await getLastFigaId();
  const newId = currentLast + 1;

  const conductorId = sanitizedBody.conductorId || "";
  const vehiculoId = sanitizedBody.vehiculoId || "";
  const { conductorNombre, assignedUid, vehiculoPlaca } = await resolveReservaAssignment(
    conductorId,
    vehiculoId
  );

  const newReserva = {
    figaId: newId,
    itinId: parseInt(sanitizedBody.itinId) || 0,
    cliente: sanitizedBody.cliente || "",
    fecha: sanitizedBody.fecha || "",
    hora: sanitizedBody.hora || "",
    dropOff: sanitizedBody.dropOff || "",
    pickUp: sanitizedBody.pickUp || "",
    proveedor: sanitizedBody.proveedor || "",
    nota: sanitizedBody.nota || "",
    precio: parseFloat(sanitizedBody.precio) || 0,
    AD: parseInt(sanitizedBody.AD) || 0,
    NI: parseInt(sanitizedBody.NI) || 0,
    conductorId,
    conductorNombre,
    chofer: conductorNombre,
    vehiculoId,
    vehiculoPlaca,
    buseta: vehiculoPlaca,
    assignedUid,
    pago: parseBool(sanitizedBody.pago),
    fechaPago: sanitizedBody.fechaPago || "",
    cancelada: sanitizedBody.cancelada || false,
    createdAt: new Date().toString(),
  };

  await createReservaById(newId, newReserva);
  return { id: newId };
}

export async function listReservasUseCase({ isConductor, uid, profile }) {
  const reservas = await listReservasOrderedByFecha();
  if (!isConductor) return reservas;

  const conductorNombre = toConductorScope(profile);
  const currentUid = String(uid || "").trim();

  return reservas.filter((reserva) =>
    isReservaAssignedToConductor(reserva, currentUid, conductorNombre)
  );
}

export async function getReservaByIdUseCase({ id, isConductor, uid, profile }) {
  const reserva = await getReservaById(id);
  if (!reserva) {
    throw appError("Reserva no encontrada", 404, "ReservaNotFound");
  }

  if (isConductor) {
    const conductorNombre = toConductorScope(profile);
    const currentUid = String(uid || "").trim();
    const canAccess = isReservaAssignedToConductor(
      reserva,
      currentUid,
      conductorNombre
    );

    if (!canAccess) {
      throw appError(
        "No tienes permisos para ver esta reserva.",
        403,
        "ReservaForbidden"
      );
    }
  }

  return reserva;
}

export async function updateReservaUseCase({ id, payload }) {
  const sanitizedPayload = validateUpdateReservaPayload(payload);

  const updateData = { ...sanitizedPayload };
  if (
    Object.prototype.hasOwnProperty.call(sanitizedPayload, "conductorId") ||
    Object.prototype.hasOwnProperty.call(sanitizedPayload, "vehiculoId")
  ) {
    const conductorId = sanitizedPayload.conductorId || "";
    const vehiculoId = sanitizedPayload.vehiculoId || "";
    const { conductorNombre, assignedUid, vehiculoPlaca } =
      await resolveReservaAssignment(conductorId, vehiculoId);

    updateData.conductorNombre = conductorNombre;
    updateData.chofer = conductorNombre;
    updateData.assignedUid = assignedUid;
    updateData.vehiculoPlaca = vehiculoPlaca;
    updateData.buseta = vehiculoPlaca;
  }

  await updateReservaById(id, updateData);
}

export async function cancelReservaUseCase(id) {
  const reserva = await getReservaById(id);
  if (!reserva) {
    throw appError("Reserva no encontrada", 404, "ReservaNotFound");
  }

  const updates = { cancelada: true };
  if (!reserva.canceledAt) {
    updates.canceledAt = new Date().toString();
  }

  await updateReservaById(id, updates);
}

export async function patchCancelReservaUseCase(payload) {
  const { id, cancelada } = validatePatchCancelPayload(payload);
  const reserva = await getReservaById(id);
  if (!reserva) {
    throw appError("Reserva no encontrada", 404, "ReservaNotFound");
  }

  const updates = { cancelada };
  if (!reserva.canceledAt && cancelada) {
    updates.canceledAt = new Date().toString();
  }

  await updateReservaById(id, updates);
}
