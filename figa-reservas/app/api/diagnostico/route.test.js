import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthUserContext: vi.fn(),
  buildDiagnosticoUseCase: vi.fn(),
}));

vi.mock("@/app/lib/serverAuth.js", () => ({
  getAuthUserContext: mocks.getAuthUserContext,
}));

vi.mock("@/app/core/server/diagnostico/diagnosticoUseCase.js", () => ({
  buildDiagnosticoUseCase: mocks.buildDiagnosticoUseCase,
}));

import { GET } from "./route.jsx";

describe("/api/diagnostico integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 cuando no está autenticado", async () => {
    const unauthorized = new Response(JSON.stringify({ error: "Unauthenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });

    mocks.getAuthUserContext.mockResolvedValue({ errorResponse: unauthorized });

    const req = new Request("http://localhost/api/diagnostico");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.auth.authenticated).toBe(false);
  });

  it("retorna diagnóstico generado", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      uid: "u1",
      profile: { role: "admin" },
      errorResponse: null,
    });
    mocks.buildDiagnosticoUseCase.mockResolvedValue({ ok: true, permissions: { isAdmin: true } });

    const req = new Request("http://localhost/api/diagnostico");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
  });

  it("retorna 500 en error inesperado", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      uid: "u1",
      profile: { role: "admin" },
      errorResponse: null,
    });
    mocks.buildDiagnosticoUseCase.mockRejectedValue(new Error("boom"));

    const req = new Request("http://localhost/api/diagnostico");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(Array.isArray(data.errors)).toBe(true);
  });
});
