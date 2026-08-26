import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  replayFailedReservaIntegrationUseCase: vi.fn(),
}));

vi.mock("@/app/core/server/reservas/reservasIntegrationUseCase.js", () => ({
  replayFailedReservaIntegrationUseCase: mocks.replayFailedReservaIntegrationUseCase,
}));

vi.mock("@/app/core/server/shared/appError.js", () => ({
  appError: (message, status = 400, code = "AppError") => {
    const error = new Error(message);
    error.status = status;
    error.code = code;
    return error;
  },
  isAppError: (error) => Boolean(error?.status),
}));

import { POST } from "./route.jsx";

describe("/api/integrations/reservas/replay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESERVAS_WEBHOOK_SECRET = "secret-123";
  });

  it("rechaza cuando secret no coincide", async () => {
    const req = new Request("http://localhost/api/integrations/reservas/replay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer wrong-secret",
      },
      body: JSON.stringify({ integrationKey: "shop:ord-100" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.message).toBe("No autorizado");
    expect(mocks.replayFailedReservaIntegrationUseCase).not.toHaveBeenCalled();
  });

  it("ejecuta replay correctamente", async () => {
    mocks.replayFailedReservaIntegrationUseCase.mockResolvedValue({
      id: 555,
      idempotent: false,
      replayed: true,
      integrationKey: "shop:ord-100",
    });

    const req = new Request("http://localhost/api/integrations/reservas/replay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer secret-123",
      },
      body: JSON.stringify({ integrationKey: "shop:ord-100" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe("Replay ejecutado correctamente");
    expect(data.id).toBe(555);
    expect(data.replayed).toBe(true);
    expect(data.integrationKey).toBe("shop:ord-100");
  });

  it("responde idempotente si ya estaba completada", async () => {
    mocks.replayFailedReservaIntegrationUseCase.mockResolvedValue({
      id: 321,
      idempotent: true,
      replayed: false,
      integrationKey: "shop:ord-100",
    });

    const req = new Request("http://localhost/api/integrations/reservas/replay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer secret-123",
      },
      body: JSON.stringify({ integrationKey: "shop:ord-100" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe("Integracion ya completada anteriormente");
    expect(data.idempotent).toBe(true);
    expect(data.replayed).toBe(false);
  });
});
