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
  validateCreateReservaPayload(body);

  const currentLast = await getLastFigaId();
  const newId = currentLast + 1;

  const conductorId = body.conductorId || "";
  const vehiculoId = body.vehiculoId || "";
  const { conductorNombre, assignedUid, vehiculoPlaca } = await resolveReservaAssignment(
    conductorId,
    vehiculoId
  );

  const newReserva = {
    figaId: newId,
    itinId: parseInt(body.itinId) || 0,
    cliente: body.cliente || "",
    fecha: body.fecha || "",
    hora: body.hora || "",
    dropOff: body.dropOff || "",
    pickUp: body.pickUp || "",
    proveedor: body.proveedor || "",
    nota: body.nota || "",
    precio: parseFloat(body.precio) || 0,
    AD: parseInt(body.AD) || 0,
    NI: parseInt(body.NI) || 0,
    conductorId,
    conductorNombre,
    chofer: conductorNombre,
    vehiculoId,
    vehiculoPlaca,
    buseta: vehiculoPlaca,
    assignedUid,
    pago: parseBool(body.pago),
    fechaPago: body.fechaPago || "",
    cancelada: body.cancelada || false,
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
  validateUpdateReservaPayload(payload);

  const updateData = { ...payload };
  if (
    Object.prototype.hasOwnProperty.call(payload, "conductorId") ||
    Object.prototype.hasOwnProperty.call(payload, "vehiculoId")
  ) {
    const conductorId = payload.conductorId || "";
    const vehiculoId = payload.vehiculoId || "";
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
  validatePatchCancelPayload(payload);

  const { id, cancelada } = payload;
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
