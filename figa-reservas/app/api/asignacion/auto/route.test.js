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
  runAutoAsignacionUseCase: vi.fn(),
}));

vi.mock("@/app/lib/serverAuth.js", () => ({
  getAuthUserContext: mocks.getAuthUserContext,
  hasRole: mocks.hasRole,
  unauthorizedResponse: mocks.unauthorizedResponse,
}));

vi.mock("@/app/core/server/asignacion/asignacionUseCase.js", () => ({
  runAutoAsignacionUseCase: mocks.runAutoAsignacionUseCase,
}));

vi.mock("@/app/core/server/shared/appError.js", () => ({
  isAppError: (error) => Boolean(error?.status),
}));

import * as route from "./route.jsx";

const { POST } = route;

const summary = {
  dryRun: true,
  desde: "2026-10-01",
  hasta: "2026-10-03",
  conductoresActivos: 2,
  pendientes: 1,
  asignadas: [{ id: "2", conductorId: "c2" }],
  sinAsignar: [],
};

function postReq(body) {
  return new Request("http://localhost/api/asignacion/auto", {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("/api/asignacion/auto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runAutoAsignacionUseCase.mockResolvedValue(summary);
  });

  it("no expone GET (no hay ejecución por cron)", () => {
    expect(route.GET).toBeUndefined();
  });

  it("POST responde el resumen del caso de uso", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      profile: { role: "admin" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(true);

    const res = await POST(postReq({ dias: 2 }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual(summary);
  });

  it("POST bloquea a conductores", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      profile: { role: "conductor" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(false);

    const res = await POST(postReq({ dryRun: false }));
    expect(res.status).toBe(403);
    expect(mocks.runAutoAsignacionUseCase).not.toHaveBeenCalled();
  });

  it("POST operador es dryRun por defecto y aplica con dryRun:false", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      profile: { role: "operador" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(true);

    let res = await POST(postReq());
    expect(res.status).toBe(200);
    expect(mocks.runAutoAsignacionUseCase).toHaveBeenLastCalledWith({ dryRun: true });

    res = await POST(postReq({ dryRun: false, dias: 3 }));
    expect(res.status).toBe(200);
    expect(mocks.runAutoAsignacionUseCase).toHaveBeenLastCalledWith({
      dryRun: false,
      dias: 3,
    });
  });

  it("POST mapea errores de dominio", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      profile: { role: "admin" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(true);
    mocks.runAutoAsignacionUseCase.mockRejectedValue({
      message: "dias inválido",
      status: 400,
      code: "ValidationError",
    });

    const res = await POST(postReq({ dias: 99 }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ message: "dias inválido", error: "ValidationError" });
  });
});
