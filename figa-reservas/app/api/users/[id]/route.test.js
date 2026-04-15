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
  updateUserUseCase: vi.fn(),
  toggleUserStatusUseCase: vi.fn(),
}));

vi.mock("../../../lib/serverAuth.js", () => ({
  getAuthUserContext: mocks.getAuthUserContext,
  hasRole: mocks.hasRole,
  unauthorizedResponse: mocks.unauthorizedResponse,
}));

vi.mock("../../../core/server/users/usersUseCases.js", () => ({
  updateUserUseCase: mocks.updateUserUseCase,
  toggleUserStatusUseCase: mocks.toggleUserStatusUseCase,
}));

vi.mock("../../../core/server/shared/appError.js", () => ({
  isAppError: (error) => Boolean(error?.status),
}));

import { PATCH, PUT } from "./route.jsx";

describe("/api/users/[id] role integration", () => {
  const params = Promise.resolve({ id: "u1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PUT bloquea no-admin", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      profile: { role: "operador" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(false);

    const req = new Request("http://localhost/api/users/u1", {
      method: "PUT",
      body: JSON.stringify({ nombre: "A" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PUT(req, { params });
    expect(res.status).toBe(403);
  });

  it("PUT admin actualiza usuario", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      profile: { role: "admin" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(true);

    const req = new Request("http://localhost/api/users/u1", {
      method: "PUT",
      body: JSON.stringify({ nombre: "Ana", email: "ana@mail.com", role: "admin" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PUT(req, { params });
    expect(res.status).toBe(200);
    expect(mocks.updateUserUseCase).toHaveBeenCalledWith("u1", expect.any(Object));
  });

  it("PATCH traduce AppError", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      profile: { role: "admin" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(true);
    mocks.toggleUserStatusUseCase.mockRejectedValue({
      status: 400,
      code: "ValidationError",
      message: "ID no proporcionado",
    });

    const req = new Request("http://localhost/api/users/u1", {
      method: "PATCH",
      body: JSON.stringify({ activo: true }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req, { params });
    expect(res.status).toBe(400);
  });
});
