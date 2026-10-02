import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getTravelTimes: vi.fn(),
  saveTravelTimes: vi.fn(),
  fetchOsrmTiempos: vi.fn(),
}));

vi.mock("@/app/core/server/asignacion/travelTimesRepository.js", () => ({
  getTravelTimes: mocks.getTravelTimes,
  saveTravelTimes: mocks.saveTravelTimes,
}));

vi.mock("@/app/core/server/asignacion/providers/osrmTableProvider.js", () => ({
  fetchOsrmTiempos: mocks.fetchOsrmTiempos,
}));

import { cargarTiemposReales, paresNecesarios } from "./asignacionTiempos.js";
import { claveViaje } from "./asignacionScoring.js";
import { GARAGE_COORDS, KNOWN_PLACE_COORDS as K } from "@/app/core/server/shared/knownPlaces.js";

const NOW = Date.parse("2026-10-02T12:00:00Z");

const manana = { minutos: 480, origen: K.lir, destino: K.tamarindo };
const tarde = { minutos: 900, origen: K.tamarindo, destino: K.lir };

describe("paresNecesarios", () => {
  it("incluye garage->pickup, pickup->dropoff y dropoff->pickup posteriores del mismo día", () => {
    const claves = paresNecesarios([[manana, tarde]]).map((p) => p.clave).sort();

    expect(claves).toEqual(
      [
        claveViaje(GARAGE_COORDS, K.lir),
        claveViaje(GARAGE_COORDS, K.tamarindo),
        claveViaje(K.lir, K.tamarindo),
        claveViaje(K.tamarindo, K.lir),
      ].sort()
    );
  });

  it("ignora servicios sin hora o sin ubicación", () => {
    const pares = paresNecesarios([[{ minutos: null, origen: K.lir, destino: K.sjo }, { minutos: 600, origen: null, destino: null }]]);
    expect(pares).toEqual([]);
  });
});

describe("cargarTiemposReales", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.saveTravelTimes.mockResolvedValue();
  });

  it("usa la cache vigente y pide a OSRM solo lo que falta, guardándolo", async () => {
    const lirTam = claveViaje(K.lir, K.tamarindo);
    const tamLir = claveViaje(K.tamarindo, K.lir);
    const garLir = claveViaje(GARAGE_COORDS, K.lir);
    mocks.getTravelTimes.mockResolvedValue(
      new Map([
        [lirTam, { minutos: 84, km: 64, updatedAtMs: NOW - 1000 }],
        // Vencida (más de 90 días): se vuelve a pedir.
        [tamLir, { minutos: 80, km: 60, updatedAtMs: NOW - 100 * 24 * 3600 * 1000 }],
      ])
    );
    mocks.fetchOsrmTiempos.mockImplementation(async (pares) => ({
      tiempos: new Map(pares.filter((p) => p.clave !== garLir).map((p) => [p.clave, { minutos: 90, km: 70 }])),
      error: null,
    }));

    const { tiempos, resumen } = await cargarTiemposReales([[manana, tarde]], { now: NOW });

    const pedidos = mocks.fetchOsrmTiempos.mock.calls[0][0].map((p) => p.clave);
    expect(pedidos).not.toContain(lirTam);
    expect(pedidos).toContain(tamLir);
    expect(tiempos.get(lirTam)).toEqual({ minutos: 84, km: 64 });
    expect(tiempos.get(tamLir)).toEqual({ minutos: 90, km: 70 });
    expect(mocks.saveTravelTimes).toHaveBeenCalledTimes(1);
    expect(resumen).toEqual({ pares: 4, cache: 1, osrm: 2, estimados: 1, error: null });
  });

  it("si la cache y OSRM fallan, devuelve todo para estimar sin lanzar", async () => {
    mocks.getTravelTimes.mockRejectedValue(new Error("firestore caído"));
    mocks.fetchOsrmTiempos.mockResolvedValue({ tiempos: new Map(), error: "timeout" });

    const { tiempos, resumen } = await cargarTiemposReales([[manana, tarde]], { now: NOW });

    expect(tiempos.size).toBe(0);
    expect(resumen).toMatchObject({ pares: 4, cache: 0, osrm: 0, estimados: 4, error: "osrm: timeout" });
    expect(mocks.saveTravelTimes).not.toHaveBeenCalled();
  });

  it("no consulta nada si no hay pares", async () => {
    const { resumen } = await cargarTiemposReales([[]]);

    expect(resumen.pares).toBe(0);
    expect(mocks.getTravelTimes).not.toHaveBeenCalled();
    expect(mocks.fetchOsrmTiempos).not.toHaveBeenCalled();
  });
});
