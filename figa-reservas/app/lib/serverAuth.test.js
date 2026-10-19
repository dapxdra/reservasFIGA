import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyIdTokenMock, docGetMock } = vi.hoisted(() => ({
  verifyIdTokenMock: vi.fn(),
  docGetMock: vi.fn(),
}));

vi.mock("firebase-admin", () => ({
  default: {
    apps: [{}],
    auth: () => ({ verifyIdToken: verifyIdTokenMock }),
    firestore: { FieldValue: { serverTimestamp: vi.fn() } },
  },
}));

vi.mock("./firebaseadmin.jsx", () => ({
  db: {
    collection: () => ({
      doc: () => ({ get: docGetMock }),
    }),
  },
}));

import { getAuthUserContext } from "./serverAuth.js";

function buildRequest() {
  return new Request("http://localhost/api/test", {
    headers: { authorization: "Bearer token-123" },
  });
}

function mockProfile(data) {
  docGetMock.mockResolvedValue({ exists: true, id: "uid-1", data: () => data });
}

describe("getAuthUserContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyIdTokenMock.mockResolvedValue({ uid: "uid-1", email: "user@test.com" });
  });

  it("devuelve el perfil con el rol normalizado", async () => {
    mockProfile({ role: "Chofer", nombre: "Randall" });

    const result = await getAuthUserContext(buildRequest());

    expect(result.errorResponse).toBeUndefined();
    expect(result.uid).toBe("uid-1");
    expect(result.profile.role).toBe("conductor");
  });

  it("rechaza con 403 un rol no reconocido", async () => {
    mockProfile({ role: "conductora freelance", nombre: "Randall" });

    const result = await getAuthUserContext(buildRequest());

    expect(result.errorResponse.status).toBe(403);
    await expect(result.errorResponse.json()).resolves.toEqual({
      error: "RoleMissing",
      message: "Tu usuario no tiene un rol válido en la colección users.",
    });
  });
});
