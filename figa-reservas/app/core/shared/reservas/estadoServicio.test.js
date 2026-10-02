import { describe, expect, it } from "vitest";
import {
  estaConfirmadaPorConductor,
  puedeAvanzarEstado,
  siguienteEstadoServicio,
} from "./estadoServicio.js";

describe("estadoServicio", () => {
  it("recorre los estados en orden", () => {
    expect(siguienteEstadoServicio(null)).toBe("confirmada");
    expect(siguienteEstadoServicio("confirmada")).toBe("en_camino");
    expect(siguienteEstadoServicio("a_bordo")).toBe("finalizada");
    expect(siguienteEstadoServicio("finalizada")).toBeNull();
  });

  it("solo permite avanzar", () => {
    expect(puedeAvanzarEstado(undefined, "confirmada")).toBe(true);
    expect(puedeAvanzarEstado("confirmada", "a_bordo")).toBe(true);
    expect(puedeAvanzarEstado("a_bordo", "en_camino")).toBe(false);
    expect(puedeAvanzarEstado("confirmada", "confirmada")).toBe(false);
    expect(puedeAvanzarEstado(null, "otro")).toBe(false);
  });

  it("identifica reservas confirmadas por el conductor", () => {
    expect(estaConfirmadaPorConductor({ estadoServicio: "en_camino" })).toBe(true);
    expect(estaConfirmadaPorConductor({ estadoServicio: null })).toBe(false);
    expect(estaConfirmadaPorConductor({})).toBe(false);
  });
});
