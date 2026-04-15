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
  updateConductorUseCase: vi.fn(),
  setConductorActivoUseCase: vi.fn(),
}));

vi.mock("../../../lib/serverAuth.js", () => ({
  getAuthUserContext: mocks.getAuthUserContext,
  hasRole: mocks.hasRole,
  unauthorizedResponse: mocks.unauthorizedResponse,
}));

vi.mock("../../../core/server/catalogos/catalogosUseCases.js", () => ({
  updateConductorUseCase: mocks.updateConductorUseCase,
  setConductorActivoUseCase: mocks.setConductorActivoUseCase,
}));

vi.mock("../../../core/server/shared/appError.js", () => ({
  isAppError: (error) => Boolean(error?.status),
}));

import { PATCH, PUT } from "./route.jsx";

describe("/api/conductores/[id] role integration", () => {
  const params = Promise.resolve({ id: "c1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PUT bloquea conductor", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      profile: { role: "conductor" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(false);

    const req = new Request("http://localhost/api/conductores/c1", {
      method: "PUT",
      body: JSON.stringify({ nombre: "Luis" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PUT(req, { params });
    expect(res.status).toBe(403);
  });

  it("PATCH operador actualiza estado", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      profile: { role: "operador" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(true);
    mocks.setConductorActivoUseCase.mockResolvedValue(true);

    const req = new Request("http://localhost/api/conductores/c1", {
      method: "PATCH",
      body: JSON.stringify({ activo: true }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toContain("activado");
  });

  it("PUT traduce AppError", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      profile: { role: "admin" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(true);
    mocks.updateConductorUseCase.mockRejectedValue({
      status: 400,
      code: "ValidationError",
      message: "nombre es requerido",
    });

    const req = new Request("http://localhost/api/conductores/c1", {
      method: "PUT",
      body: JSON.stringify({ nombre: "" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PUT(req, { params });
    expect(res.status).toBe(400);
  });
});
