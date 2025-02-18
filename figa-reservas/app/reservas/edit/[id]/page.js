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
        onChange={(e) => setReserva({ ...reserva, cliente: e.target.value })}
      />
      <input
        type="text"
        value={reserva.cliente || ""}
        onChange={(e) => setReserva({ ...reserva, cliente: e.target.value })}
      />
      <button type="submit">Actualizar</button>
    </form>
  );
}
