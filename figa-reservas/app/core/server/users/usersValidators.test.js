import { describe, expect, it } from "vitest";
import { validateId, validateUserPayload } from "./usersValidators.js";

describe("usersValidators", () => {
  it("normaliza payload válido", () => {
    const result = validateUserPayload({
      nombre: " Juan ",
      email: "JUAN@MAIL.COM ",
      role: "Administrador",
      activo: true,
    });

    expect(result.nombre).toBe("Juan");
    expect(result.email).toBe("juan@mail.com");
    expect(result.role).toBe("admin");
    expect(result.activo).toBe(true);
  });

  it("rechaza rol inválido", () => {
    expect(() =>
      validateUserPayload({ nombre: "A", email: "a@a.com", role: "x" })
    ).toThrow("role inválido");
  });

  it("rechaza id faltante", () => {
    expect(() => validateId("")).toThrow("ID no proporcionado");
  });
});
