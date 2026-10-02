import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listReservasByFechaRange: vi.fn(),
  updateReservaById: vi.fn(),
  saveDeviceToken: vi.fn(),
  deleteDeviceToken: vi.fn(),
  listDeviceTokensByUid: vi.fn(),
  sendPushToTokens: vi.fn(),
}));

vi.mock("@/app/lib/firebaseadmin.jsx", () => ({ db: {} }));

vi.mock("@/app/core/server/reservas/reservasRepository.js", () => ({
  listReservasByFechaRange: mocks.listReservasByFechaRange,
  updateReservaById: mocks.updateReservaById,
  // Usados por reservasUseCases.js (no por estos casos de uso).
  createReservaById: vi.fn(),
  getLastFigaId: vi.fn(),
  getReservaById: vi.fn(),
  listReservasOrderedByFecha: vi.fn(),
}));

vi.mock("@/app/core/server/tracking/deviceTokensRepository.js", () => ({
  saveDeviceToken: mocks.saveDeviceToken,
  deleteDeviceToken: mocks.deleteDeviceToken,
  listDeviceTokensByUid: mocks.listDeviceTokensByUid,
}));

vi.mock("@/app/core/server/tracking/providers/fcmPushProvider.js", () => ({
  sendPushToTokens: mocks.sendPushToTokens,
}));

import {
  getTrackingStatusUseCase,
  registerDeviceTokenUseCase,
  runTrackingStartPushUseCase,
} from "./trackingUseCases.js";

// 2026-10-02 06:00 en CR: dentro de la ventana de una reserva a las 08:00.
const NOW = Date.parse("2026-10-02T12:00:00Z");

describe("getTrackingStatusUseCase", () => {
  beforeEach(() => vi.clearAllMocks());

  it("consulta ayer..mañana (CR) y solo considera reservas del conductor", async () => {
    mocks.listReservasByFechaRange.mockResolvedValue([
      { id: "1", fecha: "2026-10-02", hora: "08:00", assignedUid: "otro" },
      { id: "2", fecha: "2026-10-02", hora: "16:00", assignedUid: "uid-ana" },
    ]);

    const estado = await getTrackingStatusUseCase({ uid: "uid-ana", profile: { nombre: "Ana" }, now: NOW });

    expect(mocks.listReservasByFechaRange).toHaveBeenCalledWith("2026-10-01", "2026-10-03");
    expect(estado).toEqual({
      activo: false,
      proximo: { reservaId: "2", desde: "2026-10-02T19:00:00.000Z" },
    });
  });

  it("reconoce reservas antiguas asignadas solo por nombre", async () => {
    mocks.listReservasByFechaRange.mockResolvedValue([
      { id: "3", fecha: "2026-10-02", hora: "08:00", chofer: "ana" },
    ]);

    const estado = await getTrackingStatusUseCase({ uid: "uid-ana", profile: { nombre: "Ana" }, now: NOW });

    expect(estado).toMatchObject({ activo: true, reservaId: "3" });
  });
});

describe("registerDeviceTokenUseCase", () => {
  beforeEach(() => vi.clearAllMocks());

  it("guarda token y plataforma válidos", async () => {
    await registerDeviceTokenUseCase({ uid: "u1", token: "x".repeat(40), platform: "Android" });
    expect(mocks.saveDeviceToken).toHaveBeenCalledWith({ uid: "u1", token: "x".repeat(40), platform: "android" });
  });

  it("rechaza token corto o plataforma desconocida", async () => {
    await expect(registerDeviceTokenUseCase({ uid: "u1", token: "abc", platform: "android" })).rejects.toMatchObject({ status: 400 });
    await expect(registerDeviceTokenUseCase({ uid: "u1", token: "x".repeat(40), platform: "symbian" })).rejects.toMatchObject({ status: 400 });
    expect(mocks.saveDeviceToken).not.toHaveBeenCalled();
  });
});

describe("runTrackingStartPushUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateReservaById.mockResolvedValue();
    mocks.deleteDeviceToken.mockResolvedValue();
    mocks.listReservasByFechaRange.mockResolvedValue([
      // Ventana abierta (08:00 CR, ahora 06:00 CR): se avisa.
      { id: "1", fecha: "2026-10-02", hora: "08:00", assignedUid: "u1", pickUp: "LIR", dropOff: "Tamarindo" },
      // Ya avisada.
      { id: "2", fecha: "2026-10-02", hora: "08:30", assignedUid: "u1", trackingPush: { sentAt: "x" } },
      // Cancelada.
      { id: "3", fecha: "2026-10-02", hora: "08:00", assignedUid: "u2", cancelada: true },
      // Ventana aún cerrada.
      { id: "4", fecha: "2026-10-02", hora: "15:00", assignedUid: "u1" },
      // Sin conductor.
      { id: "5", fecha: "2026-10-02", hora: "08:00", assignedUid: "" },
      // Conductor sin celular registrado.
      { id: "6", fecha: "2026-10-02", hora: "07:00", assignedUid: "u3" },
    ]);
    mocks.listDeviceTokensByUid.mockImplementation(async (uid) => (uid === "u1" ? ["tok-ok", "tok-viejo"] : []));
    mocks.sendPushToTokens.mockResolvedValue({ enviados: 1, fallidos: 1, tokensInvalidos: ["tok-viejo"] });
  });

  it("avisa una vez por reserva al abrirse la ventana y limpia tokens inválidos", async () => {
    const summary = await runTrackingStartPushUseCase({ now: NOW });

    expect(mocks.sendPushToTokens).toHaveBeenCalledTimes(1);
    const [tokens, mensaje] = mocks.sendPushToTokens.mock.calls[0];
    expect(tokens).toEqual(["tok-ok", "tok-viejo"]);
    expect(mensaje.data).toEqual({ tipo: "tracking-start", reservaId: "1" });
    expect(mensaje.body).toContain("LIR → Tamarindo");
    expect(mocks.deleteDeviceToken).toHaveBeenCalledWith("tok-viejo");
    expect(mocks.updateReservaById).toHaveBeenCalledWith("1", {
      trackingPush: { sentAt: "2026-10-02T12:00:00.000Z", enviados: 1 },
    });
    expect(summary).toMatchObject({ dryRun: false, revisadas: 2, enviadas: 1, sinDispositivo: 1, errores: 0 });
    expect(summary.detalles).toEqual([
      { reservaId: "1", estado: "Enviada", dispositivos: 1 },
      { reservaId: "6", estado: "SinDispositivo" },
    ]);
  });

  it("dryRun no envía ni marca", async () => {
    const summary = await runTrackingStartPushUseCase({ now: NOW, dryRun: true });

    expect(mocks.sendPushToTokens).not.toHaveBeenCalled();
    expect(mocks.updateReservaById).not.toHaveBeenCalled();
    expect(summary.detalles).toContainEqual({ reservaId: "1", estado: "Pendiente", dispositivos: 2 });
  });

  it("cuenta errores del proveedor sin cortar el resto", async () => {
    mocks.sendPushToTokens.mockRejectedValue(new Error("FCM caído"));

    const summary = await runTrackingStartPushUseCase({ now: NOW });

    expect(summary.errores).toBe(1);
    expect(summary.detalles[0]).toEqual({ reservaId: "1", estado: "Error", error: "FCM caído" });
    expect(mocks.updateReservaById).not.toHaveBeenCalled();
  });
});
