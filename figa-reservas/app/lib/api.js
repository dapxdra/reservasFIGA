import { authenticatedJson } from "@/app/core/client/http/authenticatedFetch.js";

// obtener todas las reservas con filtros
export async function getReservas(params) {
  const query = new URLSearchParams(params).toString();
  return authenticatedJson(`/api/reservas?${query}`);
}

// Cancelar una reserva
export async function cancelarReserva(id) {
  return authenticatedJson(`/api/reservas/${id}`, {
    method: "DELETE",
  });
}

// Crear una reserva
export async function crearReserva(data) {
  return authenticatedJson(`/api/reservas`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Actualizar una reserva
export async function actualizarReserva(id, data) {
  return authenticatedJson(`/api/reservas/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// Obtener una reserva por ID
export async function getReservaPorId(id) {
  return authenticatedJson(`/api/reservas/${id}`);
}

// Auto-asignar conductores y vehículos fijos (dryRun=true solo devuelve propuestas)
export async function autoAsignarReservas({ dryRun = true, dias = 2 } = {}) {
  return authenticatedJson(`/api/asignacion/auto`, {
    method: "POST",
    body: JSON.stringify({ dryRun, dias }),
  });
}

// El conductor asignado confirma la reserva o avanza el estado del servicio
export async function actualizarEstadoServicio(id, estado) {
  return authenticatedJson(`/api/reservas/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ estado }),
  });
}
