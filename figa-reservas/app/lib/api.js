// obtener todas las reservas con filtros
export async function getReservas(params) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`/api/reservas?${query}`);
  return res.json();
}

// Cancelar una reserva
export async function cancelarReserva(id) {
  const res = await fetch(`/api/reservas/${id}`, { method: "DELETE" });
  return res.json();
}

// Crear una reserva
export async function crearReserva(data) {
  const res = await fetch(`/api/reservas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

// Actualizar una reserva
export async function actualizarReserva(id, data) {
  const res = await fetch(`/api/reservas/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

// Obtener una reserva por ID
export async function getReservaPorId(id) {
  const res = await fetch(`/api/reservas/${id}`);
  return res.json();
}
