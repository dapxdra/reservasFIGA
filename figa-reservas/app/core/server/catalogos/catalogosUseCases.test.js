import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createConductor: vi.fn(),
  updateConductor: vi.fn(),
  getVehiculoById: vi.fn(),
  findUserUidByEmail: vi.fn(),
}));

vi.mock("@/app/lib/firebaseadmin.jsx", () => ({ db: {} }));

vi.mock("@/app/core/server/catalogos/conductoresRepository.js", () => ({
  createConductor: mocks.createConductor,
  updateConductor: mocks.updateConductor,
  listConductores: vi.fn(),
  saveConductorLocation: vi.fn(),
  setConductorActivo: vi.fn(),
}));

vi.mock("@/app/core/server/catalogos/vehiculosRepository.js", () => ({
  getVehiculoById: mocks.getVehiculoById,
  createVehiculo: vi.fn(),
  listVehiculos: vi.fn(),
  setVehiculoActivo: vi.fn(),
  updateVehiculo: vi.fn(),
}));

vi.mock("@/app/core/server/users/usersRepository.js", () => ({
  findUserUidByEmail: mocks.findUserUidByEmail,
}));

import {
  createConductorUseCase,
  updateConductorUseCase,
} from "./catalogosUseCases.js";

describe("conductores con vehículo fijo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUserUidByEmail.mockResolvedValue("");
    mocks.createConductor.mockResolvedValue("new-id");
  });

  it("guarda la placa del vehículo fijo al crear", async () => {
    mocks.getVehiculoById.mockResolvedValue({ id: "v1", placa: "AAA-111", activo: true });

    await createConductorUseCase({ nombre: "Ana", vehiculoId: "v1" });

    expect(mocks.createConductor).toHaveBeenCalledWith(
      expect.objectContaining({ vehiculoId: "v1", vehiculoPlaca: "AAA-111" })
    );
  });

  it("permite cambiar o quitar el vehículo al actualizar", async () => {
    await updateConductorUseCase("c1", { nombre: "Ana", vehiculoId: "" });

    expect(mocks.getVehiculoById).not.toHaveBeenCalled();
    expect(mocks.updateConductor).toHaveBeenCalledWith(
      "c1",
      expect.objectContaining({ vehiculoId: "", vehiculoPlaca: "" })
    );
  });

  it("rechaza vehículos inexistentes o inactivos", async () => {
    mocks.getVehiculoById.mockResolvedValueOnce(null);
    await expect(
      createConductorUseCase({ nombre: "Ana", vehiculoId: "nope" })
    ).rejects.toMatchObject({ status: 400, code: "VehiculoNotFound" });

    mocks.getVehiculoById.mockResolvedValueOnce({ id: "v1", activo: false });
    await expect(
      updateConductorUseCase("c1", { nombre: "Ana", vehiculoId: "v1" })
    ).rejects.toMatchObject({ status: 400, code: "VehiculoInactivo" });

    expect(mocks.createConductor).not.toHaveBeenCalled();
    expect(mocks.updateConductor).not.toHaveBeenCalled();
  });
});
