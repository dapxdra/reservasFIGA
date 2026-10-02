import { beforeEach, describe, expect, it, vi } from "vitest";

const docState = { data: null, set: vi.fn() };

vi.mock("@/app/lib/firebaseadmin.jsx", () => ({
  db: {
    collection: () => ({
      doc: () => ({
        get: async () => ({ exists: docState.data != null, data: () => docState.data }),
        set: (...args) => docState.set(...args),
      }),
    }),
  },
}));

import { GET } from "./route.jsx";
import { __resetFuelPriceCacheForTests } from "@/app/core/server/combustible/fuelPriceProvider.js";

const RECOPE_ROWS = [
  { nomprod: "GASOLINA SUPER ( SUPERIOR )", preciototal: "726.0000 " },
  { nomprod: "GASOLINA PLUS 91 ( REGULAR )", preciototal: "707.0000 " },
  { nomprod: "KEROSENE", preciototal: "613.0000 " },
  { nomprod: "DIESEL 50", preciototal: "688.0000 " },
];

function makeReq() {
  return new Request("http://localhost/api/maps/fuel-price", {
    headers: { "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}` },
  });
}

describe("/api/maps/fuel-price", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    __resetFuelPriceCacheForTests();
    docState.data = null;
    docState.set = vi.fn();
  });

  it("devuelve precios de RECOPE y guarda el ultimo valor conocido", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(RECOPE_ROWS)));

    const res = await GET(makeReq());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toMatchObject({ super: 726, regular: 707, diesel: 688, source: "recope", stale: false });
    expect(typeof data.fetchedAt).toBe("string");
    expect(docState.set).toHaveBeenCalledWith(
      expect.objectContaining({ super: 726, regular: 707, diesel: 688, source: "recope" }),
      { merge: true }
    );
  });

  it("usa el ultimo precio de Firestore cuando RECOPE falla o hace timeout", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")));
    docState.data = { super: 700, regular: 690, diesel: 650, fetchedAt: "2026-09-01T00:00:00.000Z" };

    const res = await GET(makeReq());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toMatchObject({ super: 700, diesel: 650, source: "firestore", stale: true });
    expect(data.fetchedAt).toBe("2026-09-01T00:00:00.000Z");
  });

  it("usa variables de entorno cuando no hay RECOPE ni Firestore", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("err", { status: 500 })));
    vi.stubEnv("FUEL_PRICE_DIESEL", "680");

    const res = await GET(makeReq());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toMatchObject({ diesel: 680, super: null, source: "env", stale: true });
  });

  it("responde 503 sin colgarse cuando no hay ninguna fuente", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    const res = await GET(makeReq());
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data).toMatchObject({ source: "none", stale: true });
    expect(typeof data.error).toBe("string");
  });
});
