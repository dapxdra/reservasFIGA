import { db } from "../../lib/firebaseadmin.jsx";
import { ROLES } from "../../lib/roles.js";
import { getAuthUserContext, hasRole, unauthorizedResponse } from "../../lib/serverAuth.js";
import { jsonResponse } from "../../core/shared/http/jsonResponse.js";
import {
  createReservaUseCase,
  listReservasUseCase,
} from "../../core/server/reservas/reservasUseCases.js";
import { isAppError } from "../../core/server/shared/appError.js";
import { sanitizeObjectStrings } from "../../core/server/shared/inputSanitizers.js";
import { enforceRateLimit } from "@/app/core/server/shared/rateLimit.js";

const dbUnavailable = () =>
  jsonResponse({ message: "Firebase Admin no está configurado en el servidor" }, 500);

export const POST = async (req) => {
  const rateLimitResponse = enforceRateLimit(req, {
    routeKey: "api/reservas/post",
    limit: 40,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    if (!db) return dbUnavailable();

    const { profile, errorResponse } = await getAuthUserContext(req);
    if (errorResponse) return errorResponse;
    if (!hasRole(profile, [ROLES.ADMIN, ROLES.OPERADOR])) {
      return unauthorizedResponse("No tienes permisos para crear reservas.");
    }

    const body = sanitizeObjectStrings(await req.json());
    const result = await createReservaUseCase(body);

    return jsonResponse({ message: "Reserva creada", id: result.id }, 200);
  } catch (error) {
    console.error("Error al insertar reserva:", error);
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    return jsonResponse({ message: "Error en el servidor" }, 500);
  }
};

// Obtiene todas las reservas
export const GET = async (req) => {
  const rateLimitResponse = enforceRateLimit(req, {
    routeKey: "api/reservas/get",
    limit: 120,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    if (!db) return dbUnavailable();

    const { uid, profile, errorResponse } = await getAuthUserContext(req);
    if (errorResponse) return errorResponse;

    const isConductor = hasRole(profile, [ROLES.CONDUCTOR]);

    const reservas = await listReservasUseCase({
      isConductor,
      uid,
      profile,
    });

    return jsonResponse(reservas, 200);
  } catch (error) {
    console.error("Error al obtener reservas:", error);
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    return jsonResponse({ message: "Error al obtener reservas" }, 500);
  }
};
