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
  listUsersUseCase: vi.fn(),
  createUserUseCase: vi.fn(),
}));

vi.mock("../../lib/serverAuth.js", () => ({
  getAuthUserContext: mocks.getAuthUserContext,
  hasRole: mocks.hasRole,
  unauthorizedResponse: mocks.unauthorizedResponse,
}));

vi.mock("../../core/server/users/usersUseCases.js", () => ({
  listUsersUseCase: mocks.listUsersUseCase,
  createUserUseCase: mocks.createUserUseCase,
}));

vi.mock("../../core/server/shared/appError.js", () => ({
  isAppError: (error) => Boolean(error?.status),
}));

import { GET, POST } from "./route.jsx";

describe("/api/users route role integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET bloquea para no-admin", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      profile: { role: "operador" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(false);

    const req = new Request("http://localhost/api/users", { method: "GET" });
    const res = await GET(req);

    expect(res.status).toBe(403);
    expect(mocks.listUsersUseCase).not.toHaveBeenCalled();
  });

  it("GET admin lista usuarios", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      profile: { role: "admin" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(true);
    mocks.listUsersUseCase.mockResolvedValue([{ id: "u1" }]);

    const req = new Request("http://localhost/api/users", { method: "GET" });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(data).toEqual([{ id: "u1" }]);
  });

  it("POST traduce AppError de validación", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      profile: { role: "admin" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(true);
    mocks.createUserUseCase.mockRejectedValue({
      status: 400,
      code: "ValidationError",
      message: "nombre, email y role son requeridos",
    });

    const req = new Request("http://localhost/api/users", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(data.error).toBe("ValidationError");
    expect(data.message).toBeTypeOf("string");
  });
});
