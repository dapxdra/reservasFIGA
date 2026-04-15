import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthUserContext: vi.fn(),
  normalizeRole: vi.fn((role) => role),
}));

vi.mock("../../../lib/serverAuth.js", () => ({
  getAuthUserContext: mocks.getAuthUserContext,
}));

vi.mock("../../../lib/roles.js", () => ({
  normalizeRole: mocks.normalizeRole,
}));

import { GET } from "./route.jsx";

describe("/api/auth/session integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna errorResponse si existe", async () => {
    const errorResponse = new Response(JSON.stringify({ error: "Unauthenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });

    mocks.getAuthUserContext.mockResolvedValue({ errorResponse });

    const req = new Request("http://localhost/api/auth/session");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("retorna sesión normalizada", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      uid: "u1",
      profile: { role: "administrador", nombre: "Ana", email: "ana@mail.com", activo: true },
      errorResponse: null,
    });
    mocks.normalizeRole.mockReturnValue("admin");

    const req = new Request("http://localhost/api/auth/session");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.uid).toBe("u1");
    expect(data.role).toBe("admin");
  });

  it("retorna 500 en error inesperado", async () => {
    mocks.getAuthUserContext.mockRejectedValue(new Error("boom"));

    const req = new Request("http://localhost/api/auth/session");
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});
