import { describe, expect, it } from "vitest";
import {
  validateCreateReservaPayload,
  validatePatchCancelPayload,
  validateUpdateReservaPayload,
} from "./reservaValidators.js";

describe("reservaValidators", () => {
  it("acepta payload válido en create", () => {
    expect(() => validateCreateReservaPayload({ cliente: "A" })).not.toThrow();
  });

  it("rechaza payload vacío en update", () => {
    expect(() => validateUpdateReservaPayload({})).toThrow("Datos inválidos");
  });

  it("rechaza patch sin id", () => {
    expect(() => validatePatchCancelPayload({ cancelada: true })).toThrow(
      "ID o datos no proporcionados"
    );
  });

  it("acepta patch válido", () => {
    expect(() =>
      validatePatchCancelPayload({ id: "1", cancelada: false })
    ).not.toThrow();
  });
});
