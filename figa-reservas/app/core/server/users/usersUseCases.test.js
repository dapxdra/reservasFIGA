import { beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  createAuthUser: vi.fn(),
  getAuthUserByEmail: vi.fn(),
  listUsersOrderedByNombre: vi.fn(),
  updateAuthUser: vi.fn(),
  upsertUserDoc: vi.fn(),
}));

vi.mock("@/app/core/server/users/usersRepository.js", () => ({
  createAuthUser: repoMocks.createAuthUser,
  getAuthUserByEmail: repoMocks.getAuthUserByEmail,
  listUsersOrderedByNombre: repoMocks.listUsersOrderedByNombre,
  updateAuthUser: repoMocks.updateAuthUser,
  upsertUserDoc: repoMocks.upsertUserDoc,
}));

import {
  createUserUseCase,
  listUsersUseCase,
  toggleUserStatusUseCase,
} from "./usersUseCases.js";

describe("usersUseCases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listUsersUseCase delega en repositorio", async () => {
    repoMocks.listUsersOrderedByNombre.mockResolvedValue([{ id: "1" }]);
    const result = await listUsersUseCase();
    expect(result).toEqual([{ id: "1" }]);
  });

  it("createUserUseCase crea usuario auth cuando no existe", async () => {
    repoMocks.getAuthUserByEmail.mockResolvedValue(null);
    repoMocks.createAuthUser.mockResolvedValue({ uid: "uid-1" });

    const result = await createUserUseCase({
      nombre: "Ana",
      email: "ana@mail.com",
      role: "admin",
      activo: true,
    });

    expect(repoMocks.createAuthUser).toHaveBeenCalledTimes(1);
    expect(repoMocks.upsertUserDoc).toHaveBeenCalledTimes(1);
    expect(result.id).toBe("uid-1");
    expect(result.created).toBe(true);
  });

  it("toggleUserStatusUseCase actualiza auth y doc", async () => {
    const result = await toggleUserStatusUseCase("uid-2", false);

    expect(result).toBe(false);
    expect(repoMocks.updateAuthUser).toHaveBeenCalledWith("uid-2", {
      disabled: true,
    });
    expect(repoMocks.upsertUserDoc).toHaveBeenCalledTimes(1);
  });
});
