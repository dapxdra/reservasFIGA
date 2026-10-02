import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/app/core/server/shared/rateLimit.js";
import { getFuelPrices } from "@/app/core/server/combustible/fuelPriceProvider.js";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function GET(req) {
  const rateLimitResponse = enforceRateLimit(req, {
    routeKey: "api/maps/fuel-price",
    limit: 60,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { prices, source, fetchedAt, stale } = await getFuelPrices();

  if (source === "none") {
    return NextResponse.json(
      { error: "Precios de combustible no disponibles", source, stale },
      { status: 503 }
    );
  }

  // Mantiene las claves planas super/regular/diesel que consume el mapa.
  return NextResponse.json(
    { ...prices, source, fetchedAt, stale },
    { headers: { "Cache-Control": stale ? "public, max-age=300" : "public, max-age=3600" } }
  );
}
