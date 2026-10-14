import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthUserContext: vi.fn(),
  getRendimientoConductoresUseCase: vi.fn(),
}));

vi.mock("@/app/lib/firebaseadmin.jsx", () => ({ db: {} }));

vi.mock("@/app/lib/serverAuth.js", async () => {
  const { normalizeRole } = await import("@/app/lib/roles.js");
  return {
    getAuthUserContext: mocks.getAuthUserContext,
    hasRole: (profile, roles) => roles.includes(normalizeRole(profile?.role)),
    unauthorizedResponse: (message = "No autorizado") =>
      new Response(JSON.stringify({ error: "Unauthorized", message }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
  };
});

vi.mock("@/app/core/server/reportes/rendimientoConductoresUseCase.js", () => ({
  getRendimientoConductoresUseCase: mocks.getRendimientoConductoresUseCase,
}));

import { GET } from "./route.jsx";
import { appError } from "@/app/core/server/shared/appError.js";

let ipSeq = 0;
const req = (qs = "") =>
  new Request(`http://localhost/api/reportes/conductores${qs}`, {
    headers: { "x-forwarded-for": `10.1.0.${++ipSeq}` },
  });

const asRole = (role, extra = {}) =>
  mocks.getAuthUserContext.mockResolvedValue({
    uid: `uid-${role}`,
    profile: { role, nombre: role, ...extra },
    errorResponse: null,
  });

const resultado = {
  rango: { desde: "2026-10-01", hasta: "2026-10-14", toleranciaMin: 5, hoy: "2026-10-14" },
  totales: { asignados: 1 },
  porConductor: [{ conductorId: "c1", nombre: "Ana" }],
};

describe("GET /api/reportes/conductores", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRendimientoConductoresUseCase.mockResolvedValue(resultado);
  });

  it("devuelve el error de autenticación tal cual", async () => {
    mocks.getAuthUserContext.mockResolvedValue({
      errorResponse: new Response(JSON.stringify({ message: "No autenticado" }), { status: 401 }),
    });
    expect((await GET(req())).status).toBe(401);
    expect(mocks.getRendimientoConductoresUseCase).not.toHaveBeenCalled();
  });

  it("bloquea al operador", async () => {
    asRole("operador");
    const res = await GET(req());
    expect(res.status).toBe(403);
    expect((await res.json()).message).toBeTruthy();
    expect(mocks.getRendimientoConductoresUseCase).not.toHaveBeenCalled();
  });

  it("devuelve el reporte completo al admin con los filtros de la query", async () => {
    asRole("admin");
    const res = await GET(req("?desde=2026-10-01&hasta=2026-10-14&tolerancia=10"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, ...resultado });
    expect(mocks.getRendimientoConductoresUseCase).toHaveBeenCalledWith({
      query: { desde: "2026-10-01", hasta: "2026-10-14", tolerancia: "10" },
      isConductor: false,
      uid: "uid-admin",
      profile: expect.objectContaining({ role: "admin" }),
    });
  });

  it("marca al conductor para que el use case filtre sus servicios", async () => {
    asRole("conductor");
    const res = await GET(req());

    expect(res.status).toBe(200);
    expect(mocks.getRendimientoConductoresUseCase).toHaveBeenCalledWith(
      expect.objectContaining({ isConductor: true, uid: "uid-conductor" })
    );
  });

  it("mapea errores de validación del dominio", async () => {
    asRole("admin");
    mocks.getRendimientoConductoresUseCase.mockRejectedValue(
      appError("Las fechas deben tener formato YYYY-MM-DD", 400, "ValidationError")
    );

    const res = await GET(req("?desde=mal"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      message: "Las fechas deben tener formato YYYY-MM-DD",
      error: "ValidationError",
    });
  });

  it("responde 500 con JSON ante un error inesperado", async () => {
    asRole("admin");
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getRendimientoConductoresUseCase.mockRejectedValue(new Error("firestore"));

    const res = await GET(req());
    expect(res.status).toBe(500);
    expect((await res.json()).message).toBeTruthy();
  });
});
