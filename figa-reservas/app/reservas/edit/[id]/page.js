"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function EditReserva() {
  const { id } = useParams();
  const router = useRouter();
  const [reserva, setReserva] = useState({});

  useEffect(() => {
    const fetchReserva = async () => {
      const response = await fetch(`/api/reservas/${id}`);
      const data = await response.json();
      setReserva(data);
    };
    fetchReserva();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    await fetch(`/api/reservas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reserva),
    });

    router.push("/dashboard");
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="date"
        name="fecha"
        value={reserva.fecha || ""}
        onChange={(e) => setReserva({ ...reserva, fecha: e.target.value })}
      />
      <input
        type="time"
        name="hora"
        value={reserva.hora || ""}
        onChange={(e) => setReserva({ ...reserva, hora: e.target.value })}
      />
      <input
        type="text"
        name="proveedor"
        value={reserva.proveedor || ""}
        onChange={(e) => setReserva({ ...reserva, proveedor: e.target.value })}
      />
      <input
        type="number"
        name="itinId"
        value={reserva.itinId || ""}
        onChange={(e) => setReserva({ ...reserva, itinId: e.target.value })}
      />
      <input
        type="text"
        name="cliente"
        value={reserva.cliente || ""}
        onChange={(e) => setReserva({ ...reserva, cliente: e.target.value })}
      />
      <input
        type="text"
        name="pickUp"
        value={reserva.pickUp || ""}
        onChange={(e) => setReserva({ ...reserva, pickUp: e.target.value })}
      />
      <input
        type="text"
        name="dropOff"
        value={reserva.dropOff || ""}
        onChange={(e) => setReserva({ ...reserva, dropOff: e.target.value })}
      />
      <input
        type="number"
        name="adultos"
        value={reserva.AD || ""}
        onChange={(e) => setReserva({ ...reserva, AD: e.target.value })}
      />
      <input
        type="number"
        name="niños"
        value={reserva.NI || ""}
        onChange={(e) => setReserva({ ...reserva, NI: e.target.value })}
      />
      <input
        type="number"
        value={reserva.precio || ""}
        onChange={(e) => setReserva({ ...reserva, precio: e.target.value })}
      />
      <input
        type="text"
        value={reserva.nota || ""}
        onChange={(e) => setReserva({ ...reserva, nota: e.target.value })}
      />
      <button type="submit">Actualizar</button>
    </form>
  );
}
