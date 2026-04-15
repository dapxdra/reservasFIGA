"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "../components/common/ProtectedRoute.jsx";
import LogoNav from "../components/common/LogoNav.jsx";
import DashboardIcon from "../components/common/DashboardIcon.jsx";
import { useUser } from "../context/UserContext.js";
import { ROLES } from "../lib/roles.js";
import { authenticatedJson } from "@/app/core/client/http/authenticatedFetch.js";
import "../styles/dashboard.css";
import toast from "react-hot-toast";

function OptionCard({ title, description, icon, onClick }) {
  return (
    <article className="module-card" onClick={onClick} role="button" title={title}>
      <div className="module-card-icon">
        <DashboardIcon name={icon} size={18} />
      </div>
      <div className="module-card-content">
        <p className="module-card-label">Opción</p>
        <p className="module-card-value" style={{ fontSize: "20px" }}>{title}</p>
        <p className="page-title-sub" style={{ marginTop: "4px", fontSize: "12px" }}>{description}</p>
      </div>
      <DashboardIcon name="arrowRightCircle" size={16} className="module-card-arrow" />
    </article>
  );
}

export default function OpcionesPage() {
  return (
    <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OPERADOR]}>
      <OpcionesContent />
    </ProtectedRoute>
  );
}

function OpcionesContent() {
  const router = useRouter();
  const { role } = useUser();
  const [runningReminders, setRunningReminders] = useState(false);

  const isAdmin = role === ROLES.ADMIN;

  const runReminders24h = async () => {
    if (runningReminders) return;

    setRunningReminders(true);
    try {
      const data = await authenticatedJson("/api/notifications/reservas-24h", {
        method: "POST",
        body: JSON.stringify({ ignoreWindow: true }),
      });

      if ((data.sent || 0) === 0) {
        const emailCfg = data?.channels?.emailEnabled ? "ok" : "faltante";
        const waCfg = data?.channels?.whatsappEnabled ? "ok" : "faltante";
        const emailMissing = Array.isArray(data?.channels?.emailMissing)
          ? data.channels.emailMissing.join(", ")
          : "";
        const waMissing = Array.isArray(data?.channels?.whatsappMissing)
          ? data.channels.whatsappMissing.join(", ")
          : "";
        const reason = data?.skippedReasons || {};
        const configHint =
          !data?.channels?.emailEnabled && !data?.channels?.whatsappEnabled
            ? ` Variables faltantes -> email: ${emailMissing || "ninguna"}; WhatsApp: ${waMissing || "ninguna"}.`
            : "";
        toast.error(
          `No se enviaron recordatorios. Config email: ${emailCfg}, WhatsApp: ${waCfg}, sin contacto: ${reason.missingContact || 0}, fuera de ventana 24h: ${reason.outOfWindow || 0}.${configHint}`
        );
        return;
      }

      toast.success(
        `Recordatorios ejecutados. Enviados: ${data.sent || 0} (email: ${data.sentEmail || 0}, WhatsApp: ${data.sentWhatsApp || 0})`
      );
    } catch (error) {
      toast.error(error.message || "Error ejecutando recordatorios 24h");
    } finally {
      setRunningReminders(false);
    }
  };

  return (
    <div className="dashboard-shell">
      <LogoNav />
      <main className="dashboard-main">
        <header className="page-header">
          <div className="page-title-row">
            <div>
              <h1 className="page-title">Opciones</h1>
              <p className="page-title-sub">Accesos de gestión fuera del dashboard operativo.</p>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin ? (
                <button
                  onClick={runReminders24h}
                  className="btn-outline"
                  type="button"
                  disabled={runningReminders}
                >
                  {runningReminders ? "Ejecutando..." : "Enviar recordatorios ahora"}
                </button>
              ) : null}
              <button
                onClick={() => router.push("/dashboard")}
                className="btn-outline"
                type="button"
              >
                Volver al dashboard
              </button>
            </div>
          </div>
        </header>

        <section className="module-hub" aria-label="Opciones disponibles">
          <OptionCard
            title="Nueva Reserva"
            description="Crear una reserva nueva"
            icon="plus"
            onClick={() => router.push("/reservas")}
          />
          <OptionCard
            title="Conductores"
            description="Gestionar catálogo de conductores"
            icon="users"
            onClick={() => router.push("/conductores")}
          />
          <OptionCard
            title="Vehículos"
            description="Gestionar catálogo de vehículos"
            icon="car"
            onClick={() => router.push("/vehiculos")}
          />
          {isAdmin ? (
            <OptionCard
              title="Usuarios"
              description="Administrar usuarios y roles"
              icon="circleDot"
              onClick={() => router.push("/users")}
            />
          ) : null}
          {isAdmin ? (
            <OptionCard
              title="Reportes"
              description="Ver indicadores y exportes"
              icon="fileText"
              onClick={() => router.push("/reportes")}
            />
          ) : null}
        </section>
      </main>
    </div>
  );
}
