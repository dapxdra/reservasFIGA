import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";

const mocks = vi.hoisted(() => ({
  createReservaFromIntegrationUseCase: vi.fn(),
}));

vi.mock("@/app/core/server/reservas/reservasIntegrationUseCase.js", () => ({
  createReservaFromIntegrationUseCase: mocks.createReservaFromIntegrationUseCase,
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

function signBody(body, timestamp, secret) {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
}

describe("/api/integrations/reservas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESERVAS_WEBHOOK_SECRET = "secret-123";
    delete process.env.RESERVAS_WEBHOOK_HMAC_SECRET;
  });

  it("rechaza cuando secret no coincide", async () => {
    const req = new Request("http://localhost/api/integrations/reservas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer wrong-secret",
      },
      body: JSON.stringify({ cliente: "A" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.message).toBe("No autorizado");
    expect(mocks.createReservaFromIntegrationUseCase).not.toHaveBeenCalled();
  });

  it("crea reserva desde integración", async () => {
    mocks.createReservaFromIntegrationUseCase.mockResolvedValue({
      id: 321,
      idempotent: false,
      integrationKey: "shop:ord-100",
    });

    const req = new Request("http://localhost/api/integrations/reservas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer secret-123",
      },
      body: JSON.stringify({
        source: "shop",
        externalReservationId: "ord-100",
        cliente: "Juan",
        fecha: "2026-07-29",
        hora: "14:00",
        pickUp: "SJO",
        dropOff: "Hotel",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBe(321);
    expect(data.idempotent).toBe(false);
    expect(data.integrationKey).toBe("shop:ord-100");
  });

  it("devuelve 200 cuando es idempotente", async () => {
    mocks.createReservaFromIntegrationUseCase.mockResolvedValue({
      id: 321,
      idempotent: true,
      integrationKey: "shop:ord-100",
    });

    const req = new Request("http://localhost/api/integrations/reservas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-key": "secret-123",
      },
      body: JSON.stringify({
        source: "shop",
        externalReservationId: "ord-100",
        cliente: "Juan",
        fecha: "2026-07-29",
        hora: "14:00",
        pickUp: "SJO",
        dropOff: "Hotel",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.idempotent).toBe(true);
  });

  it("rechaza si HMAC está habilitado y falta firma", async () => {
    process.env.RESERVAS_WEBHOOK_HMAC_SECRET = "hmac-abc";

    const req = new Request("http://localhost/api/integrations/reservas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer secret-123",
      },
      body: JSON.stringify({
        source: "shop",
        externalReservationId: "ord-100",
        cliente: "Juan",
        fecha: "2026-07-29",
        hora: "14:00",
        pickUp: "SJO",
        dropOff: "Hotel",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.message).toBe("Firma HMAC requerida");
    expect(mocks.createReservaFromIntegrationUseCase).not.toHaveBeenCalled();
  });

  it("acepta firma HMAC valida", async () => {
    process.env.RESERVAS_WEBHOOK_HMAC_SECRET = "hmac-abc";
    mocks.createReservaFromIntegrationUseCase.mockResolvedValue({
      id: 444,
      idempotent: false,
      integrationKey: "shop:ord-101",
    });

    const body = JSON.stringify({
      source: "shop",
      externalReservationId: "ord-101",
      cliente: "Ana",
      fecha: "2026-07-29",
      hora: "15:00",
      pickUp: "SJO",
      dropOff: "Hotel",
    });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = signBody(body, timestamp, "hmac-abc");

    const req = new Request("http://localhost/api/integrations/reservas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer secret-123",
        "x-webhook-timestamp": timestamp,
        "x-webhook-signature": `sha256=${signature}`,
      },
      body,
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBe(444);
  });
});
