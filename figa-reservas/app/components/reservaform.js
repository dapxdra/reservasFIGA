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
    <form onSubmit={handleSubmit} className="p-4 border rounded shadow-lg">
      <div className="grid grid-cols-2 gap-4">
        <input
          type="number"
          name="itinId"
          placeholder="Itinerario ID"
          onChange={handleChange}
        />
        <input
          type="text"
          name="cliente"
          placeholder="Cliente"
          onChange={handleChange}
          required
        />
        <input type="date" name="fecha" onChange={handleChange} required />
        <input type="time" name="hora" onChange={handleChange} required />
        <input
          type="text"
          name="dropOff"
          placeholder="Drop Off"
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="pickUp"
          placeholder="Pick Up"
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="proveedor"
          placeholder="Proveedor"
          onChange={handleChange}
        />
        <input
          type="number"
          name="precio"
          placeholder="Precio"
          onChange={handleChange}
        />
        <input
          type="number"
          name="AD"
          placeholder="Adultos"
          onChange={handleChange}
        />
        <input
          type="number"
          name="NI"
          placeholder="Niños"
          onChange={handleChange}
        />
        <textarea name="nota" placeholder="Nota" onChange={handleChange} />
      </div>
      <button type="submit" className="mt-4 bg-blue-500 text-white p-2 rounded">
        Guardar
      </button>
    </form>
  );
}
