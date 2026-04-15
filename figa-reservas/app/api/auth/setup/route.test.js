import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyAuthToken: vi.fn(),
  createInitialAdminProfileUseCase: vi.fn(),
}));

vi.mock("../../../lib/serverAuth.js", () => ({
  verifyAuthToken: mocks.verifyAuthToken,
}));

vi.mock("../../../core/server/auth/authSetupUseCase.js", () => ({
  createInitialAdminProfileUseCase: mocks.createInitialAdminProfileUseCase,
}));

vi.mock("../../../core/server/shared/appError.js", () => ({
  isAppError: (error) => Boolean(error?.status),
}));

import { POST } from "./route.jsx";

describe("/api/auth/setup integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crea perfil admin inicial", async () => {
    mocks.verifyAuthToken.mockResolvedValue("uid-1");
    mocks.createInitialAdminProfileUseCase.mockResolvedValue({
      ok: true,
      uid: "uid-1",
      role: "admin",
    });

    const req = new Request("http://localhost/api/auth/setup", {
      method: "POST",
      body: JSON.stringify({ nombre: "Admin" }),
      headers: { Authorization: "Bearer token", "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(mocks.verifyAuthToken).toHaveBeenCalledTimes(1);
  });

  it("mapea AppError", async () => {
    mocks.verifyAuthToken.mockResolvedValue("uid-1");
    mocks.createInitialAdminProfileUseCase.mockRejectedValue({
      status: 403,
      code: "SetupAlreadyDone",
      message: "Ya existe un administrador.",
    });

    const req = new Request("http://localhost/api/auth/setup", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("SetupAlreadyDone");
  });

  it("retorna 500 en error inesperado", async () => {
    mocks.verifyAuthToken.mockResolvedValue("uid-1");
    mocks.createInitialAdminProfileUseCase.mockRejectedValue(new Error("boom"));

    const req = new Request("http://localhost/api/auth/setup", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
