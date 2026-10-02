// Estados del servicio que marca el conductor asignado (compartido cliente/servidor).
// Sin estado (null) = asignada pero aún no confirmada por el conductor.

export const ESTADOS_SERVICIO = ["confirmada", "en_camino", "en_pickup", "a_bordo", "finalizada"];

export const ESTADO_SERVICIO_LABELS = {
  confirmada: "Confirmada",
  en_camino: "En camino",
  en_pickup: "En pickup",
  a_bordo: "Pasajeros a bordo",
  finalizada: "Finalizada",
};

// Texto del botón que lleva a cada estado.
export const ESTADO_SERVICIO_ACCIONES = {
  confirmada: "Confirmar reserva",
  en_camino: "Salir hacia el pickup",
  en_pickup: "Llegué al pickup",
  a_bordo: "Pasajeros a bordo",
  finalizada: "Finalizar servicio",
};

// Estados en los que el servicio ya arrancó (el seguimiento debe estar activo).
export const ESTADOS_EN_CURSO = new Set(["en_camino", "en_pickup", "a_bordo"]);

export function indiceEstado(estado) {
  return ESTADOS_SERVICIO.indexOf(estado);
}

export function esEstadoServicioValido(estado) {
  return indiceEstado(estado) !== -1;
}

/** Siguiente estado o null si ya finalizó. */
export function siguienteEstadoServicio(actual) {
  const i = actual ? indiceEstado(actual) : -1;
  return ESTADOS_SERVICIO[i + 1] || null;
}

/** Solo se avanza (se permite saltar estados si el conductor olvidó marcar alguno). */
export function puedeAvanzarEstado(actual, nuevo) {
  if (!esEstadoServicioValido(nuevo)) return false;
  const i = actual ? indiceEstado(actual) : -1;
  return indiceEstado(nuevo) > i;
}

export function estaConfirmadaPorConductor(reserva) {
  return esEstadoServicioValido(reserva?.estadoServicio);
}
