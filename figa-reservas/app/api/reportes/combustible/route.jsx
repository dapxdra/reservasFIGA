import { ROLES } from "@/app/lib/roles.js";
import {
  getAuthUserContext,
  hasRole,
  unauthorizedResponse,
} from "@/app/lib/serverAuth.js";
import { jsonResponse } from "@/app/core/shared/http/jsonResponse.js";

export const runtime = "nodejs";

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

function buildAddressCandidates(rawText) {
  const text = normalizeText(rawText);
  if (!text) return [];

  const upper = text.toUpperCase();
  const candidates = [text];

  if (upper === "SJO") {
    candidates.push("Aeropuerto Internacional Juan Santamaria, Costa Rica");
  }
  if (upper === "LIR") {
    candidates.push("Aeropuerto Internacional Daniel Oduber, Liberia, Costa Rica");
  }

  if (!/costa\s+rica/i.test(text)) {
    candidates.push(`${text}, Costa Rica`);
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
  const candidates = buildAddressCandidates(rawText);
  for (const candidate of candidates) {
    const coords = await geocodeOne(candidate);
    if (coords) return coords;
  }
  return null;
}

async function routeKm(origin, destination) {
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`;

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;

  const data = await response.json();
  const distanceMeters = toNumber(data?.routes?.[0]?.distance);
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) return null;

  return distanceMeters / 1000;
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
    const reservas = Array.isArray(body?.reservas) ? body.reservas : [];

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
    const unresolved = [];

    for (const reserva of reservas) {
      const pickUp = normalizeText(reserva?.pickUp);
      const dropOff = normalizeText(reserva?.dropOff);
      if (!pickUp || !dropOff) continue;

      const key = `${pickUp}|||${dropOff}`;
      if (routes.has(key)) continue;

      const origin = await geocodeAddress(pickUp);
      const destination = await geocodeAddress(dropOff);

      if (!origin || !destination) {
        routes.set(key, null);
        unresolved.push({ pickUp, dropOff, reason: "geocode" });
        continue;
      }

      const km = await routeKm(origin, destination);
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
