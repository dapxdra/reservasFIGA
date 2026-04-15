import { describe, expect, it } from "vitest";
import {
  validateConductorPayload,
  validateEntityId,
  validateVehiculoPayload,
} from "./catalogValidators.js";

describe("catalogValidators", () => {
  it("valida conductor correcto", () => {
    const result = validateConductorPayload({ nombre: " Luis ", activo: true });
    expect(result.nombre).toBe("Luis");
  });

  it("rechaza conductor sin nombre", () => {
    expect(() => validateConductorPayload({ nombre: "" })).toThrow(
      "nombre es requerido"
    );
  });

  it("normaliza placa de vehículo", () => {
    const result = validateVehiculoPayload({ placa: "ab-123" });
    expect(result.placa).toBe("AB-123");
  });

  it("rechaza id vacío", () => {
    expect(() => validateEntityId("")) .toThrow("ID no proporcionado");
  });
});
