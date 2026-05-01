import { jsonResponse } from "@/app/core/shared/http/jsonResponse.js";

export const runtime = "nodejs";

function parseCoordinate(value) {
  if (value == null || String(value).trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parsePoint(searchParams, prefix) {
  const lat = parseCoordinate(searchParams.get(`${prefix}Lat`));
  const lng = parseCoordinate(searchParams.get(`${prefix}Lng`));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function normalizePath(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

  const path = coordinates
    .map((coord) => {
      if (!Array.isArray(coord) || coord.length < 2) return null;
      const [lng, lat] = coord;
      const latNum = Number(lat);
      const lngNum = Number(lng);
      if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;
      return { lat: latNum, lng: lngNum };
    })
    .filter(Boolean);

  return path.length >= 2 ? path : null;
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

function fallbackRoute(origin, destination, reason, upstreamStatus = null) {
  return jsonResponse({
    ok: true,
    path: [origin, destination],
    distanceKm: haversineDistanceKm(origin, destination),
    fallback: true,
    provider: "haversine",
    reason,
    upstreamStatus,
  });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const origin = parsePoint(searchParams, "origin");
  const destination = parsePoint(searchParams, "destination");

  if (!origin || !destination) {
    return jsonResponse(
      { ok: false, message: "Parametros originLat, originLng, destinationLat y destinationLng son requeridos" },
      400
    );
  }

  try {
    const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      return fallbackRoute(origin, destination, "osrm-http-error", response.status);
    }

    const data = await response.json();
    const route = data?.routes?.[0];
    const path = normalizePath(route?.geometry?.coordinates);
    const distanceMeters = Number(route?.distance);
    const distanceKm =
      Number.isFinite(distanceMeters) && distanceMeters > 0
        ? Math.round((distanceMeters / 1000) * 10) / 10
        : null;

    if (!path || !Number.isFinite(distanceKm)) {
      return fallbackRoute(origin, destination, "osrm-invalid-route");
    }

    return jsonResponse({ ok: true, path, distanceKm, fallback: false, provider: "osrm" });
  } catch {
    return fallbackRoute(origin, destination, "osrm-network-error");
  }
}
