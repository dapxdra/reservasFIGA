import { getAuthUserContext } from "@/app/lib/serverAuth.js";
import { jsonResponse } from "@/app/core/shared/http/jsonResponse.js";
import { buildDiagnosticoUseCase } from "@/app/core/server/diagnostico/diagnosticoUseCase.js";

export async function GET(req) {
  const diagnosticoBase = {
    timestamp: new Date().toISOString(),
    auth: {},
    permissions: {},
    collections: {},
    errors: [],
  };

  try {
    const { profile, errorResponse, uid } = await getAuthUserContext(req);

    if (errorResponse) {
      return jsonResponse(
        {
          ...diagnosticoBase,
          auth: { authenticated: false, error: "No autenticado o error en token" },
        },
        401
      );
    }

    const diagnostico = await buildDiagnosticoUseCase({ profile, uid });
    return jsonResponse(diagnostico);
  } catch (error) {
    return jsonResponse(
      {
        ...diagnosticoBase,
        errors: [`Error general: ${error.message}`],
      },
      500
    );
  }
}
