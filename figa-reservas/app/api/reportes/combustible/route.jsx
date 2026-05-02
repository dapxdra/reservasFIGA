import { ROLES } from "@/app/lib/roles.js";
import {
  getAuthUserContext,
  hasRole,
  unauthorizedResponse,
} from "@/app/lib/serverAuth.js";
import { jsonResponse } from "@/app/core/shared/http/jsonResponse.js";
import { db } from "@/app/lib/firebaseadmin.jsx";

export const runtime = "nodejs";

const GARAGE_COORDS = {
  lat: 10.445556,
  lng: -84.570444,
};

const FUEL_PATTERNS = {
  super: /super/i,
  regular: /plus\s*91|regular/i,
  diesel: /diesel/i,
};

function toNumber(value) {
  if (value == null) return null;
  const n = Number(String(value).replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function toYMD(value, tz = "America/Costa_Rica") {
  if (value == null) return "";

  if (typeof value === "string") {
    const plain = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(plain)) return plain;

    const isoMatch = plain.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) return isoMatch[1];

    const dmyMatch = plain.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dmyMatch) {
      const [, dd, mm, yyyy] = dmyMatch;
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  const seconds = value?.seconds ?? value?._seconds;
  if (seconds != null) {
    const d = new Date(Number(seconds) * 1000);
    if (!Number.isNaN(d.getTime())) {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
    }
  }

  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function toLocation(value) {
  const lat = toNumber(value?.lat);
  const lng = toNumber(value?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

async function resolveConductorLocation({ conductorId, conductorUid }) {
  if (!db) return null;

  const safeConductorId = normalizeText(conductorId);
  const safeConductorUid = normalizeText(conductorUid);

  let conductorDoc = null;

  if (safeConductorId) {
    const doc = await db.collection("conductores").doc(safeConductorId).get();
    if (doc.exists) {
      conductorDoc = { id: doc.id, ...doc.data() };
    }
  }

  if (!conductorDoc && safeConductorUid) {
    const snap = await db
      .collection("conductores")
      .where("uid", "==", safeConductorUid)
      .limit(1)
      .get();

    if (!snap.empty) {
      const doc = snap.docs[0];
      conductorDoc = { id: doc.id, ...doc.data() };
    }
  }

  const locationFromConductor = toLocation(conductorDoc?.lastLocation);
  if (locationFromConductor) {
    return {
      conductorId: conductorDoc?.id || safeConductorId || null,
      conductorUid: conductorDoc?.uid || safeConductorUid || null,
      location: locationFromConductor,
    };
  }

  const fallbackUid = conductorDoc?.uid || safeConductorUid;
  if (fallbackUid) {
    const fallbackDoc = await db.collection("conductorLocations").doc(fallbackUid).get();
    const fallbackLocation = toLocation(fallbackDoc.data()?.lastLocation);

    if (fallbackLocation) {
      return {
        conductorId: conductorDoc?.id || safeConductorId || null,
        conductorUid: fallbackUid,
        location: fallbackLocation,
      };
    }
  }

  return {
    conductorId: conductorDoc?.id || safeConductorId || null,
    conductorUid: conductorDoc?.uid || safeConductorUid || null,
    location: null,
  };
}

// Known alias expansions for common airport codes
const AIRPORT_ALIASES = {
  SJO: "Aeropuerto Internacional Juan Santamaria, Alajuela, Costa Rica",
  LIR: "Aeropuerto Internacional Daniel Oduber, Liberia, Costa Rica",
};

// Hardcoded coords for frequently-used places that geocoders fail to resolve
const KNOWN_PLACE_COORDS = {
  sjo:                         { lat: 9.9981657,  lng: -84.2047605 },
  lir:                         { lat: 10.5933,    lng: -85.5444 },
  planet_hollywood_papagayo:   { lat: 10.5839,    lng: -85.6731 },
  four_seasons_papagayo:       { lat: 10.5932,    lng: -85.6637 },
  andaz_papagayo:              { lat: 10.5879,    lng: -85.6628 },
  secrets_papagayo:            { lat: 10.5822,    lng: -85.6721 },
  riu_guanacaste:              { lat: 10.5792,    lng: -85.7058 },
  riu_palace_costarica:        { lat: 10.5773,    lng: -85.7065 },
  arenal_kioro:                { lat: 10.4827,    lng: -84.7012 },
  arenal_observatory:          { lat: 10.4614,    lng: -84.7128 },
  nayara_springs:              { lat: 10.4872,    lng: -84.6998 },
  tabacon_grand_spa:           { lat: 10.4891,    lng: -84.7183 },
  lomas_del_volcan:            { lat: 10.4861,    lng: -84.5872 },
  la_fortuna_center:           { lat: 10.4693,    lng: -84.6432 },
  monteverde_center:           { lat: 10.3018,    lng: -84.8266 },
  santa_elena_monteverde:      { lat: 10.3267,    lng: -84.8293 },
  jaco_center:                 { lat: 9.6142,     lng: -84.6285 },
  manuel_antonio:              { lat: 9.3908,     lng: -84.1517 },
  quepos:                      { lat: 9.4325,     lng: -84.1638 },
  liberia_center:              { lat: 10.6300,    lng: -85.4408 },
  tamarindo:                   { lat: 10.2994,    lng: -85.8447 },
  flamingo:                    { lat: 10.4328,    lng: -85.7884 },
  potrero:                     { lat: 10.4381,    lng: -85.7759 },
  playa_hermosa_guanacaste:    { lat: 10.5744,    lng: -85.7011 },
  nosara:                      { lat: 9.9789,     lng: -85.6530 },
  samara:                      { lat: 9.8782,     lng: -85.5286 },
  dominical:                   { lat: 9.2459,     lng: -83.8601 },
  uvita:                       { lat: 9.1636,     lng: -83.7342 },
  san_jose_center:             { lat: 9.9281,     lng: -84.0907 },
};

function geocodeKnownPlace(rawText) {
  const n = normalizeText(rawText).toLowerCase();
  if (!n) return null;

  // Airports
  if (/\bsjo\b/.test(n) || /aeropuerto\s+(internacional\s+)?juan\s+santamaria/.test(n))
    return KNOWN_PLACE_COORDS.sjo;
  if (/\blir\b/.test(n) || /aeropuerto\s+(internacional\s+)?daniel\s+oduber/.test(n))
    return KNOWN_PLACE_COORDS.lir;

  // Papagayo resorts
  if (/planet\s+hollywood/.test(n) || /royalton/.test(n))
    return KNOWN_PLACE_COORDS.planet_hollywood_papagayo;
  if (/four\s+seasons.*papagayo/.test(n) || /papagayo.*four\s+seasons/.test(n))
    return KNOWN_PLACE_COORDS.four_seasons_papagayo;
  if (/andaz.*papagayo/.test(n) || /papagayo.*andaz/.test(n))
    return KNOWN_PLACE_COORDS.andaz_papagayo;
  if (/secrets.*papagayo/.test(n))
    return KNOWN_PLACE_COORDS.secrets_papagayo;
  if (/riu\s+palace\s+costa\s+rica/.test(n) || /riu\s+palace.*guanacaste/.test(n))
    return KNOWN_PLACE_COORDS.riu_palace_costarica;
  if (/\briu\b.*guanacaste/.test(n) || /guanacaste.*\briu\b/.test(n))
    return KNOWN_PLACE_COORDS.riu_guanacaste;
  // Generic Peninsula Papagayo fallback
  if (/peninsula\s+papagayo/.test(n))
    return KNOWN_PLACE_COORDS.planet_hollywood_papagayo;

  // Arenal / La Fortuna area
  if (/kioro/.test(n))
    return KNOWN_PLACE_COORDS.arenal_kioro;
  if (/arenal\s+observatory/.test(n))
    return KNOWN_PLACE_COORDS.arenal_observatory;
  if (/nayara/.test(n))
    return KNOWN_PLACE_COORDS.nayara_springs;
  if (/tabacon/.test(n))
    return KNOWN_PLACE_COORDS.tabacon_grand_spa;
  if (/lomas\s+del\s+volcan/.test(n))
    return KNOWN_PLACE_COORDS.lomas_del_volcan;
  if (/la\s+fortuna/.test(n))
    return KNOWN_PLACE_COORDS.la_fortuna_center;

  // Monteverde
  if (/santa\s+elena.*monteverde/.test(n) || /monteverde.*santa\s+elena/.test(n))
    return KNOWN_PLACE_COORDS.santa_elena_monteverde;
  if (/monteverde/.test(n))
    return KNOWN_PLACE_COORDS.monteverde_center;

  // Pacific coast
  if (/manuel\s+antonio/.test(n))
    return KNOWN_PLACE_COORDS.manuel_antonio;
  if (/quepos/.test(n))
    return KNOWN_PLACE_COORDS.quepos;
  if (/\bjaco\b/.test(n))
    return KNOWN_PLACE_COORDS.jaco_center;
  if (/dominical/.test(n))
    return KNOWN_PLACE_COORDS.dominical;
  if (/uvita/.test(n))
    return KNOWN_PLACE_COORDS.uvita;

  // Guanacaste beaches
  if (/tamarindo/.test(n))
    return KNOWN_PLACE_COORDS.tamarindo;
  if (/flamingo/.test(n))
    return KNOWN_PLACE_COORDS.flamingo;
  if (/potrero/.test(n))
    return KNOWN_PLACE_COORDS.potrero;
  if (/playa\s+hermosa.*guanacaste/.test(n) || /hermosa.*liberia/.test(n))
    return KNOWN_PLACE_COORDS.playa_hermosa_guanacaste;
  if (/nosara/.test(n))
    return KNOWN_PLACE_COORDS.nosara;
  if (/samara/.test(n))
    return KNOWN_PLACE_COORDS.samara;
  if (/liberia/.test(n))
    return KNOWN_PLACE_COORDS.liberia_center;

  return null;
}

function buildAddressCandidates(rawText) {
  const text = normalizeText(rawText);
  if (!text) return [];

  const upper = text.toUpperCase().trim();
  const candidates = [];

  // Alias expansion first
  if (AIRPORT_ALIASES[upper]) {
    candidates.push(AIRPORT_ALIASES[upper]);
  }

  // Original text (with Costa Rica appended if missing)
  const withCR = /costa\s+rica/i.test(text) ? text : `${text}, Costa Rica`;
  candidates.push(withCR);

  // Strip increasingly more detail from comma-separated parts to help Nominatim
  // e.g. "Aeropuerto Juan Santamaría, Provincia de Alajuela, Río Segundo, Costa Rica"
  // -> "Aeropuerto Juan Santamaría, Provincia de Alajuela, Costa Rica"
  // -> "Aeropuerto Juan Santamaría, Costa Rica"
  const parts = text.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) {
    for (let keep = parts.length - 1; keep >= 1; keep--) {
      const truncated = parts.slice(0, keep).join(", ");
      const withCRTruncated = /costa\s+rica/i.test(truncated)
        ? truncated
        : `${truncated}, Costa Rica`;
      candidates.push(withCRTruncated);
    }
  }

  // Also try just the very first segment (the main place name)
  if (parts.length > 1) {
    const firstPart = parts[0];
    if (!/costa\s+rica/i.test(firstPart)) {
      candidates.push(`${firstPart}, Costa Rica`);
    }
  }

  return [...new Set(candidates)];
}

async function geocodeOne(queryText) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "cr");
  url.searchParams.set("q", queryText);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "Accept-Language": "es",
      "User-Agent": "figa-reservas/1.0 fuel-report",
    },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const data = await response.json();
  const first = Array.isArray(data) ? data[0] : null;
  if (!first) return null;

  const lat = toNumber(first.lat);
  const lng = toNumber(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng };
}

