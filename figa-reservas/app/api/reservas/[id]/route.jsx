import { db } from "../../../lib/firebaseadmin.jsx";
import { ROLES } from "../../../lib/roles.js";
import { getAuthUserContext, hasRole, unauthorizedResponse } from "../../../lib/serverAuth.js";
import { jsonResponse } from "../../../core/shared/http/jsonResponse.js";
import {
  cancelReservaUseCase,
  getReservaByIdUseCase,
  patchCancelReservaUseCase,
  updateReservaUseCase,
} from "../../../core/server/reservas/reservasUseCases.js";
import { isAppError } from "../../../core/server/shared/appError.js";

function ensureDb() {
  if (!db) {
    return jsonResponse(
      { message: "Firebase Admin no está configurado en el servidor" },
      500
    );
  }
  return null;
}

// Método GET para obtener una reserva por ID
export async function GET(req, { params }) {
  const dbError = ensureDb();
  if (dbError) return dbError;

  const { uid, profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  const re = await params;
  if (!re?.id) {
    return jsonResponse({ error: "ID no proporcionado" }, 400);
  }

  try {
    const reserva = await getReservaByIdUseCase({
      id: re.id,
      isConductor: hasRole(profile, [ROLES.CONDUCTOR]),
      uid,
      profile,
    });

    return jsonResponse(reserva);
  } catch (error) {
    console.error("Error al obtener la reserva:", error.message);
    if (isAppError(error)) {
      if (error.status === 403) {
        return unauthorizedResponse(error.message);
      }
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    return jsonResponse({ message: "Error interno del servidor" }, 500);
  }
}

// Método PUT para actualizar una reserva
export async function PUT(req, { params }) {
  const dbError = ensureDb();
  if (dbError) return dbError;

  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;
  if (!hasRole(profile, [ROLES.ADMIN, ROLES.OPERADOR])) {
    return unauthorizedResponse("No tienes permisos para editar reservas.");
  }

  const re = await params;
  if (!re?.id) {
    return jsonResponse({ error: "ID no proporcionado" }, 400);
  }

  try {
    const data = await req.json();
    await updateReservaUseCase({ id: re.id, payload: data });
    return jsonResponse({ message: "Reserva actualizada correctamente" });
  } catch (error) {
    console.error("Error al actualizar la reserva:", error.message);
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    return jsonResponse({ message: "Error interno del servidor" }, 500);
  }
}

// Método DELETE para marcar una reserva como cancelada
export async function DELETE(req, { params }) {
  const dbError = ensureDb();
  if (dbError) return dbError;

  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;
  if (!hasRole(profile, [ROLES.ADMIN, ROLES.OPERADOR])) {
    return unauthorizedResponse("No tienes permisos para cancelar reservas.");
  }

  const re = await params;
  if (!re?.id) {
    return jsonResponse({ error: "ID no proporcionado" }, 400);
  }

  try {
    await cancelReservaUseCase(re.id);
    return jsonResponse({ message: "Reserva marcada como cancelada" });
  } catch (error) {
    console.error("Error al cancelar la reserva:", error.message);
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    return jsonResponse({ message: "Error interno del servidor" }, 500);
  }
}

// Método PATCH para actualizar campos específicos
export async function PATCH(req) {
  try {
    const dbError = ensureDb();
    if (dbError) return dbError;

    const { profile, errorResponse } = await getAuthUserContext(req);
    if (errorResponse) return errorResponse;
    if (!hasRole(profile, [ROLES.ADMIN, ROLES.OPERADOR])) {
      return unauthorizedResponse("No tienes permisos para actualizar reservas.");
    }

    const payload = await req.json();
    await patchCancelReservaUseCase(payload);
    return jsonResponse({ message: "Reserva actualizada correctamente" });
  } catch (error) {
    console.error("Error al actualizar la reserva:", error.message);
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    return jsonResponse({ message: "Error interno del servidor" }, 500);
  }
}
