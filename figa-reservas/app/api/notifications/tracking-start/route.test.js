import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthUserContext: vi.fn(),
  hasRole: vi.fn(),
  unauthorizedResponse: vi.fn((message = "No autorizado") =>
    new Response(JSON.stringify({ error: "Unauthorized", message }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  ),
  runTrackingStartPushUseCase: vi.fn(),
}));

vi.mock("@/app/lib/serverAuth.js", () => ({
  getAuthUserContext: mocks.getAuthUserContext,
  hasRole: mocks.hasRole,
  unauthorizedResponse: mocks.unauthorizedResponse,
}));

vi.mock("@/app/core/server/tracking/trackingUseCases.js", () => ({
  runTrackingStartPushUseCase: mocks.runTrackingStartPushUseCase,
}));

import { GET, POST } from "./route.jsx";

const SUMMARY = { dryRun: false, revisadas: 1, enviadas: 1, sinDispositivo: 0, errores: 0, detalles: [] };

function cronReq(authorization = "") {
  return {
    headers: { get: (name) => (name.toLowerCase() === "authorization" ? authorization : "") },
    nextUrl: new URL("http://localhost/api/notifications/tracking-start"),
  };
}

describe("/api/notifications/tracking-start", () => {
  const previousSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
    mocks.runTrackingStartPushUseCase.mockResolvedValue(SUMMARY);
  });

  afterAll(() => {
    process.env.CRON_SECRET = previousSecret;
  });

  it("GET rechaza cron sin secreto o con secreto incorrecto", async () => {
    expect((await GET(cronReq())).status).toBe(401);
    expect((await GET(cronReq("Bearer otro"))).status).toBe(401);
    expect(mocks.runTrackingStartPushUseCase).not.toHaveBeenCalled();
  });

  it("GET rechaza si CRON_SECRET no está configurado (este job envía pushes)", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(cronReq("Bearer "));
    expect(res.status).toBe(401);
  });

  it("GET con secreto ejecuta y devuelve el resumen", async () => {
    const res = await GET(cronReq("Bearer test-secret"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true, ...SUMMARY });
    expect(mocks.runTrackingStartPushUseCase).toHaveBeenCalledWith(undefined);
  });

  it("POST bloquea no-admin", async () => {
    mocks.getAuthUserContext.mockResolvedValue({ profile: { role: "operador" }, errorResponse: null });
    mocks.hasRole.mockReturnValue(false);

    const res = await POST(new Request("http://localhost/api/notifications/tracking-start", { method: "POST" }));
    expect(res.status).toBe(403);
  });

  it("POST admin con dryRun", async () => {
    mocks.getAuthUserContext.mockResolvedValue({ profile: { role: "admin" }, errorResponse: null });
    mocks.hasRole.mockReturnValue(true);

    const res = await POST(
      new Request("http://localhost/api/notifications/tracking-start", {
        method: "POST",
        body: JSON.stringify({ dryRun: true }),
      })
    );

    expect(res.status).toBe(200);
    expect(mocks.runTrackingStartPushUseCase).toHaveBeenCalledWith({ dryRun: true });
  });

  it("GET responde 500 con JSON si el caso de uso falla", async () => {
    mocks.runTrackingStartPushUseCase.mockRejectedValue(new Error("boom"));
    const res = await GET(cronReq("Bearer test-secret"));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(typeof data.message).toBe("string");
  });
});
