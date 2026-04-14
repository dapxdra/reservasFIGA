import { getAuthUserContext, hasRole } from "@/app/lib/serverAuth.js";
import { ROLES } from "@/app/lib/roles.js";
import { db } from "@/app/lib/firebaseadmin.jsx";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(req) {
  const diagnostico = {
    timestamp: new Date().toISOString(),
    auth: {},
    permissions: {},
    collections: {},
    errors: [],
  };

  try {
    // Verificar autenticación
    const { profile, errorResponse, uid } = await getAuthUserContext(req);
    
    if (errorResponse) {
      diagnostico.auth.authenticated = false;
      diagnostico.auth.error = "No autenticado o error en token";
      return json(diagnostico, 401);
    }

    diagnostico.auth = {
      authenticated: true,
      uid,
      email: profile?.email,
      role: profile?.role,
      activo: profile?.activo,
    };

    // Verificar permisos
    const isAdmin = hasRole(profile, [ROLES.ADMIN]);
    const isOperador = hasRole(profile, [ROLES.OPERADOR]);
    const isConductor = hasRole(profile, [ROLES.CONDUCTOR]);

    diagnostico.permissions = {
      isAdmin,
      isOperador,
      isConductor,
      canViewCatalogos: isAdmin || isOperador,
    };

    // Verificar colecciones
    if (isAdmin || isOperador) {
      try {
        const conductoresSnapshot = await db.collection("conductores").limit(1).get();
        diagnostico.collections.conductores = {
          exists: true,
          count: await db.collection("conductores").count().get().then(snap => snap.data().count),
        };
      } catch (error) {
        diagnostico.collections.conductores = {
          exists: false,
          error: error.message,
        };
        diagnostico.errors.push(`Error accediendo conductores: ${error.message}`);
      }

      try {
        const vehiculosSnapshot = await db.collection("vehiculos").limit(1).get();
        diagnostico.collections.vehiculos = {
          exists: true,
          count: await db.collection("vehiculos").count().get().then(snap => snap.data().count),
        };
      } catch (error) {
        diagnostico.collections.vehiculos = {
          exists: false,
          error: error.message,
        };
        diagnostico.errors.push(`Error accediendo vehículos: ${error.message}`);
      }
    }

    return json(diagnostico);
  } catch (error) {
    diagnostico.errors.push(`Error general: ${error.message}`);
    return json(diagnostico, 500);
  }
}
