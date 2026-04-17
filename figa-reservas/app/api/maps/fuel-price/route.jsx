import { NextResponse } from "next/server";

const FUEL_PATTERNS = {
  super: /super/i,
  regular: /plus\s*91|regular/i,
  diesel: /di[eé]sel/i,
};

async function fetchFuelPrices() {
  const res = await fetch("https://api.recope.go.cr/ventas/precio/consumidor", {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("RECOPE no disponible");

  const rows = await res.json();
  const prices = {};

  for (const [key, pattern] of Object.entries(FUEL_PATTERNS)) {
    const match = rows.find((r) => pattern.test(String(r.nomprod || "")));
    if (match) {
      const n = parseFloat(String(match.preciototal).replace(",", "."));
      if (Number.isFinite(n)) prices[key] = n;
    }
  }

  return prices;
}

export async function GET() {
  try {
    const prices = await fetchFuelPrices();
    return NextResponse.json(prices, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
