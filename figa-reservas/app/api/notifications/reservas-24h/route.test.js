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
  runReservas24hReminderUseCase: vi.fn(),
}));

vi.mock("@/app/lib/serverAuth.js", () => ({
  getAuthUserContext: mocks.getAuthUserContext,
  hasRole: mocks.hasRole,
  unauthorizedResponse: mocks.unauthorizedResponse,
}));

vi.mock("@/app/core/server/notifications/reservas24hUseCase.js", () => ({
  runReservas24hReminderUseCase: mocks.runReservas24hReminderUseCase,
}));

vi.mock("@/app/core/server/shared/appError.js", () => ({
  isAppError: (error) => Boolean(error?.status),
}));

import { GET, POST } from "./route.jsx";

describe("/api/notifications/reservas-24h route role integration", () => {
  const previousSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  afterAll(() => {
    process.env.CRON_SECRET = previousSecret;
  });

  it("GET rechaza cron sin secreto", async () => {
    const req = {
      headers: { get: () => "" },
      nextUrl: new URL("http://localhost/api/notifications/reservas-24h"),
    };

    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("POST bloquea no-admin", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      profile: { role: "operador" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(false);

    const req = new Request("http://localhost/api/notifications/reservas-24h", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("POST admin ejecuta job", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      profile: { role: "admin" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(true);
    mocks.runReservas24hReminderUseCase.mockResolvedValue({ sent: 2, skipped: 0 });

    const req = new Request("http://localhost/api/notifications/reservas-24h", {
      method: "POST",
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(data.sent).toBe(2);
    expect(data.skipped).toBe(0);
  });
});
