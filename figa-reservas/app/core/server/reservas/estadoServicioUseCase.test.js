import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getReservaById: vi.fn(),
  updateReservaById: vi.fn(),
  resolveReservaAssignment: vi.fn(),
}));

vi.mock("@/app/core/server/reservas/reservasRepository.js", () => ({
  getReservaById: mocks.getReservaById,
  updateReservaById: mocks.updateReservaById,
  createReservaById: vi.fn(),
  getLastFigaId: vi.fn(),
  listReservasOrderedByFecha: vi.fn(),
}));

vi.mock("@/app/core/server/reservas/resolveReservaAssignment.js", () => ({
  resolveReservaAssignment: mocks.resolveReservaAssignment,
}));

import { updateEstadoServicioUseCase, updateReservaUseCase } from "./reservasUseCases.js";

const NOW = Date.parse("2026-10-02T12:00:00Z");
const PROFILE = { nombre: "Ana" };

describe("updateEstadoServicioUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateReservaById.mockResolvedValue();
  });

  it("el conductor asignado confirma la reserva", async () => {
    mocks.getReservaById.mockResolvedValue({ id: "10", assignedUid: "uid-ana" });

    const result = await updateEstadoServicioUseCase({
      id: "10",
      estado: "confirmada",
      uid: "uid-ana",
      profile: PROFILE,
      now: NOW,
    });

    const estadoServicioAt = { confirmada: "2026-10-02T12:00:00.000Z" };
    expect(mocks.updateReservaById).toHaveBeenCalledWith("10", {
      estadoServicio: "confirmada",
      estadoServicioAt,
    });
    expect(result).toEqual({ id: "10", estadoServicio: "confirmada", estadoServicioAt });
  });

  it("avanza conservando las marcas anteriores y permite saltar estados", async () => {
    mocks.getReservaById.mockResolvedValue({
      id: "10",
      assignedUid: "uid-ana",
      estadoServicio: "confirmada",
      estadoServicioAt: { confirmada: "2026-10-02T08:00:00.000Z" },
    });

    const result = await updateEstadoServicioUseCase({
      id: "10",
      estado: "a_bordo",
      uid: "uid-ana",
      profile: PROFILE,
      now: NOW,
    });

    expect(result.estadoServicioAt).toEqual({
      confirmada: "2026-10-02T08:00:00.000Z",
      a_bordo: "2026-10-02T12:00:00.000Z",
    });
  });

  it("rechaza retroceder o repetir el estado", async () => {
    mocks.getReservaById.mockResolvedValue({ id: "10", assignedUid: "uid-ana", estadoServicio: "en_pickup" });

    await expect(
      updateEstadoServicioUseCase({ id: "10", estado: "en_camino", uid: "uid-ana", profile: PROFILE })
    ).rejects.toMatchObject({ status: 409, code: "EstadoNoPermitido" });
    expect(mocks.updateReservaById).not.toHaveBeenCalled();
  });

  it("rechaza a un conductor que no es el asignado", async () => {
    mocks.getReservaById.mockResolvedValue({ id: "10", assignedUid: "uid-otro" });

    await expect(
      updateEstadoServicioUseCase({ id: "10", estado: "confirmada", uid: "uid-ana", profile: PROFILE })
    ).rejects.toMatchObject({ status: 403 });
  });

  it("rechaza reservas canceladas, inexistentes y estados desconocidos", async () => {
    mocks.getReservaById.mockResolvedValueOnce({ id: "10", assignedUid: "uid-ana", cancelada: true });
    await expect(
      updateEstadoServicioUseCase({ id: "10", estado: "confirmada", uid: "uid-ana", profile: PROFILE })
    ).rejects.toMatchObject({ status: 409, code: "ReservaCancelada" });

    mocks.getReservaById.mockResolvedValueOnce(null);
    await expect(
      updateEstadoServicioUseCase({ id: "99", estado: "confirmada", uid: "uid-ana", profile: PROFILE })
    ).rejects.toMatchObject({ status: 404 });

    await expect(
      updateEstadoServicioUseCase({ id: "10", estado: "volando", uid: "uid-ana", profile: PROFILE })
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("updateReservaUseCase al reasignar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateReservaById.mockResolvedValue();
    mocks.resolveReservaAssignment.mockResolvedValue({
      conductorNombre: "Beto",
      assignedUid: "uid-beto",
      vehiculoPlaca: "",
    });
  });

  it("borra la confirmación si cambia el conductor", async () => {
    mocks.getReservaById.mockResolvedValue({ id: "10", conductorId: "c-ana", estadoServicio: "confirmada" });

    await updateReservaUseCase({ id: "10", payload: { conductorId: "c-beto" } });

    expect(mocks.updateReservaById).toHaveBeenCalledWith(
      "10",
      expect.objectContaining({ estadoServicio: null, estadoServicioAt: null, assignedUid: "uid-beto" })
    );
  });

  it("conserva la confirmación si el conductor no cambia", async () => {
    mocks.getReservaById.mockResolvedValue({ id: "10", conductorId: "c-beto", estadoServicio: "confirmada" });

    await updateReservaUseCase({ id: "10", payload: { conductorId: "c-beto" } });

    const updateData = mocks.updateReservaById.mock.calls[0][1];
    expect(updateData).not.toHaveProperty("estadoServicio");
  });
});
