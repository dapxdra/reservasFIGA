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
  getTrackingStatusUseCase: vi.fn(),
}));

vi.mock("@/app/lib/serverAuth.js", () => ({
  getAuthUserContext: mocks.getAuthUserContext,
  hasRole: mocks.hasRole,
  unauthorizedResponse: mocks.unauthorizedResponse,
}));

vi.mock("@/app/core/server/tracking/trackingUseCases.js", () => ({
  getTrackingStatusUseCase: mocks.getTrackingStatusUseCase,
}));

import { GET } from "./route.jsx";

const req = () => new Request("http://localhost/api/conductores/tracking");

describe("GET /api/conductores/tracking", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve el error de autenticación tal cual", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      profile: null,
      errorResponse: new Response(JSON.stringify({ message: "No autenticado" }), { status: 401 }),
    });
    expect((await GET(req())).status).toBe(401);
  });

  it("bloquea a quien no es conductor", async () => {
    mocks.getAuthUserContext.mockResolvedValue({ profile: { role: "admin" }, errorResponse: null });
    mocks.hasRole.mockReturnValue(false);

    expect((await GET(req())).status).toBe(403);
    expect(mocks.getTrackingStatusUseCase).not.toHaveBeenCalled();
  });

  it("devuelve el estado de seguimiento del conductor", async () => {
    const profile = { role: "conductor", uid: "uid-ana", nombre: "Ana" };
    mocks.getAuthUserContext.mockResolvedValue({ profile, errorResponse: null });
    mocks.hasRole.mockReturnValue(true);
    mocks.getTrackingStatusUseCase.mockResolvedValue({
      activo: true,
      reservaId: "12",
      desde: "2026-10-02T11:00:00.000Z",
      hasta: "2026-10-02T20:00:00.000Z",
    });

    const res = await GET(req());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mocks.getTrackingStatusUseCase).toHaveBeenCalledWith({ uid: "uid-ana", profile });
    expect(data).toEqual({
      ok: true,
      activo: true,
      reservaId: "12",
      desde: "2026-10-02T11:00:00.000Z",
      hasta: "2026-10-02T20:00:00.000Z",
    });
  });

  it("responde 500 con JSON ante un error inesperado", async () => {
    mocks.getAuthUserContext.mockResolvedValue({ profile: { uid: "u" }, errorResponse: null });
    mocks.hasRole.mockReturnValue(true);
    mocks.getTrackingStatusUseCase.mockRejectedValue(new Error("firestore"));

    const res = await GET(req());
    expect(res.status).toBe(500);
    expect((await res.json()).message).toBeTruthy();
  });
});
