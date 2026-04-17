"use client";

import { useUser } from "@/app/context/UserContext.js";
import { useReportConductorLocation } from "@/app/hooks/useReportConductorLocation.js";

/**
 * Componente transparente (no renderiza nada).
 * Se coloca dentro del UserProvider para acceder al rol/uid
 * y disparar el reporte de ubicación automáticamente al autenticarse.
 */
export default function ConductorLocationReporter() {
  const { role, profile } = useUser();
  const uid = profile?.uid || profile?.id || "";

  useReportConductorLocation({ role, uid });

  return null;
}
