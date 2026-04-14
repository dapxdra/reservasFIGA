export const ROLES = {
  ADMIN: "admin",
  OPERADOR: "operador",
  CONDUCTOR: "conductor",
};

export function normalizeRole(role) {
  const value = String(role || "").trim().toLowerCase();

  if (["admin", "administrador", "administrator"].includes(value)) {
    return ROLES.ADMIN;
  }
  if (["operador", "operario", "operator"].includes(value)) {
    return ROLES.OPERADOR;
  }
  if (["conductor", "chofer", "driver"].includes(value)) {
    return ROLES.CONDUCTOR;
  }

  return value;
}

export function getDefaultRouteForRole(role) {
  const normalized = normalizeRole(role);
  if (normalized === ROLES.CONDUCTOR) return "/dashboard";
  if (normalized === ROLES.ADMIN || normalized === ROLES.OPERADOR) return "/dashboard";
  return "/login";
}
