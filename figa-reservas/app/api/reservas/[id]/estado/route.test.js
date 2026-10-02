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
  updateEstadoServicioUseCase: vi.fn(),
}));

vi.mock("@/app/lib/serverAuth.js", () => ({
  getAuthUserContext: mocks.getAuthUserContext,
  hasRole: mocks.hasRole,
  unauthorizedResponse: mocks.unauthorizedResponse,
}));

vi.mock("@/app/core/server/reservas/reservasUseCases.js", () => ({
  updateEstadoServicioUseCase: mocks.updateEstadoServicioUseCase,
}));

import { PATCH } from "./route.jsx";
import { appError } from "@/app/core/server/shared/appError.js";

const PROFILE = { role: "conductor", uid: "uid-ana", nombre: "Ana" };

function patch(body, id = "10") {
  return PATCH(
    new Request(`http://localhost/api/reservas/${id}/estado`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) }
  );
}

describe("PATCH /api/reservas/[id]/estado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthUserContext.mockResolvedValue({ uid: "uid-ana", profile: PROFILE, errorResponse: null });
    mocks.hasRole.mockReturnValue(true);
  });

  it("el conductor confirma y recibe el nuevo estado", async () => {
    const estadoServicioAt = { confirmada: "2026-10-02T12:00:00.000Z" };
    mocks.updateEstadoServicioUseCase.mockResolvedValue({ id: "10", estadoServicio: "confirmada", estadoServicioAt });

    const res = await patch({ estado: "Confirmada" });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true, id: "10", estadoServicio: "confirmada", estadoServicioAt });
    expect(mocks.updateEstadoServicioUseCase).toHaveBeenCalledWith({
      id: "10",
      estado: "confirmada",
      uid: "uid-ana",
      profile: PROFILE,
    });
  });

  it("bloquea a admin/operador", async () => {
    mocks.hasRole.mockReturnValue(false);
    const res = await patch({ estado: "confirmada" });
    expect(res.status).toBe(403);
    expect(mocks.updateEstadoServicioUseCase).not.toHaveBeenCalled();
  });

  it("mapea errores de dominio a su status", async () => {
    mocks.updateEstadoServicioUseCase.mockRejectedValue(
      appError("La reserva ya está en ese estado o en uno posterior.", 409, "EstadoNoPermitido")
    );
    const res = await patch({ estado: "en_camino" });
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data).toEqual({
      message: "La reserva ya está en ese estado o en uno posterior.",
      error: "EstadoNoPermitido",
    });
  });

  it("devuelve 403 si la reserva no es del conductor", async () => {
    mocks.updateEstadoServicioUseCase.mockRejectedValue(
      appError("Esta reserva no está asignada a ti.", 403, "ReservaForbidden")
    );
    expect((await patch({ estado: "confirmada" })).status).toBe(403);
  });

  it("responde 500 con JSON ante errores inesperados", async () => {
    mocks.updateEstadoServicioUseCase.mockRejectedValue(new Error("firestore"));
    const res = await patch({ estado: "confirmada" });
    expect(res.status).toBe(500);
    expect((await res.json()).message).toBeTruthy();
  });
});
