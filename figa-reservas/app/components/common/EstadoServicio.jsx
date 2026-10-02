"use client";

import DashboardIcon from "./DashboardIcon.jsx";
import {
  ESTADO_SERVICIO_ACCIONES,
  ESTADO_SERVICIO_LABELS,
  estaConfirmadaPorConductor,
  siguienteEstadoServicio,
} from "@/app/core/shared/reservas/estadoServicio.js";

/**
 * Botón del conductor para confirmar la reserva y avanzar el servicio.
 * Muestra solo la siguiente acción; al finalizar queda una etiqueta.
 */
export function EstadoServicioAction({ reserva, onAdvance, busy = false, compact = false }) {
  if (reserva.cancelada) return null;

  const siguiente = siguienteEstadoServicio(reserva.estadoServicio);
  if (!siguiente) {
    return (
      <span className="dashboard-badge estado-servicio-badge estado-servicio-finalizada">
        {ESTADO_SERVICIO_LABELS.finalizada}
      </span>
    );
  }

  const confirmar = siguiente === "confirmada";
  return (
    <button
      type="button"
      className={`estado-servicio-btn ${confirmar ? "is-confirmar" : ""} ${compact ? "is-compact" : ""}`}
      disabled={busy}
      onClick={(event) => {
        event.stopPropagation();
        onAdvance(siguiente);
      }}
      title={
        reserva.estadoServicio
          ? `Estado actual: ${ESTADO_SERVICIO_LABELS[reserva.estadoServicio]}`
          : "Aún no confirmas esta reserva"
      }
    >
      {confirmar ? <DashboardIcon name="check" size={14} /> : null}
      {busy ? "Guardando..." : ESTADO_SERVICIO_ACCIONES[siguiente]}
    </button>
  );
}

/** Marca discreta para admin/operador: el conductor ya confirmó (y en qué va). */
export function EstadoServicioIndicator({ reserva }) {
  if (!estaConfirmadaPorConductor(reserva)) return null;
  const label = ESTADO_SERVICIO_LABELS[reserva.estadoServicio];
  return (
    <span
      className={`estado-servicio-indicator estado-servicio-${reserva.estadoServicio}`}
      title={`Conductor: ${label}`}
      aria-label={`Conductor: ${label}`}
    >
      <DashboardIcon name="userCheck" size={13} />
    </span>
  );
}

export function estadoServicioLabel(reserva) {
  return ESTADO_SERVICIO_LABELS[reserva?.estadoServicio] || "";
}
