import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route.jsx";

describe("/api/maps/route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("devuelve ruta de OSRM cuando hay respuesta valida", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        routes: [
          {
            distance: 15321,
            geometry: {
              coordinates: [
                [-84.1, 10.1],
                [-84.15, 10.15],
                [-84.2, 10.2],
              ],
            },
          },
        ],
      })
    );

    vi.stubGlobal("fetch", fetchMock);

    const req = new Request(
      "http://localhost/api/maps/route?originLat=10.1&originLng=-84.1&destinationLat=10.2&destinationLng=-84.2"
    );

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.fallback).toBe(false);
    expect(data.provider).toBe("osrm");
    expect(data.distanceKm).toBe(15.3);
    expect(data.path).toHaveLength(3);
  });

  it("hace fallback cuando OSRM falla", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("upstream down", { status: 502 }));
    vi.stubGlobal("fetch", fetchMock);

    const req = new Request(
      "http://localhost/api/maps/route?originLat=10.486121048138322&originLng=-84.58723056528605&destinationLat=9.9981657&destinationLng=-84.20476049999999"
    );

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.fallback).toBe(true);
    expect(data.provider).toBe("haversine");
    expect(data.reason).toBe("osrm-http-error");
    expect(Number.isFinite(data.distanceKm)).toBe(true);
    expect(data.distanceKm).toBeGreaterThan(0);
    expect(data.path).toEqual([
      { lat: 10.486121048138322, lng: -84.58723056528605 },
      { lat: 9.9981657, lng: -84.20476049999999 },
    ]);
  });

  it("valida parametros requeridos", async () => {
    const req = new Request("http://localhost/api/maps/route?originLat=10.1");

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.ok).toBe(false);
  });
});
