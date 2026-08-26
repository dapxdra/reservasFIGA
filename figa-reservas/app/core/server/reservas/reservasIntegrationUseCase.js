import admin from "firebase-admin";
import { db } from "@/app/lib/firebaseadmin.jsx";
import { appError } from "@/app/core/server/shared/appError.js";
import {
  sanitizeObjectStrings,
  sanitizeString,
} from "@/app/core/server/shared/inputSanitizers.js";
import { createReservaUseCase } from "@/app/core/server/reservas/reservasUseCases.js";

function parseNumber(value, defaultValue = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : defaultValue;
}

function parseInteger(value, defaultValue = 0) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : defaultValue;
}

function parseBoolean(value, defaultValue = false) {
  if (typeof value === "boolean") return value;
  const normalized = sanitizeString(value, { lower: true, maxLength: 10 });
  if (["true", "1", "yes", "si", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return defaultValue;
}

function requireField(payload, fieldName, options = {}) {
  const value = sanitizeString(payload?.[fieldName], options);
  if (!value) {
    throw appError(`${fieldName} es requerido`, 400, "ValidationError");
  }
  return value;
}

function buildIntegrationKey(source, externalReservationId) {
  const safeSource = sanitizeString(source || "generic", {
    lower: true,
    maxLength: 40,
  }) || "generic";

  const safeExternalId = sanitizeString(externalReservationId, {
    maxLength: 120,
  });

  if (!safeExternalId) {
    throw appError("externalReservationId es requerido", 400, "ValidationError");
  }

  const raw = `${safeSource}:${safeExternalId}`;
  return raw.replace(/[^a-zA-Z0-9:_-]/g, "_").slice(0, 240);
}

function parseStoredReservaId(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapPayloadToReserva(rawPayload) {
  const payload = sanitizeObjectStrings(rawPayload || {});

  const source = sanitizeString(payload.source || "generic", {
    lower: true,
    maxLength: 40,
  }) || "generic";

  const externalReservationId =
    sanitizeString(payload.externalReservationId, { maxLength: 120 }) ||
    sanitizeString(payload.orderId, { maxLength: 120 }) ||
    sanitizeString(payload.purchaseId, { maxLength: 120 });

  const integrationKey = buildIntegrationKey(source, externalReservationId);

  const cliente = requireField(payload, "cliente", { maxLength: 120 });
  const fecha = requireField(payload, "fecha", { maxLength: 20 });
  const hora = requireField(payload, "hora", { maxLength: 20 });
  const pickUp = requireField(payload, "pickUp", { maxLength: 220 });
  const dropOff = requireField(payload, "dropOff", { maxLength: 220 });

  return {
    integrationKey,
    source,
    externalReservationId,
    reservaPayload: {
      itinId: parseInteger(payload.itinId, 0),
      cliente,
      fecha,
      hora,
      pickUp,
      dropOff,
      proveedor: sanitizeString(payload.proveedor, { maxLength: 120 }),
      nota: sanitizeString(payload.nota, { maxLength: 500 }),
      precio: parseNumber(payload.precio, 0),
      AD: parseInteger(payload.AD, 0),
      NI: parseInteger(payload.NI, 0),
      conductorId: sanitizeString(payload.conductorId, { maxLength: 128 }),
      vehiculoId: sanitizeString(payload.vehiculoId, { maxLength: 128 }),
      pago: parseBoolean(payload.pago, false),
      fechaPago: sanitizeString(payload.fechaPago, { maxLength: 20 }),
      cancelada: parseBoolean(payload.cancelada, false),
    },
    metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {},
  };
}

export async function createReservaFromIntegrationUseCase(rawPayload) {
  if (!db) {
    throw appError("Firebase Admin no está configurado en el servidor", 500, "ServerError");
  }

  const { integrationKey, source, externalReservationId, reservaPayload, metadata } =
    mapPayloadToReserva(rawPayload);

  const integrationRef = db.collection("reservasIntegraciones").doc(integrationKey);

  try {
    await integrationRef.create({
      integrationKey,
      source,
      externalReservationId,
      reservaPayload,
      metadata,
      status: "processing",
      attempts: 1,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    const alreadyExists = error?.code === 6 || String(error?.message || "").includes("ALREADY_EXISTS");
    if (!alreadyExists) {
      throw error;
    }

    const existing = await integrationRef.get();
    const data = existing.data() || {};
    const existingReservaId = parseStoredReservaId(data.reservaId);

    if (data.status === "completed" && existingReservaId !== null) {
      return {
        id: existingReservaId,
        idempotent: true,
        integrationKey,
      };
    }

    if (data.status === "failed") {
      throw appError(
        "La integracion anterior fallo. Usa el endpoint de replay para reintentar.",
        409,
        "IntegrationFailed"
      );
    }

    throw appError(
      "Esta reserva externa ya está en proceso. Reintenta en unos segundos.",
      409,
      "IntegrationInProgress"
    );
  }

  try {
    const result = await createReservaUseCase(reservaPayload);

    await integrationRef.set(
      {
        status: "completed",
        reservaId: result.id,
        metadata,
        error: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      id: result.id,
      idempotent: false,
      integrationKey,
    };
  } catch (error) {
    await integrationRef.set(
      {
        status: "failed",
        error: sanitizeString(error?.message, { maxLength: 200 }) || "Error desconocido",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    throw error;
  }
}

export async function replayFailedReservaIntegrationUseCase(payload) {
  if (!db) {
    throw appError("Firebase Admin no está configurado en el servidor", 500, "ServerError");
  }

  const safePayload = sanitizeObjectStrings(payload || {});
  const providedKey = sanitizeString(safePayload.integrationKey, { maxLength: 240 });
  const source = sanitizeString(safePayload.source || "generic", {
    lower: true,
    maxLength: 40,
  }) || "generic";

  const externalReservationId =
    sanitizeString(safePayload.externalReservationId, { maxLength: 120 }) ||
    sanitizeString(safePayload.orderId, { maxLength: 120 }) ||
    sanitizeString(safePayload.purchaseId, { maxLength: 120 });

  const integrationKey = providedKey || buildIntegrationKey(source, externalReservationId);
  const force = parseBoolean(safePayload.force, false);

  const integrationRef = db.collection("reservasIntegraciones").doc(integrationKey);
  const snapshot = await integrationRef.get();

  if (!snapshot.exists) {
    throw appError("Integracion no encontrada", 404, "IntegrationNotFound");
  }

  const data = snapshot.data() || {};
  const existingReservaId = parseStoredReservaId(data.reservaId);

  if (data.status === "completed" && existingReservaId !== null) {
    return {
      id: existingReservaId,
      idempotent: true,
      integrationKey,
      replayed: false,
    };
  }

  if (data.status === "processing" && !force) {
    throw appError(
      "La integracion sigue en proceso. Usa force=true solo si confirmas que quedo colgada.",
      409,
      "IntegrationInProgress"
    );
  }

  const reservaPayload = data.reservaPayload;
  if (!reservaPayload || typeof reservaPayload !== "object") {
    throw appError(
      "No hay payload almacenado para reintentar esta integracion",
      422,
      "IntegrationReplayUnavailable"
    );
  }

  await integrationRef.set(
    {
      status: "processing",
      replayRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  try {
    const result = await createReservaUseCase(reservaPayload);

    await integrationRef.set(
      {
        status: "completed",
        reservaId: result.id,
        replayedAt: admin.firestore.FieldValue.serverTimestamp(),
        replayCount: parseInteger(data.replayCount, 0) + 1,
        error: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      id: result.id,
      idempotent: false,
      integrationKey,
      replayed: true,
    };
  } catch (error) {
    await integrationRef.set(
      {
        status: "failed",
        error: sanitizeString(error?.message, { maxLength: 200 }) || "Error desconocido",
        replayCount: parseInteger(data.replayCount, 0) + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    throw error;
  }
}
