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
  createReservaUseCase: vi.fn(),
  listReservasUseCase: vi.fn(),
}));

vi.mock("../../lib/firebaseadmin.jsx", () => ({ db: {} }));

vi.mock("../../lib/serverAuth.js", () => ({
  getAuthUserContext: mocks.getAuthUserContext,
  hasRole: mocks.hasRole,
  unauthorizedResponse: mocks.unauthorizedResponse,
}));

vi.mock("../../core/server/reservas/reservasUseCases.js", () => ({
  createReservaUseCase: mocks.createReservaUseCase,
  listReservasUseCase: mocks.listReservasUseCase,
}));

vi.mock("../../core/server/shared/appError.js", () => ({
  isAppError: (error) => Boolean(error?.status),
}));

import { GET, POST } from "./route.jsx";

describe("/api/reservas route role integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST bloquea cuando no tiene rol admin/operador", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      profile: { role: "conductor" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(false);

    const req = new Request("http://localhost/api/reservas", {
      method: "POST",
      body: JSON.stringify({ cliente: "Test" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(mocks.createReservaUseCase).not.toHaveBeenCalled();
  });

  it("POST crea reserva con rol admin", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      profile: { role: "admin" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(true);
    mocks.createReservaUseCase.mockResolvedValue({ id: 77 });

    const req = new Request("http://localhost/api/reservas", {
      method: "POST",
      body: JSON.stringify({ cliente: "Test" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(data.id).toBe(77);
    expect(data.message).toBeTypeOf("string");
    expect(mocks.createReservaUseCase).toHaveBeenCalledTimes(1);
  });

  it("GET como conductor usa filtro conductor", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      uid: "uid-1",
      profile: { role: "conductor", nombre: "Luis" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(true);
    mocks.listReservasUseCase.mockResolvedValue([{ id: "1" }]);

    const req = new Request("http://localhost/api/reservas", {
      method: "GET",
    });

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(data).toEqual([{ id: "1" }]);
    expect(mocks.listReservasUseCase).toHaveBeenCalledWith({
      isConductor: true,
      uid: "uid-1",
      profile: { role: "conductor", nombre: "Luis" },
    });
  });
});
