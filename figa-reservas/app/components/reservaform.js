"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReservaForm() {
  const [formData, setFormData] = useState({
    cliente: "",
    fecha: "",
    hora: "",
    dropOff: "",
    pickUp: "",
    proveedor: "",
    nota: "",
    precio: 0,
    AD: 0,
    NI: 0,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const response = await fetch("/api/reservas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      alert("Reserva creada con éxito");
      setFormData({
        itinId: 0,
        cliente: "",
        fecha: "",
        hora: "",
        dropOff: "",
        pickUp: "",
        proveedor: "",
        nota: "",
        precio: 0,
        AD: 0,
        NI: 0,
      });
      router.push("/dashboard");
    } else {
      alert("Error al guardar la reserva");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 border rounded shadow-lg space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <input
          type="number"
          name="itinId"
          placeholder="Itinerario ID"
          onChange={handleChange}
          className="w-full mt-1 p-2 border border-gray-300 rouded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
        />
        <input
          type="text"
          name="cliente"
          placeholder="Cliente"
          onChange={handleChange}
          className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
          required
        />
        <input
          type="date"
          name="fecha"
          onChange={handleChange}
          className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
          required
        />
        <input
          type="time"
          name="hora"
          onChange={handleChange}
          className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
          required
        />
        <input
          type="text"
          name="dropOff"
          placeholder="Drop Off"
          onChange={handleChange}
          className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
          required
        />
        <input
          type="text"
          name="pickUp"
          placeholder="Pick Up"
          onChange={handleChange}
          className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
          required
        />
        <input
          type="text"
          name="proveedor"
          placeholder="Proveedor"
          onChange={handleChange}
          className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
        />
        <input
          type="number"
          name="precio"
          placeholder="Precio"
          onChange={handleChange}
          className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
        />
        <input
          type="number"
          name="AD"
          placeholder="Adultos"
          onChange={handleChange}
          className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
        />
        <input
          type="number"
          name="NI"
          placeholder="Niños"
          onChange={handleChange}
          className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
        />
        <input
          type="checkbox"
          name="pago"
          placeholder="Pago"
          onChange={handleChange}
          className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <input
          type="date"
          name="fechaPago"
          placeholder="Fecha Pago"
          onChange={handleChange}
          className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
        />
        <textarea
          name="nota"
          placeholder="Nota"
          onChange={handleChange}
          className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition duration-300"
      >
        Guardar
      </button>
    </form>
  );
}
