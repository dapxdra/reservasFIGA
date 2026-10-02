import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listReservasOrderedByFecha: vi.fn(),
  updateReservaById: vi.fn(),
  listConductores: vi.fn(),
  listVehiculos: vi.fn(),
}));

vi.mock("@/app/lib/firebaseadmin.jsx", () => ({ db: {} }));

vi.mock("@/app/core/server/reservas/reservasRepository.js", () => ({
  listReservasOrderedByFecha: mocks.listReservasOrderedByFecha,
  updateReservaById: mocks.updateReservaById,
}));

vi.mock("@/app/core/server/catalogos/conductoresRepository.js", () => ({
  listConductores: mocks.listConductores,
}));

vi.mock("@/app/core/server/catalogos/vehiculosRepository.js", () => ({
  listVehiculos: mocks.listVehiculos,
}));

vi.mock("@/app/core/server/asignacion/asignacionTiempos.js", () => ({
  cargarTiemposReales: async () => ({
    tiempos: new Map(),
    resumen: { pares: 0, cache: 0, osrm: 0, estimados: 0, error: null },
  }),
}));

vi.mock("@/app/utils/getTodayCR.js", () => ({
  getTodayCR: () => "2026-10-01",
}));

import { runAutoAsignacionUseCase } from "./asignacionUseCase.js";

describe("runAutoAsignacionUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listConductores.mockResolvedValue([
      { id: "c1", nombre: "Ana", uid: "uid-ana", vehiculoId: "v1" },
      { id: "c2", nombre: "Beto", uid: "uid-beto", vehiculoId: "v2" },
    ]);
    mocks.listVehiculos.mockResolvedValue([
      { id: "v1", placa: "AAA-111", capacidad: 8, activo: true },
      { id: "v2", placa: "BBB-222", capacidad: 8, activo: true },
    ]);
    mocks.listReservasOrderedByFecha.mockResolvedValue([
      { id: "1", fecha: "2026-10-01", hora: "08:00", conductorId: "c1", vehiculoId: "v1" },
      { id: "2", fecha: "2026-10-01", hora: "09:00", conductorId: "" },
      { id: "3", fecha: "2026-10-01", hora: "11:00", conductorId: "" },
      { id: "4", fecha: "2026-10-01", hora: "", conductorId: "" },
      { id: "5", fecha: "2026-10-01", hora: "15:00", cancelada: true },
      { id: "6", fecha: "2026-09-30", hora: "10:00", conductorId: "" },
      { id: "7", fecha: "2026-10-10", hora: "10:00", conductorId: "" },
    ]);
  });

  it("dryRun propone sin escribir y devuelve el resumen completo", async () => {
    const summary = await runAutoAsignacionUseCase({ dias: 2 });

    expect(mocks.listConductores).toHaveBeenCalledWith({ activos: true });
    expect(mocks.updateReservaById).not.toHaveBeenCalled();
    expect(summary).toMatchObject({
      dryRun: true,
      desde: "2026-10-01",
      hasta: "2026-10-03",
      conductoresActivos: 2,
      pendientes: 3,
    });
    // 09:00 va a Beto (Ana tiene 08:00); 11:00 choca con ambos por la ventana de 5h.
    expect(summary.asignadas).toEqual([
      expect.objectContaining({
        id: "2",
        conductorId: "c2",
        conductorNombre: "Beto",
        vehiculoId: "v2",
        vehiculoPlaca: "BBB-222",
      }),
    ]);
    expect(summary.sinAsignar).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "3", motivo: "SinConductorDisponible" }),
        expect.objectContaining({ id: "4", motivo: "SinHora" }),
      ])
    );
  });

  it("con dryRun=false escribe conductor, vehículo fijo y auditoría", async () => {
    await runAutoAsignacionUseCase({ dias: 2, dryRun: false });

    expect(mocks.updateReservaById).toHaveBeenCalledTimes(1);
    expect(mocks.updateReservaById).toHaveBeenCalledWith(
      "2",
      expect.objectContaining({
        conductorId: "c2",
        conductorNombre: "Beto",
        chofer: "Beto",
        assignedUid: "uid-beto",
        vehiculoId: "v2",
        vehiculoPlaca: "BBB-222",
        buseta: "BBB-222",
        asignacionAuto: expect.objectContaining({ motivo: "MenorCargaDelDia" }),
      })
    );
  });

  it("no pisa el vehículo que la reserva ya traía", async () => {
    mocks.listReservasOrderedByFecha.mockResolvedValue([
      { id: "9", fecha: "2026-10-01", hora: "09:00", conductorId: "", vehiculoId: "v1" },
    ]);

    await runAutoAsignacionUseCase({ dias: 0, dryRun: false });

    const [, update] = mocks.updateReservaById.mock.calls[0];
    expect(update).not.toHaveProperty("vehiculoId");
    expect(update).not.toHaveProperty("buseta");
  });

  it("valida el rango de días", async () => {
    await expect(runAutoAsignacionUseCase({ dias: 99 })).rejects.toMatchObject({
      status: 400,
      code: "ValidationError",
    });
  });
});
