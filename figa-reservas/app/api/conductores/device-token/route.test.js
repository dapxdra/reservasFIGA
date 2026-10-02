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
  registerDeviceTokenUseCase: vi.fn(),
  unregisterDeviceTokenUseCase: vi.fn(),
}));

vi.mock("@/app/lib/serverAuth.js", () => ({
  getAuthUserContext: mocks.getAuthUserContext,
  hasRole: mocks.hasRole,
  unauthorizedResponse: mocks.unauthorizedResponse,
}));

vi.mock("@/app/core/server/tracking/trackingUseCases.js", () => ({
  registerDeviceTokenUseCase: mocks.registerDeviceTokenUseCase,
  unregisterDeviceTokenUseCase: mocks.unregisterDeviceTokenUseCase,
}));

import { DELETE, POST } from "./route.jsx";
import { appError } from "@/app/core/server/shared/appError.js";

const TOKEN = "f".repeat(64);

function req(method, body) {
  return new Request("http://localhost/api/conductores/device-token", {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("/api/conductores/device-token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthUserContext.mockResolvedValue({
      profile: { role: "conductor", uid: "uid-ana" },
      errorResponse: null,
    });
    mocks.hasRole.mockReturnValue(true);
  });

  it("POST registra el token del conductor autenticado", async () => {
    const res = await POST(req("POST", { token: TOKEN, platform: "android", uid: "otro" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    // El uid sale de la sesión, nunca del body.
    expect(mocks.registerDeviceTokenUseCase).toHaveBeenCalledWith({
      uid: "uid-ana",
      token: TOKEN,
      platform: "android",
    });
  });

  it("POST bloquea a quien no es conductor", async () => {
    mocks.hasRole.mockReturnValue(false);
    const res = await POST(req("POST", { token: TOKEN, platform: "android" }));
    expect(res.status).toBe(403);
    expect(mocks.registerDeviceTokenUseCase).not.toHaveBeenCalled();
  });

  it("POST mapea errores de validación", async () => {
    mocks.registerDeviceTokenUseCase.mockRejectedValue(appError("token inválido", 400, "ValidationError"));
    const res = await POST(req("POST", { token: "x", platform: "android" }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ message: "token inválido", error: "ValidationError" });
  });

  it("DELETE quita el token", async () => {
    const res = await DELETE(req("DELETE", { token: TOKEN }));
    expect(res.status).toBe(200);
    expect(mocks.unregisterDeviceTokenUseCase).toHaveBeenCalledWith({ token: TOKEN });
  });
});
