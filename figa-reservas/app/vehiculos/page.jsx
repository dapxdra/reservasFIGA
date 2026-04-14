"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebase.jsx";
import { ROLES } from "../lib/roles.js";
import ProtectedRoute from "../components/common/ProtectedRoute.jsx";
import LogoNav from "../components/common/LogoNav.jsx";
import DashboardIcon from "../components/common/DashboardIcon.jsx";
import "../styles/dashboard.css";
import toast from "react-hot-toast";

const EMPTY_FORM = { placa: "", modelo: "", tipo: "", capacidad: 0, activo: true };

async function authFetch(url, options = {}) {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
}

export default function VehiculosPage() {
  return (
    <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OPERADOR]}>
      <VehiculosContent />
    </ProtectedRoute>
  );
}

function VehiculosContent() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => String(a.placa || "").localeCompare(String(b.placa || ""))),
    [rows]
  );

  const activeRows = useMemo(() => rows.filter((row) => row.activo !== false).length, [rows]);
  const totalCapacity = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.capacidad) || 0), 0),
    [rows]
  );

  const loadRows = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/vehiculos");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "No se pudo cargar vehículos");
      setRows(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  const openCreate = () => {
    setEditId("");
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditId(row.id);
    setForm({
      placa: row.placa || "",
      modelo: row.modelo || "",
      tipo: row.tipo || "",
      capacidad: row.capacidad || 0,
      activo: row.activo !== false,
    });
    setOpen(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!editId) {
        const res = await authFetch("/api/vehiculos", {
          method: "POST",
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || "Error creando vehículo");
      } else {
        const res = await authFetch(`/api/vehiculos/${editId}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || "Error actualizando vehículo");
      }
      toast.success("Vehículo guardado");
      setOpen(false);
      loadRows();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const toggleActivo = async (row) => {
    try {
      const res = await authFetch(`/api/vehiculos/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ activo: row.activo === false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Error cambiando estado");
      toast.success(row.activo === false ? "Vehículo activado" : "Vehículo desactivado");
      loadRows();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="dashboard-shell">
      <LogoNav />
      <main className="dashboard-main">
        <header className="page-header">
          <div className="page-title-row">
            <div>
              <h1 className="page-title">Vehículos</h1>
              <p className="page-title-sub">La flota queda alineada con el mismo patrón visual del dashboard y lista para alimentar reservas nuevas y editadas.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/opciones")}
                className="btn-outline"
                type="button"
              >
                <DashboardIcon name="undo" size={16} />
                Volver a opciones
              </button>
              <button onClick={openCreate} className="primary-btn" type="button">
                <DashboardIcon name="plus" size={16} />
                Nuevo vehículo
              </button>
            </div>
          </div>
        </header>

        <section className="summary-grid" aria-label="Resumen de vehículos">
          <article className="summary-card">
            <span className="summary-card-icon">
              <DashboardIcon name="car" size={18} />
            </span>
            <div className="summary-card-content">
              <p className="summary-card-label">Total</p>
              <p className="summary-card-value">{rows.length}</p>
              <p className="summary-card-note">Vehículos registrados</p>
            </div>
          </article>
          <article className="summary-card">
            <span className="summary-card-icon">
              <DashboardIcon name="check" size={18} />
            </span>
            <div className="summary-card-content">
              <p className="summary-card-label">Activos</p>
              <p className="summary-card-value">{activeRows}</p>
              <p className="summary-card-note">Listos para asignación</p>
            </div>
          </article>
          <article className="summary-card">
            <span className="summary-card-icon">
              <DashboardIcon name="users" size={18} />
            </span>
            <div className="summary-card-content">
              <p className="summary-card-label">Capacidad</p>
              <p className="summary-card-value">{totalCapacity}</p>
              <p className="summary-card-note">Suma de plazas registradas</p>
            </div>
          </article>
        </section>

        <section className="table-card">
          <div className="table-responsive">
            <table className="dashboard-table desktop-only">
              <thead>
                <tr>
                  <th>Placa</th>
                  <th>Modelo</th>
                  <th>Tipo</th>
                  <th>Capacidad</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="empty-state-cell">Cargando vehículos...</td>
                  </tr>
                ) : sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-state-cell">No hay vehículos registrados.</td>
                  </tr>
                ) : (
                  sortedRows.map((v) => (
                    <tr key={v.id}>
                      <td className="font-mono">{v.placa || "-"}</td>
                      <td>{v.modelo || "-"}</td>
                      <td>{v.tipo || "-"}</td>
                      <td>{v.capacidad || "-"}</td>
                      <td>
                        <span className={`dashboard-badge ${v.activo === false ? "dashboard-badge-warning" : "dashboard-badge-success"}`}>
                          {v.activo === false ? "Inactivo" : "Activo"}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="row-actions">
                          <button onClick={() => openEdit(v)} className="row-action-btn" title="Editar vehículo" aria-label="Editar vehículo" type="button">
                            <DashboardIcon name="pencil" size={15} />
                          </button>
                          <button
                            onClick={() => toggleActivo(v)}
                            className={`row-action-btn ${v.activo === false ? "row-action-active" : "row-action-danger"}`}
                            title={v.activo === false ? "Activar vehículo" : "Desactivar vehículo"}
                            aria-label={v.activo === false ? "Activar vehículo" : "Desactivar vehículo"}
                            type="button"
                          >
                            <DashboardIcon name="power" size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="management-list mobile-only">
            {loading ? (
              <article className="management-card">
                <p className="empty-card">Cargando vehículos...</p>
              </article>
            ) : sortedRows.length === 0 ? (
              <article className="management-card">
                <p className="empty-card">No hay vehículos registrados.</p>
              </article>
            ) : (
              sortedRows.map((v) => (
                <article key={v.id} className="management-card">
                  <div className="management-card-header">
                    <div>
                      <h3 className="management-card-title">{v.placa || "Sin placa"}</h3>
                      <p className="management-card-subtitle">{v.modelo || "Modelo no indicado"}</p>
                    </div>
                    <span className={`dashboard-badge ${v.activo === false ? "dashboard-badge-warning" : "dashboard-badge-success"}`}>
                      {v.activo === false ? "Inactivo" : "Activo"}
                    </span>
                  </div>
                  <div className="management-card-meta">
                    <div className="management-meta-item">
                      <span className="management-meta-label">Tipo</span>
                      <span className="management-meta-value">{v.tipo || "-"}</span>
                    </div>
                    <div className="management-meta-item">
                      <span className="management-meta-label">Capacidad</span>
                      <span className="management-meta-value">{v.capacidad || "-"}</span>
                    </div>
                  </div>
                  <div className="management-card-footer">
                    <span className="dashboard-badge dashboard-badge-outline">Flota operativa</span>
                    <div className="row-actions">
                      <button onClick={() => openEdit(v)} className="row-action-btn" title="Editar vehículo" aria-label="Editar vehículo" type="button">
                        <DashboardIcon name="pencil" size={15} />
                      </button>
                      <button
                        onClick={() => toggleActivo(v)}
                        className={`row-action-btn ${v.activo === false ? "row-action-active" : "row-action-danger"}`}
                        title={v.activo === false ? "Activar vehículo" : "Desactivar vehículo"}
                        aria-label={v.activo === false ? "Activar vehículo" : "Desactivar vehículo"}
                        type="button"
                      >
                        <DashboardIcon name="power" size={15} />
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>

      {open && (
        <div className="management-modal-backdrop" onClick={() => setOpen(false)}>
          <div className="management-modal" onClick={(e) => e.stopPropagation()}>
            <div className="management-modal-header">
              <h2 className="management-modal-title">{editId ? "Editar vehículo" : "Nuevo vehículo"}</h2>
              <p className="management-modal-subtitle">Mantén actualizada la flota disponible para que el selector de reservas siempre tenga datos útiles.</p>
            </div>
            <form onSubmit={onSubmit} className="management-form-grid">
              <div className="management-field">
                <label>Placa</label>
                <input value={form.placa} onChange={(e) => setForm((p) => ({ ...p, placa: e.target.value }))} required />
              </div>
              <div className="management-field">
                <label>Modelo</label>
                <input value={form.modelo} onChange={(e) => setForm((p) => ({ ...p, modelo: e.target.value }))} />
              </div>
              <div className="management-field">
                <label>Tipo</label>
                <input value={form.tipo} onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))} />
              </div>
              <div className="management-field">
                <label>Capacidad</label>
                <input type="number" min="0" value={form.capacidad} onChange={(e) => setForm((p) => ({ ...p, capacidad: Number(e.target.value) || 0 }))} />
              </div>
              <div className="management-form-actions">
                <button type="button" onClick={() => setOpen(false)} className="btn-outline">Cancelar</button>
                <button type="submit" className="primary-btn">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
