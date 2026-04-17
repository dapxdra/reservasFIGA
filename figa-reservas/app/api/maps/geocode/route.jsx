import { jsonResponse } from "@/app/core/shared/http/jsonResponse.js";

const CODE_ALIASES = {
  SJO: "Aeropuerto Internacional Juan Santamaria, Costa Rica",
  LIR: "Aeropuerto Internacional Daniel Oduber, Liberia, Costa Rica",
};

function buildQueryCandidates(input) {
  const raw = String(input || "").trim();
  if (!raw) return [];

  const candidates = [raw];
  const upper = raw.toUpperCase();

  if (CODE_ALIASES[upper]) {
    candidates.push(CODE_ALIASES[upper]);
  }

  if (!/costa\s+rica/i.test(raw)) {
    candidates.push(`${raw}, Costa Rica`);
  }

  return [...new Set(candidates)];
}

async function searchInNominatim(queryText) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("countrycodes", "cr");
  url.searchParams.set("q", queryText);

  const response = await fetch(url.toString(), {
    headers: {
      "Accept": "application/json",
      "Accept-Language": "es",
      "User-Agent": "figa-reservas/1.0 (geocoding endpoint)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const hit = Array.isArray(data) ? data[0] : null;

  if (!hit) return null;

  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    lat,
    lng,
    displayName: String(hit.display_name || "").trim(),
  };
}

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get("q") || "").trim();

    if (!q) {
      return jsonResponse({ ok: false, message: "Parametro q requerido" }, 400);
    }

    const candidates = buildQueryCandidates(q);

    for (const candidate of candidates) {
      const result = await searchInNominatim(candidate);
      if (result) {
        return jsonResponse({
          ok: true,
          lat: result.lat,
          lng: result.lng,
          displayName: result.displayName,
          queryUsed: candidate,
        });
      }
    }

    return jsonResponse({ ok: false, message: "Sin resultados para la direccion" }, 404);
  } catch {
    return jsonResponse({ ok: false, message: "Error geocodificando direccion" }, 500);
  }
}
