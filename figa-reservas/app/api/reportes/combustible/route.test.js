import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthUserContext: vi.fn(),
  hasRole: vi.fn(),
  unauthorizedResponse: vi.fn((message = "No autorizado") =>
    new Response(JSON.stringify({ error: "Unauthorized", message }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  ),
}));

vi.mock("../../../lib/serverAuth.js", () => ({
  getAuthUserContext: mocks.getAuthUserContext,
  hasRole: mocks.hasRole,
  unauthorizedResponse: mocks.unauthorizedResponse,
}));

import { POST } from "./route.jsx";

describe("/api/reportes/combustible route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthUserContext.mockResolvedValue({
      profile: { role: "admin" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(true);
  });

  it("suma el tramo dropoff -> garage fijo al total de kilometros", async () => {
    const fetchMock = vi.fn(async (input) => {
      const url = String(input);

      if (url === "https://api.recope.go.cr/ventas/precio/consumidor") {
        return Response.json([{ nomprod: "Gasolina Regular", preciototal: "700" }]);
      }

      if (url.includes("nominatim.openstreetmap.org/search") && url.includes("q=Hotel+Pickup")) {
        return Response.json([{ lat: "10.1", lon: "-84.1" }]);
      }

      if (url.includes("nominatim.openstreetmap.org/search") && url.includes("q=Aeropuerto+Dropoff")) {
        return Response.json([{ lat: "10.2", lon: "-84.2" }]);
      }

      if (
        url ===
        "https://router.project-osrm.org/route/v1/driving/-84.1,10.1;-84.2,10.2?overview=false"
      ) {
        return Response.json({ routes: [{ distance: 15000 }] });
      }

      if (
        url ===
        "https://router.project-osrm.org/route/v1/driving/-84.2,10.2;-84.570444,10.445556?overview=false"
      ) {
        return Response.json({ routes: [{ distance: 5000 }] });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const req = new Request("http://localhost/api/reportes/combustible", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipoCombustible: "regular",
        kmPorLitro: 10,
        reservas: [{ pickUp: "Hotel Pickup", dropOff: "Aeropuerto Dropoff" }],
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.totalKm).toBe(20);
    expect(data.rutasProcesadas).toBe(1);
    expect(data.litrosEstimados).toBe(2);
    expect(data.costoEstimado).toBe(1400);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://router.project-osrm.org/route/v1/driving/-84.2,10.2;-84.570444,10.445556?overview=false",
      { cache: "no-store" }
    );
  });
});