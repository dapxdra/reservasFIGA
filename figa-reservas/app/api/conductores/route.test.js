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
  listConductoresUseCase: vi.fn(),
  createConductorUseCase: vi.fn(),
}));

vi.mock("../../lib/serverAuth.js", () => ({
  getAuthUserContext: mocks.getAuthUserContext,
  hasRole: mocks.hasRole,
  unauthorizedResponse: mocks.unauthorizedResponse,
}));

vi.mock("../../core/server/catalogos/catalogosUseCases.js", () => ({
  listConductoresUseCase: mocks.listConductoresUseCase,
  createConductorUseCase: mocks.createConductorUseCase,
}));

vi.mock("../../core/server/shared/appError.js", () => ({
  isAppError: (error) => Boolean(error?.status),
}));

import { GET, POST } from "./route.jsx";

describe("/api/conductores route role integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET bloquea para conductor", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      profile: { role: "conductor" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(false);

    const req = new Request("http://localhost/api/conductores?activos=true");
    const res = await GET(req);

    expect(res.status).toBe(403);
    expect(mocks.listConductoresUseCase).not.toHaveBeenCalled();
  });

  it("GET admin carga catalogo", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      profile: { role: "admin" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(true);
    mocks.listConductoresUseCase.mockResolvedValue([{ id: "c1" }]);

    const req = new Request("http://localhost/api/conductores?activos=true");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual([{ id: "c1" }]);
    expect(mocks.listConductoresUseCase).toHaveBeenCalledWith({ activos: true });
  });

  it("POST operador crea conductor", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      profile: { role: "operador" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(true);
    mocks.createConductorUseCase.mockResolvedValue("new-id");

    const req = new Request("http://localhost/api/conductores", {
      method: "POST",
      body: JSON.stringify({ nombre: "Luis" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBe("new-id");
  });
});
