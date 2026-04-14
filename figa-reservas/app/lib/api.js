import { auth } from "./firebase.jsx";

async function authHeaders(extra = {}) {
  const token = await auth.currentUser?.getIdToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

// obtener todas las reservas con filtros
export async function getReservas(params) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`/api/reservas?${query}`, {
    headers: await authHeaders(),
  });
  return res.json();
}

// Cancelar una reserva
export async function cancelarReserva(id) {
  const res = await fetch(`/api/reservas/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Error al cancelar la reserva");
  return res.json();
}

// Crear una reserva
export async function crearReserva(data) {
  const res = await fetch(`/api/reservas`, {
    method: "POST",
    headers: await authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  return res.json();
}

// Actualizar una reserva
export async function actualizarReserva(id, data) {
  const res = await fetch(`/api/reservas/${id}`, {
    method: "PUT",
    headers: await authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  return res.json();
}

// Obtener una reserva por ID
export async function getReservaPorId(id) {
  const res = await fetch(`/api/reservas/${id}`, {
    headers: await authHeaders(),
  });
  return res.json();
}
