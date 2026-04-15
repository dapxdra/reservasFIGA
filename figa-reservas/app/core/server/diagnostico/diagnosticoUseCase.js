import { db } from "@/app/lib/firebaseadmin.jsx";
import { hasRole } from "@/app/lib/serverAuth.js";
import { ROLES } from "@/app/lib/roles.js";

export async function buildDiagnosticoUseCase({ profile, uid }) {
  const diagnostico = {
    timestamp: new Date().toISOString(),
    auth: {
      authenticated: true,
      uid,
      email: profile?.email,
      role: profile?.role,
      activo: profile?.activo,
    },
    permissions: {},
    collections: {},
    errors: [],
  };

  const isAdmin = hasRole(profile, [ROLES.ADMIN]);
  const isOperador = hasRole(profile, [ROLES.OPERADOR]);
  const isConductor = hasRole(profile, [ROLES.CONDUCTOR]);

  diagnostico.permissions = {
    isAdmin,
    isOperador,
    isConductor,
    canViewCatalogos: isAdmin || isOperador,
  };

  if (isAdmin || isOperador) {
    try {
      diagnostico.collections.conductores = {
        exists: true,
        count: await db
          .collection("conductores")
          .count()
          .get()
          .then((snap) => snap.data().count),
      };
    } catch (error) {
      diagnostico.collections.conductores = {
        exists: false,
        error: error.message,
      };
      diagnostico.errors.push(`Error accediendo conductores: ${error.message}`);
    }

    try {
      diagnostico.collections.vehiculos = {
        exists: true,
        count: await db
          .collection("vehiculos")
          .count()
          .get()
          .then((snap) => snap.data().count),
      };
    } catch (error) {
      diagnostico.collections.vehiculos = {
        exists: false,
        error: error.message,
      };
      diagnostico.errors.push(`Error accediendo vehículos: ${error.message}`);
    }
  }

  return diagnostico;
}
