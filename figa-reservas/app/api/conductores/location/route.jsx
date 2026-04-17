import { ROLES } from "@/app/lib/roles.js";
import {
  getAuthUserContext,
  hasRole,
  unauthorizedResponse,
} from "@/app/lib/serverAuth.js";
import { jsonResponse } from "@/app/core/shared/http/jsonResponse.js";
import { isAppError } from "@/app/core/server/shared/appError.js";
import { saveConductorLocationUseCase } from "@/app/core/server/catalogos/catalogosUseCases.js";
import { db } from "@/app/lib/firebaseadmin.jsx";

export const runtime = "nodejs";

function serializeTimestamp(value) {
  if (!value) return null;
  try {
    if (typeof value?.toDate === "function") {
      return value.toDate().toISOString();
    }
    const date = new Date(value);
    if (!isNaN(date.getTime())) return date.toISOString();
  } catch {
    return null;
  }
  return null;
}

async function resolveConductorLocation({ conductorId, conductorUid }) {
  let conductorDoc = null;

  if (conductorId) {
    const doc = await db.collection("conductores").doc(conductorId).get();
    if (doc.exists) {
      conductorDoc = { id: doc.id, ...doc.data() };
    }
  }

  if (!conductorDoc && conductorUid) {
    const snap = await db
      .collection("conductores")
      .where("uid", "==", conductorUid)
      .limit(1)
      .get();
    if (!snap.empty) {
      const doc = snap.docs[0];
      conductorDoc = { id: doc.id, ...doc.data() };
    }
  }

  const locationFromConductor = conductorDoc?.lastLocation;
  if (locationFromConductor?.lat != null && locationFromConductor?.lng != null) {
    return {
      conductorId: conductorDoc.id,
      conductorUid: conductorDoc.uid || conductorUid || null,
      conductorNombre: conductorDoc.nombre || "",
      location: {
        lat: Number(locationFromConductor.lat),
        lng: Number(locationFromConductor.lng),
        accuracy:
          locationFromConductor.accuracy != null
            ? Number(locationFromConductor.accuracy)
            : null,
        updatedAt: serializeTimestamp(locationFromConductor.updatedAt),
      },
    };
  }

  if (conductorUid) {
    const fallbackDoc = await db.collection("conductorLocations").doc(conductorUid).get();
    const fallback = fallbackDoc.data()?.lastLocation;
    if (fallback?.lat != null && fallback?.lng != null) {
      return {
        conductorId: conductorDoc?.id || conductorId || null,
        conductorUid,
        conductorNombre: conductorDoc?.nombre || "",
        location: {
          lat: Number(fallback.lat),
          lng: Number(fallback.lng),
          accuracy: fallback.accuracy != null ? Number(fallback.accuracy) : null,
          updatedAt: serializeTimestamp(fallback.updatedAt),
        },
      };
    }
  }

  return {
    conductorId: conductorDoc?.id || conductorId || null,
    conductorUid: conductorDoc?.uid || conductorUid || null,
    conductorNombre: conductorDoc?.nombre || "",
    location: null,
  };
}

export async function POST(req) {
  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, [ROLES.CONDUCTOR])) {
    return unauthorizedResponse("Solo conductores pueden reportar su ubicación.");
  }

  try {
    const body = await req.json();
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    const accuracy = body?.accuracy != null ? Number(body.accuracy) : null;

    if (!isFinite(lat) || !isFinite(lng)) {
      return jsonResponse({ message: "lat y lng son requeridos y deben ser numéricos" }, 400);
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return jsonResponse({ message: "Coordenadas fuera de rango válido" }, 400);
    }

    const uid = profile.uid || profile.id;
    await saveConductorLocationUseCase(uid, { lat, lng, accuracy });

    return jsonResponse({ ok: true });
  } catch (error) {
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    return jsonResponse({ message: "Error guardando ubicación" }, 500);
  }
}

export async function GET(req) {
  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, [ROLES.ADMIN, ROLES.OPERADOR, ROLES.CONDUCTOR])) {
    return unauthorizedResponse("No tienes permisos para consultar ubicación de conductores.");
  }

  try {
    const { searchParams } = new URL(req.url);
    const conductorId = String(searchParams.get("conductorId") || "").trim();
    let conductorUid = String(searchParams.get("conductorUid") || "").trim();

    const isConductor = hasRole(profile, [ROLES.CONDUCTOR]);
    if (isConductor) {
      const currentUid = String(profile.uid || profile.id || "").trim();
      if (conductorUid && conductorUid !== currentUid) {
        return unauthorizedResponse("Un conductor solo puede consultar su propia ubicación.");
      }
      conductorUid = conductorUid || currentUid;
    }

    if (!conductorId && !conductorUid) {
      return jsonResponse(
        { message: "Debe enviar conductorId o conductorUid para consultar ubicación" },
        400
      );
    }

    const payload = await resolveConductorLocation({ conductorId, conductorUid });
    return jsonResponse({ ok: true, ...payload });
  } catch (error) {
    if (isAppError(error)) {
      return jsonResponse({ message: error.message, error: error.code }, error.status);
    }
    return jsonResponse({ message: "Error consultando ubicación" }, 500);
  }
}