async function geocodeAddress(rawText) {
  const text = normalizeText(rawText);
  if (!text) return null;

  // 1. Known place — instant, no API call
  const known = geocodeKnownPlace(text);
  if (known) return known;

  // 2. Google Places (new) Text Search — most reliable for Costa Rica
  // Skip in test environment (apiKey="test-key")
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (apiKey && apiKey !== "test-key") {
    try {
      const withCR = /costa\s+rica/i.test(text) ? text : `${text}, Costa Rica`;
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.location",
        },
        body: JSON.stringify({ textQuery: withCR, languageCode: "es" }),
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        const loc = data.places?.[0]?.location;
        const lat = toNumber(loc?.latitude);
        const lng = toNumber(loc?.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
      }
    } catch {
      // fall through to Nominatim
    }
  }

  // 3. Nominatim with candidate variants
  const candidates = buildAddressCandidates(rawText);
  for (const candidate of candidates) {
    const coords = await geocodeOne(candidate);
    if (coords) return coords;
  }

  return null;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(origin, destination) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(destination.lat - origin.lat);
  const dLng = toRadians(destination.lng - origin.lng);
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(earthRadiusKm * c * 10) / 10;
}

async function routeKm(origin, destination) {
  const fallbackKm = haversineDistanceKm(origin, destination);

  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return fallbackKm;

    const data = await response.json();
    const distanceMeters = toNumber(data?.routes?.[0]?.distance);
    if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) return fallbackKm;

    return Math.round((distanceMeters / 1000) * 10) / 10;
  } catch {
    return fallbackKm;
  }
}

