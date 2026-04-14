"use client";

import ReservaForm from "../components/common/reservaform.jsx";
import ProtectedRoute from "../components/common/ProtectedRoute.jsx";
import { ROLES } from "../lib/roles.js";

export default function ReservasPage() {
  return (
    <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OPERADOR]}>
      <ReservaForm />
    </ProtectedRoute>
  );
}
