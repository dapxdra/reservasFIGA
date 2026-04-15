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
  listVehiculosUseCase: vi.fn(),
  createVehiculoUseCase: vi.fn(),
}));

vi.mock("../../lib/serverAuth.js", () => ({
  getAuthUserContext: mocks.getAuthUserContext,
  hasRole: mocks.hasRole,
  unauthorizedResponse: mocks.unauthorizedResponse,
}));

vi.mock("../../core/server/catalogos/catalogosUseCases.js", () => ({
  listVehiculosUseCase: mocks.listVehiculosUseCase,
  createVehiculoUseCase: mocks.createVehiculoUseCase,
}));

vi.mock("../../core/server/shared/appError.js", () => ({
  isAppError: (error) => Boolean(error?.status),
}));

import { GET, POST } from "./route.jsx";

describe("/api/vehiculos route role integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET bloquea para conductor", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      profile: { role: "conductor" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(false);

    const req = new Request("http://localhost/api/vehiculos?activos=true");
    const res = await GET(req);

    expect(res.status).toBe(403);
    expect(mocks.listVehiculosUseCase).not.toHaveBeenCalled();
  });

  it("GET operador carga catalogo", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      profile: { role: "operador" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(true);
    mocks.listVehiculosUseCase.mockResolvedValue([{ id: "v1" }]);

    const req = new Request("http://localhost/api/vehiculos?activos=false");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual([{ id: "v1" }]);
    expect(mocks.listVehiculosUseCase).toHaveBeenCalledWith({ activos: false });
  });

  it("POST admin crea vehiculo", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      profile: { role: "admin" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(true);
    mocks.createVehiculoUseCase.mockResolvedValue("new-id");

    const req = new Request("http://localhost/api/vehiculos", {
      method: "POST",
      body: JSON.stringify({ placa: "AB-123" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBe("new-id");
  });
});