async function reservationRouteKm(origin, destination) {
  const outboundKm = await routeKm(origin, destination);
  if (!Number.isFinite(outboundKm)) return null;

  const returnToGarageKm = await routeKm(destination, GARAGE_COORDS);
  if (!Number.isFinite(returnToGarageKm)) return null;

  return outboundKm + returnToGarageKm;
}

async function fetchFuelPrices() {
  const response = await fetch("https://api.recope.go.cr/ventas/precio/consumidor", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("No se pudo obtener precio de combustible desde RECOPE");
  }

  const rows = await response.json();
  const prices = {
    super: null,
    regular: null,
    diesel: null,
  };

  for (const row of Array.isArray(rows) ? rows : []) {
    const name = normalizeText(row?.nomprod);
    const total = toNumber(row?.preciototal);
    if (!Number.isFinite(total)) continue;

    if (FUEL_PATTERNS.super.test(name) && prices.super == null) prices.super = total;
    if (FUEL_PATTERNS.regular.test(name) && prices.regular == null) prices.regular = total;
    if (FUEL_PATTERNS.diesel.test(name) && prices.diesel == null) prices.diesel = total;
  }

  return prices;
}

export async function POST(req) {
  const { profile, errorResponse } = await getAuthUserContext(req);
  if (errorResponse) return errorResponse;

  if (!hasRole(profile, [ROLES.ADMIN])) {
    return unauthorizedResponse("No tienes permisos para calcular combustible.");
  }

  try {
    const body = await req.json();
    const tipoCombustible = normalizeText(body?.tipoCombustible || "regular").toLowerCase();
    const kmPorLitro = toNumber(body?.kmPorLitro);
    const reservasInput = Array.isArray(body?.reservas) ? body.reservas : [];
    const targetDate = normalizeText(body?.targetDate);

    const reservas = targetDate
      ? reservasInput.filter((reserva) => {
          const fechaReserva =
            toYMD(reserva?.fecha) ||
            toYMD(reserva?.fechaServicio) ||
            toYMD(reserva?.date);
          return fechaReserva === targetDate;
        })
      : reservasInput;

    if (!Number.isFinite(kmPorLitro) || kmPorLitro <= 0) {
      return jsonResponse({ message: "kmPorLitro debe ser un numero mayor que 0" }, 400);
    }

    if (!reservas.length) {
      return jsonResponse({
        ok: true,
        totalReservas: 0,
        rutasProcesadas: 0,
        rutasSinCalculo: 0,
        totalKm: 0,
        kmPromedioPorReserva: 0,
        litrosEstimados: 0,
        costoEstimado: 0,
        precioLitro: 0,
        tipoCombustible,
        unresolvedRoutes: [],
      });
    }

    const fuelPrices = await fetchFuelPrices();
    const precioLitro = toNumber(fuelPrices[tipoCombustible]);
    if (!Number.isFinite(precioLitro)) {
      return jsonResponse(
        { message: `No hay precio disponible en RECOPE para ${tipoCombustible}` },
        400
      );
    }

    const routes = new Map();
    const pickupCoordsMap = new Map();
    const conductorLocationMap = new Map();
    const unresolved = [];

    for (const reserva of reservas) {
      const pickUp = normalizeText(reserva?.pickUp);
      const dropOff = normalizeText(reserva?.dropOff);
      if (!pickUp || !dropOff) continue;

      const key = `${pickUp}|||${dropOff}`;
      if (routes.has(key)) continue;

      // Use stored coords if available (saved at reservation creation time)
      const storedOrigin = toLocation({ lat: reserva?.pickUpLat, lng: reserva?.pickUpLng });
      const storedDestination = toLocation({ lat: reserva?.dropOffLat, lng: reserva?.dropOffLng });

      const origin = storedOrigin ?? await geocodeAddress(pickUp);
      const destination = storedDestination ?? await geocodeAddress(dropOff);

      pickupCoordsMap.set(pickUp, origin || null);

      if (!origin || !destination) {
        routes.set(key, null);
        unresolved.push({
          pickUp,
          dropOff,
          reason: "geocode",
          detail: !origin
            ? `no coords for pickUp: ${pickUp}`
            : `no coords for dropOff: ${dropOff}`,
        });
        continue;
      }

      const km = await reservationRouteKm(origin, destination);
      if (!Number.isFinite(km)) {
        routes.set(key, null);
        unresolved.push({ pickUp, dropOff, reason: "route" });
        continue;
      }

      routes.set(key, km);
    }

    let totalKm = 0;
    let rutasProcesadas = 0;
    let rutasSinCalculo = 0;

    for (const reserva of reservas) {
      const pickUp = normalizeText(reserva?.pickUp);
      const dropOff = normalizeText(reserva?.dropOff);
      if (!pickUp || !dropOff) {
        rutasSinCalculo += 1;
        continue;
      }

      const key = `${pickUp}|||${dropOff}`;
      const km = routes.get(key);

      if (Number.isFinite(km)) {
        totalKm += km;
        rutasProcesadas += 1;

        const conductorId = normalizeText(reserva?.conductorId);
        const conductorUid = normalizeText(
          reserva?.conductorUid || reserva?.conductor?.uid || reserva?.uidConductor
        );

        if (conductorId || conductorUid) {
          const conductorKey = `${conductorId}|||${conductorUid}`;
          let conductorPayload = conductorLocationMap.get(conductorKey);

          if (conductorPayload === undefined) {
            conductorPayload = await resolveConductorLocation({ conductorId, conductorUid });
            conductorLocationMap.set(conductorKey, conductorPayload);
          }

          const conductorLocation = conductorPayload?.location;
          const pickupCoords = pickupCoordsMap.get(pickUp);

          if (conductorLocation && pickupCoords) {
            const conductorToPickupKm = await routeKm(conductorLocation, pickupCoords);
            if (Number.isFinite(conductorToPickupKm)) {
              totalKm += conductorToPickupKm;
            }
          }
        }
      } else {
        rutasSinCalculo += 1;
      }
    }

    const litrosEstimados = totalKm / kmPorLitro;
    const costoEstimado = litrosEstimados * precioLitro;
    const totalReservas = reservas.length;
    const kmPromedioPorReserva = totalReservas > 0 ? totalKm / totalReservas : 0;

    return jsonResponse({
      ok: true,
      tipoCombustible,
      precioLitro,
      kmPorLitro,
      totalReservas,
      rutasProcesadas,
      rutasSinCalculo,
      totalKm,
      kmPromedioPorReserva,
      litrosEstimados,
      costoEstimado,
      unresolvedRoutes: unresolved.slice(0, 20),
    });
  } catch (error) {
    return jsonResponse({ message: error?.message || "Error calculando combustible" }, 500);
  }
}
