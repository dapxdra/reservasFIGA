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
  getReservaByIdUseCase: vi.fn(),
  updateReservaUseCase: vi.fn(),
  cancelReservaUseCase: vi.fn(),
  patchCancelReservaUseCase: vi.fn(),
}));

vi.mock("../../../lib/firebaseadmin.jsx", () => ({ db: {} }));

vi.mock("../../../lib/serverAuth.js", () => ({
  getAuthUserContext: mocks.getAuthUserContext,
  hasRole: mocks.hasRole,
  unauthorizedResponse: mocks.unauthorizedResponse,
}));

vi.mock("../../../core/server/reservas/reservasUseCases.js", () => ({
  getReservaByIdUseCase: mocks.getReservaByIdUseCase,
  updateReservaUseCase: mocks.updateReservaUseCase,
  cancelReservaUseCase: mocks.cancelReservaUseCase,
  patchCancelReservaUseCase: mocks.patchCancelReservaUseCase,
}));

vi.mock("../../../core/server/shared/appError.js", () => ({
  isAppError: (error) => Boolean(error?.status),
}));

import { DELETE, GET, PATCH, PUT } from "./route.jsx";

describe("/api/reservas/[id] role integration", () => {
  const params = Promise.resolve({ id: "r1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET responde 400 si falta id", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      uid: "u1",
      profile: { role: "admin" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(false);

    const req = new Request("http://localhost/api/reservas/r1", { method: "GET" });
    const res = await GET(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(400);
  });

  it("PUT bloquea conductor", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      profile: { role: "conductor" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(false);

    const req = new Request("http://localhost/api/reservas/r1", {
      method: "PUT",
      body: JSON.stringify({ cliente: "X" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PUT(req, { params });
    expect(res.status).toBe(403);
  });

  it("GET traduce AppError 403 a unauthorizedResponse", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      uid: "u1",
      profile: { role: "conductor", nombre: "Luis" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(true);
    mocks.getReservaByIdUseCase.mockRejectedValue({
      status: 403,
      code: "ReservaForbidden",
      message: "No tienes permisos para ver esta reserva.",
    });

    const req = new Request("http://localhost/api/reservas/r1", { method: "GET" });
    const res = await GET(req, { params });

    expect(res.status).toBe(403);
  });

  it("DELETE traduce not found", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      profile: { role: "admin" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(true);
    mocks.cancelReservaUseCase.mockRejectedValue({
      status: 404,
      code: "ReservaNotFound",
      message: "Reserva no encontrada",
    });

    const req = new Request("http://localhost/api/reservas/r1", { method: "DELETE" });
    const res = await DELETE(req, { params });

    expect(res.status).toBe(404);
  });

  it("PATCH admin ejecuta actualización", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      profile: { role: "admin" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(true);

    const req = new Request("http://localhost/api/reservas/r1", {
      method: "PATCH",
      body: JSON.stringify({ id: "r1", cancelada: true }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req);
    expect(res.status).toBe(200);
    expect(mocks.patchCancelReservaUseCase).toHaveBeenCalledTimes(1);
  });
});
