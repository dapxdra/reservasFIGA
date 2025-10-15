"use client";

import { Suspense, lazy, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { auth } from "../../../lib/firebase.jsx";
import "../../../styles/dashboard.css";
import { getReservaPorId } from "@/app/lib/api.js";

const EditReservaForm = lazy(() =>
  import("../../components/common/editReservaForm")
);

export default function EditReserva() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [reserva, setReserva] = useState(null);
  /* const [reserva, setReserva] = useState({
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
    chofer: "",
    buseta: "",
    fechaPago: "",
    nota: "",
    chofer: "",
    buseta: "",
  }); */
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) router.push("/login");
      else setUser(user);
    });

    if (params?.id) {
      getReservaPorId(params.id)
        .then((data) => setReserva(data))
        .catch((err) => setError(err.message));
    } else {
      setError("ID no encontrado en los parámetros");
    }

    return () => unsubscribe();
  }, [params.id]);

  if (error) return <div>Error: {error}</div>;
  if (!reserva) return <div>Cargando reserva...</div>;

  return (
    <Suspense fallback={<div>Cargando formulario...</div>}>
      <EditReservaForm reservaInicial={reserva} />
    </Suspense>
  );
}
