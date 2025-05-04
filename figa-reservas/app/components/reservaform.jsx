"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "../styles/dashboard.css";

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
    pago: false,
    fechaPago: "",
    cancelada: false,
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
      <h1 className="text-2xl font-bold mb-4">Nueva Reserva</h1>
      <form onSubmit={handleSubmit} className="p-4 border rounded space-y-4">
        <div className="grid grid-cols-8 gap-4">
          <div className="col-span-2">
            <label htmlFor="itinId" className="text-sm font-semibold">
              ItinID
              <input
                type="number"
                name="itinId"
                placeholder=""
                onChange={handleChange}
                required
                className="w-full mt-1 p-2 border border-gray-300 rouded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </label>
          </div>
          <div className="col-span-2">
            <label htmlFor="proveedor" className="text-sm font-semibold">
              Proveedor
              <input
                type="text"
                name="proveedor"
                placeholder=""
                onChange={handleChange}
                className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </label>
          </div>
          <div className="col-span-2">
            <label htmlFor="cliente" className="text-sm font-semibold">
              Cliente
              <input
                type="text"
                name="cliente"
                placeholder=""
                onChange={handleChange}
                className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                required
              />
            </label>
          </div>
          <div className="col-span-2">
            <label htmlFor="precio" className="text-sm font-semibold">
              Precio
              <input
                type="number"
                name="precio"
                placeholder=""
                onChange={handleChange}
                className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </label>
          </div>
          <div className="col-span-2">
            <label htmlFor="fecha" className="text-sm font-semibold">
              Fecha
              <input
                type="date"
                name="fecha"
                onChange={handleChange}
                className="datepicker w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                required
              />
            </label>
          </div>
          <div className="col-span-2">
            <label htmlFor="hora" className="text-sm font-semibold">
              Hora
              <input
                type="time"
                name="hora"
                onChange={handleChange}
                className="timepicker w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                required
              />
            </label>
          </div>
          <div className="col-span-2">
            <label htmlFor="pickUp" className="text-sm font-semibold">
              Pick Up
              <input
                type="text"
                name="pickUp"
                placeholder=""
                onChange={handleChange}
                className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                required
              />
            </label>
          </div>
          <div className="col-span-2">
            <label htmlFor="dropOff" className="text-sm font-semibold">
              Drop Off
              <input
                type="text"
                name="dropOff"
                placeholder=""
                onChange={handleChange}
                className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                required
              />
            </label>
          </div>

          <div className="col-span-2">
            <label htmlFor="AD" className="text-sm font-semibold">
              Adultos
              <input
                type="number"
                name="AD"
                placeholder=""
                onChange={handleChange}
                className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </label>
          </div>
          <div className="col-span-2">
            <label htmlFor="NI" className="text-sm font-semibold">
              Niños
              <input
                type="number"
                name="NI"
                placeholder=""
                onChange={handleChange}
                className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </label>
          </div>
          <div className="col-span-1">
            <label htmlFor="pago" className="text-sm font-semibold">
              Pago
              <input
                type="checkbox"
                name="pago"
                title="Pagado"
                placeholder=""
                onChange={handleChange}
                className="w-full mt-1 p-2 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </label>
          </div>
          <div className="col-span-3">
            <label htmlFor="fechaPago" className="text-sm font-semibold">
              Fecha Pago
              <input
                type="date"
                name="fechaPago"
                placeholder=""
                onChange={handleChange}
                className="datepicker w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none text-black"
              />
            </label>
          </div>
          <div className="col-span-8">
            <label htmlFor="nota" className="text-sm font-semibold">
              Nota
              <textarea
                name="nota"
                placeholder=""
                onChange={handleChange}
                className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </label>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <button
            type="submit"
            className="submitbtn w-full py-2 rounded-lg font-semibold transition duration-300 col-span-2"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="atrasbtn w-full  py-2 rounded-lg font-semibold transition duration-300 col-span-2"
          >
            Atrás
          </button>
        </div>
      </form>
    </div>
  );
}
