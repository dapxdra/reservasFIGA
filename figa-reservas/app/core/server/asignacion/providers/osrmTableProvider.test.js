import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchOsrmTiempos } from "./osrmTableProvider.js";

const A = { lat: 10.5933, lng: -85.5444 };
const B = { lat: 10.2994, lng: -85.8447 };
const C = { lat: 10.4693, lng: -84.6432 };

function par(desde, hasta, claveDesde, claveHasta) {
  return { clave: `${claveDesde}>${claveHasta}`, claveDesde, claveHasta, desde, hasta };
}

describe("fetchOsrmTiempos", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("pide una matriz fuentes x destinos y devuelve solo los pares pedidos", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        code: "Ok",
        // fuentes [A, C] x destinos [B]
        durations: [[5040], [null]],
        distances: [[63912], [null]],
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const { tiempos, error } = await fetchOsrmTiempos([par(A, B, "a", "b"), par(C, B, "c", "b")]);

    expect(error).toBeNull();
    const url = fetchMock.mock.calls[0][0];
    expect(url).toContain("/table/v1/driving/-85.5444,10.5933;-84.6432,10.4693;-85.8447,10.2994");
    expect(url).toContain("sources=0;1&destinations=2");
    expect(tiempos.get("a>b")).toEqual({ minutos: 84, km: 63.9 });
    // OSRM sin ruta (null) queda fuera para que se estime.
    expect(tiempos.has("c>b")).toBe(false);
  });

  it("no lanza si OSRM falla y reporta el error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("busy", { status: 429 })));

    const { tiempos, error } = await fetchOsrmTiempos([par(A, B, "a", "b")]);

    expect(tiempos.size).toBe(0);
    expect(error).toMatch(/429/);
  });

  it("no llama a OSRM si no hay pares", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchOsrmTiempos([]);

    expect(result.tiempos.size).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
