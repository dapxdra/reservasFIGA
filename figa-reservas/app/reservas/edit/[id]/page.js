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
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="date"
        name="fecha"
        placeholder="Fecha"
        value={reserva.fecha || ""}
        onChange={(e) => setReserva({ ...reserva, fecha: e.target.value })}
        className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
      />
      <input
        type="time"
        name="hora"
        placeholder="Hora"
        value={reserva.hora || ""}
        onChange={(e) => setReserva({ ...reserva, hora: e.target.value })}
        className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
      />
      <input
        type="text"
        name="proveedor"
        placeholder="Proveedor"
        value={reserva.proveedor || ""}
        onChange={(e) => setReserva({ ...reserva, proveedor: e.target.value })}
        className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
      />
      <input
        type="number"
        name="itinId"
        placeholder="ItinId"
        value={reserva.itinId || ""}
        onChange={(e) => setReserva({ ...reserva, itinId: e.target.value })}
        className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
      />
      <input
        type="text"
        name="cliente"
        placeholder="Cliente"
        value={reserva.cliente || ""}
        onChange={(e) => setReserva({ ...reserva, cliente: e.target.value })}
        className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
      />
      <input
        type="text"
        name="pickUp"
        placeholder="PickUp"
        value={reserva.pickUp || ""}
        onChange={(e) => setReserva({ ...reserva, pickUp: e.target.value })}
        className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
      />
      <input
        type="text"
        name="dropOff"
        placeholder="DropOff"
        value={reserva.dropOff || ""}
        onChange={(e) => setReserva({ ...reserva, dropOff: e.target.value })}
        className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
      />
      <input
        type="number"
        name="adultos"
        placeholder="Adultos"
        value={reserva.AD || ""}
        onChange={(e) => setReserva({ ...reserva, AD: e.target.value })}
        className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
      />
      <input
        type="number"
        name="niños"
        placeholder="Niños"
        value={reserva.NI || ""}
        onChange={(e) => setReserva({ ...reserva, NI: e.target.value })}
        className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
      />
      <input
        type="number"
        name="precio"
        placeholder="Precio"
        value={reserva.precio || ""}
        onChange={(e) => setReserva({ ...reserva, precio: e.target.value })}
        className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
      />
      <input
        type="checkbox"
        name="pago"
        placeholder="Pago"
        value={reserva.pago || ""}
        onChange={(e) => setReserva({ ...reserva, pago: e.target.value })}
        className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      />
      <input
        type="date"
        name="fechaPago"
        placeholder="FechaPago"
        value={reserva.fechaPago || ""}
        onChange={(e) => setReserva({ ...reserva, fechaPago: e.target.value })}
        className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
      />
      <input
        type="text"
        name="nota"
        placeholder="Nota"
        value={reserva.nota || ""}
        onChange={(e) => setReserva({ ...reserva, nota: e.target.value })}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition duration-300"
      />
      <button type="submit">Actualizar</button>
    </form>
  );
}
