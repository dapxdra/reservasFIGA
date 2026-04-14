"use client";

import { Suspense, lazy, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getReservaPorId } from "@/app/lib/api.js";
import Loading from "../../../components/common/Loading.jsx";
import ProtectedRoute from "../../../components/common/ProtectedRoute.jsx";
import { ROLES } from "../../../lib/roles.js";

const EditReservaForm = lazy(() =>
  import("../../../components/common/editReservaForm.jsx")
);

export default function EditReserva() {
  const params = useParams();
  const [error, setError] = useState("");
  const [reserva, setReserva] = useState(null);

  useEffect(() => {
    if (params?.id) {
      getReservaPorId(params.id)
        .then((data) => setReserva(data))
        .catch((err) => setError(err.message));
    } else {
      setError("ID no encontrado en los parámetros");
    }
  }, [params.id]);

  if (error) return <div>Error: {error}</div>;
  if (!reserva) return <Loading />;

  return (
    <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OPERADOR]}>
      <Suspense fallback={<Loading />}>
        <EditReservaForm reservaInicial={reserva} />
      </Suspense>
    </ProtectedRoute>
  );
}
