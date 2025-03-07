"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { auth } from "../../../lib/firebase.js";
import "../../../styles/dashboard.css";

export default function EditReserva() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [reserva, setReserva] = useState({
    itinId: "",
    proveedor: "",
    cliente: "",
    precio: "",
    fecha: "",
    hora: "",
    pickUp: "",
    dropOff: "",
    AD: "",
    NI: "",
    pago: false,
    fechaPago: "",
    nota: "",
  });
  useEffect(() => {
    if (params?.id) {
      fetchReserva(params.id);
    } else {
      console.error("ID no encontrado en los parámetros");
    }
  }, [params]);

  const fetchReserva = async (id) => {
    try {
      const res = await fetch(`/api/reservas/${id}`);
      if (!res.ok) throw new Error("Error al obtener la reserva");
      const data = await res.json();
      setReserva(data);
    } catch (error) {
      setError(error.message);
    }
  };

  /* useEffect(() => {
    if (!id) return; // Asegura que el id existe antes de hacer el fetch

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/login"); // Redirigir si no está autenticado
      } else {
        setUser(user);
      }
    });

    const fetchReserva = async (id) => {
      try {
        const response = await fetch(`/api/reservas/${id}`);
        if (!response.ok) {
          throw new Error(
            `Error al obtener la reserva: ${response.statusText}`
          );
        }
        const data = await response.json();
        console.log("Reserva obtenida:", data);

        setReserva({
          ...data,
          fecha: data.fecha
            ? new Date(data.fecha).toISOString().split("T")[0]
            : "",
          fechaPago: data.fechaPago
            ? new Date(data.fechaPago).toISOString().split("T")[0]
            : "",
        });
      } catch (error) {
        console.error("Error al obtener la reserva:", error.message);
      }
    };

    fetchReserva();
    return () => unsubscribe();
  }, [id]); */

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
    <div className="flex flex-col items-center justify-center min-h-screen text-black bg-white p-4">
      <h1 className="text-2xl font-bold mb-4">Editar Reserva</h1>
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
        <form onSubmit={handleSubmit} className="p-4 border rounded space-y-4">
          <div className="grid grid-cols-8 gap-4">
            <div className="col-span-2">
              <label htmlFor="itinId" className="text-sm font-semibold">
                ItinID
                <input
                  type="number"
                  name="itinId"
                  placeholder="ItinId"
                  value={reserva.itinId || ""}
                  onChange={(e) =>
                    setReserva({ ...reserva, itinId: e.target.value })
                  }
                  className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </label>
            </div>
            <div className="col-span-2">
              <label htmlFor="proveedor" className="text-sm font-semibold">
                Proveedor
                <input
                  type="text"
                  name="proveedor"
                  placeholder="Proveedor"
                  value={reserva.proveedor || ""}
                  onChange={(e) =>
                    setReserva({ ...reserva, proveedor: e.target.value })
                  }
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
                  placeholder="Cliente"
                  value={reserva.cliente || ""}
                  onChange={(e) =>
                    setReserva({ ...reserva, cliente: e.target.value })
                  }
                  className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </label>
            </div>
            <div className="col-span-2">
              <label htmlFor="precio" className="text-sm font-semibold">
                Precio
                <input
                  type="number"
                  name="precio"
                  placeholder="Precio"
                  value={reserva.precio || ""}
                  onChange={(e) =>
                    setReserva({ ...reserva, precio: e.target.value })
                  }
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
                  placeholder="Fecha"
                  value={reserva.fecha || ""}
                  onChange={(e) =>
                    setReserva({ ...reserva, fecha: e.target.value })
                  }
                  className="datepicker w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </label>
            </div>
            <div className="col-span-2">
              <label htmlFor="hora" className="text-sm font-semibold">
                Hora
                <input
                  type="time"
                  name="hora"
                  placeholder="Hora"
                  value={reserva.hora || ""}
                  onChange={(e) =>
                    setReserva({ ...reserva, hora: e.target.value })
                  }
                  className="timepicker w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </label>
            </div>
            <div className="col-span-2">
              <label htmlFor="pickUp" className="text-sm font-semibold">
                PickUp
                <input
                  type="text"
                  name="pickUp"
                  placeholder="PickUp"
                  value={reserva.pickUp || ""}
                  onChange={(e) =>
                    setReserva({ ...reserva, pickUp: e.target.value })
                  }
                  className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </label>
            </div>
            <div className="col-span-2">
              <label htmlFor="dropOff" className="text-sm font-semibold">
                DropOff
                <input
                  type="text"
                  name="dropOff"
                  placeholder="DropOff"
                  value={reserva.dropOff || ""}
                  onChange={(e) =>
                    setReserva({ ...reserva, dropOff: e.target.value })
                  }
                  className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </label>
            </div>
            <div className="col-span-2">
              <label htmlFor="adultos" className="text-sm font-semibold">
                Adultos
                <input
                  type="number"
                  name="adultos"
                  placeholder="Adultos"
                  value={reserva.AD || ""}
                  onChange={(e) =>
                    setReserva({ ...reserva, AD: e.target.value })
                  }
                  className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </label>
            </div>
            <div className="col-span-2">
              <label htmlFor="niños" className="text-sm font-semibold">
                Niños
                <input
                  type="number"
                  name="niños"
                  placeholder="Niños"
                  value={reserva.NI || ""}
                  onChange={(e) =>
                    setReserva({ ...reserva, NI: e.target.value })
                  }
                  className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </label>
            </div>
            <div className="col-span-2">
              <label htmlFor="pago" className="text-sm font-semibold">
                Pago
                <input
                  type="checkbox"
                  title="Pagado"
                  name="pago"
                  placeholder="Pago"
                  checked={reserva.pago || false}
                  onChange={(e) =>
                    setReserva({ ...reserva, pago: e.target.checked })
                  }
                  className="w-full mt-1 p-2 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </label>
            </div>
            <div className="col-span-2">
              <label htmlFor="fechaPago" className="text-sm font-semibold">
                FechaPago
                <input
                  type="date"
                  name="fechaPago"
                  placeholder="FechaPago"
                  value={reserva.fechaPago || ""}
                  onChange={(e) =>
                    setReserva({ ...reserva, fechaPago: e.target.value })
                  }
                  className="datepicker w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </label>
            </div>
            <div className="col-span-8">
              <label htmlFor="nota" className="text-sm font-semibold">
                Nota
                <textarea
                  type="text"
                  name="nota"
                  placeholder="Nota"
                  value={reserva.nota || ""}
                  onChange={(e) =>
                    setReserva({ ...reserva, nota: e.target.value })
                  }
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
              Actualizar
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
    </div>
  );
}
