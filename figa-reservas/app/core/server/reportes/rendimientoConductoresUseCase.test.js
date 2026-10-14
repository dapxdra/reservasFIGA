import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listReservasByFechaRange: vi.fn(),
  listConductores: vi.fn(),
}));

vi.mock("@/app/core/server/reservas/reservasRepository.js", () => ({
  listReservasByFechaRange: mocks.listReservasByFechaRange,
}));

vi.mock("@/app/core/server/catalogos/conductoresRepository.js", () => ({
  listConductores: mocks.listConductores,
}));

vi.mock("@/app/lib/firebaseadmin.jsx", () => ({ db: {} }));

import {
  getRendimientoConductoresUseCase,
  validateRendimientoQuery,
} from "./rendimientoConductoresUseCase.js";

// 2026-10-14 12:00 en Costa Rica.
const NOW = Date.parse("2026-10-14T18:00:00Z");

const conductores = [
  { id: "c1", uid: "u1", nombre: "Ana", activo: true },
  { id: "c2", uid: "u2", nombre: "Luis", activo: true },
];

const reservas = [
  { id: "1", fecha: "2026-10-10", hora: "08:00", conductorId: "c1", assignedUid: "u1" },
  // Sin conductorId: igual debe contar para Ana.
  { id: "2", fecha: "2026-10-11", hora: "08:00", assignedUid: "u1" },
  { id: "3", fecha: "2026-10-11", hora: "08:00", conductorId: "c2", assignedUid: "u2" },
];

describe("validateRendimientoQuery", () => {
  it("usa del primero del mes hasta hoy (CR) por defecto", () => {
    expect(validateRendimientoQuery({}, NOW)).toEqual({
      desde: "2026-10-01",
      hasta: "2026-10-14",
      toleranciaMin: 5,
      hoy: "2026-10-14",
    });
  });

  it.each([
    [{ desde: "14/10/2026" }, "formato"],
    [{ desde: "2026-10-10", hasta: "2026-10-01" }, "mayor"],
    [{ desde: "2024-01-01", hasta: "2026-01-01" }, "rango"],
    [{ tolerancia: "-1" }, "tolerancia"],
    [{ tolerancia: "2.5" }, "tolerancia"],
  ])("rechaza %o con 400", (query, texto) => {
    try {
      validateRendimientoQuery(query, NOW);
      throw new Error("no lanzó");
    } catch (error) {
      expect(error.status).toBe(400);
      expect(error.code).toBe("ValidationError");
      expect(error.message.toLowerCase()).toContain(texto);
    }
  });
});

describe("getRendimientoConductoresUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listReservasByFechaRange.mockResolvedValue(reservas);
    mocks.listConductores.mockResolvedValue(conductores);
  });

  it("devuelve a todos los conductores para el admin", async () => {
    const result = await getRendimientoConductoresUseCase({
      query: { desde: "2026-10-01", hasta: "2026-10-14", tolerancia: "10" },
      isConductor: false,
      uid: "admin",
      profile: { nombre: "Admin" },
      nowMs: NOW,
    });

    expect(mocks.listReservasByFechaRange).toHaveBeenCalledWith("2026-10-01", "2026-10-14");
    expect(result.rango).toEqual({
      desde: "2026-10-01",
      hasta: "2026-10-14",
      toleranciaMin: 10,
      hoy: "2026-10-14",
    });
    expect(result.porConductor.map((c) => [c.nombre, c.asignados])).toEqual([
      ["Ana", 2],
      ["Luis", 1],
    ]);
    expect(result.totales.asignados).toBe(3);
  });

  it("limita al conductor a sus propios servicios en una sola ficha", async () => {
    const result = await getRendimientoConductoresUseCase({
      query: {},
      isConductor: true,
      uid: "u1",
      profile: { nombre: "Ana" },
      nowMs: NOW,
    });

    expect(result.porConductor).toHaveLength(1);
    expect(result.porConductor[0]).toMatchObject({ conductorId: "c1", nombre: "Ana", asignados: 2 });
    expect(result.porConductor[0].servicios.map((s) => s.id)).toEqual(["1", "2"]);
    expect(result.totales.asignados).toBe(2);
    expect(result.porConductor[0]).not.toHaveProperty("ingresos");
    expect(result.totales).not.toHaveProperty("ingresos");
  });

  it("devuelve una ficha vacía si el conductor no está en el catálogo", async () => {
    const result = await getRendimientoConductoresUseCase({
      query: {},
      isConductor: true,
      uid: "u9",
      profile: { nombre: "Nuevo" },
      nowMs: NOW,
    });

    expect(result.porConductor).toEqual([]);
    expect(result.totales.asignados).toBe(0);
  });
});
