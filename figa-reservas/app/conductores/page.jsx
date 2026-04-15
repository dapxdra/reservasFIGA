"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ROLES } from "../lib/roles.js";
import ProtectedRoute from "../components/common/ProtectedRoute.jsx";
import LogoNav from "../components/common/LogoNav.jsx";
import DashboardIcon from "../components/common/DashboardIcon.jsx";
import { authenticatedFetch } from "@/app/core/client/http/authenticatedFetch.js";
import "../styles/dashboard.css";
import toast from "react-hot-toast";

const EMPTY_FORM = { nombre: "", telefono: "", email: "", cedula: "", uid: "", activo: true };

export default function ConductoresPage() {
  return (
    <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OPERADOR]}>
      <ConductoresContent />
    </ProtectedRoute>
  );
}

function ConductoresContent() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [uidLookupLoading, setUidLookupLoading] = useState(false);
  const [uidLookupFound, setUidLookupFound] = useState(false);
  const uidLookupToken = useRef(0);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""))),
    [rows]
  );

  const activeRows = useMemo(() => rows.filter((row) => row.activo !== false).length, [rows]);
  const linkedRows = useMemo(() => rows.filter((row) => Boolean(row.uid)).length, [rows]);

  const loadRows = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch("/api/conductores");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "No se pudo cargar conductores");
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
    setUidLookupFound(false);
    setUidLookupLoading(false);
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditId(row.id);
    setForm({
      nombre: row.nombre || "",
      telefono: row.telefono || "",
      email: row.email || "",
      cedula: row.cedula || "",
      uid: row.uid || "",
      activo: row.activo !== false,
    });
    setUidLookupFound(Boolean(row.uid));
    setUidLookupLoading(false);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;

    const email = String(form.email || "").trim().toLowerCase();
    if (!email) {
      setUidLookupLoading(false);
      setUidLookupFound(false);
      setForm((prev) => (prev.uid ? { ...prev, uid: "" } : prev));
      return;
    }

    const timeoutId = setTimeout(async () => {
      const lookupId = uidLookupToken.current + 1;
      uidLookupToken.current = lookupId;

      setUidLookupLoading(true);
      try {
        const res = await authenticatedFetch(`/api/conductores/uid?email=${encodeURIComponent(email)}`);
        const data = await res.json();

        if (uidLookupToken.current !== lookupId) return;

        if (!res.ok) {
          throw new Error(data.message || "No se pudo consultar UID");
        }

        const resolvedUid = String(data.uid || "").trim();
        setUidLookupFound(Boolean(resolvedUid));
        setForm((prev) => {
          if (prev.uid === resolvedUid) return prev;
          return { ...prev, uid: resolvedUid };
        });
      } catch (error) {
        if (uidLookupToken.current !== lookupId) return;
        setUidLookupFound(false);
        setForm((prev) => (prev.uid ? { ...prev, uid: "" } : prev));
      } finally {
        if (uidLookupToken.current === lookupId) {
          setUidLookupLoading(false);
        }
      }
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [form.email, open]);

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!editId) {
        const res = await authenticatedFetch("/api/conductores", {
          method: "POST",
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || "Error creando conductor");
      } else {
        const res = await authenticatedFetch(`/api/conductores/${editId}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || "Error actualizando conductor");
      }
      toast.success("Conductor guardado");
      setOpen(false);
      loadRows();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const toggleActivo = async (row) => {
    try {
      const res = await authenticatedFetch(`/api/conductores/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ activo: row.activo === false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Error cambiando estado");
      toast.success(row.activo === false ? "Conductor activado" : "Conductor desactivado");
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
              <h1 className="page-title">Conductores</h1>
              <p className="page-title-sub">Este catálogo alimenta los dropdowns de reservas y la operación diaria, así que queda alineado con el dashboard.</p>
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
                Nuevo conductor
              </button>
            </div>
          </div>
        </header>

        <section className="summary-grid" aria-label="Resumen de conductores">
          <article className="summary-card">
            <span className="summary-card-icon">
              <DashboardIcon name="users" size={18} />
            </span>
            <div className="summary-card-content">
              <p className="summary-card-label">Total</p>
              <p className="summary-card-value">{rows.length}</p>
              <p className="summary-card-note">Conductores registrados</p>
            </div>
          </article>
          <article className="summary-card">
            <span className="summary-card-icon">
              <DashboardIcon name="check" size={18} />
            </span>
            <div className="summary-card-content">
              <p className="summary-card-label">Activos</p>
              <p className="summary-card-value">{activeRows}</p>
              <p className="summary-card-note">Disponibles para asignación</p>
            </div>
          </article>
          <article className="summary-card">
            <span className="summary-card-icon">
              <DashboardIcon name="circleDot" size={18} />
            </span>
            <div className="summary-card-content">
              <p className="summary-card-label">Con UID</p>
              <p className="summary-card-value">{linkedRows}</p>
              <p className="summary-card-note">Asociados a una cuenta</p>
            </div>
          </article>
        </section>

        <section className="table-card">
          <div className="table-responsive">
            <table className="dashboard-table desktop-only">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Email</th>
                  <th>Cédula</th>
                  <th>UID</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="empty-state-cell">Cargando conductores...</td>
                  </tr>
                ) : sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-state-cell">No hay conductores registrados.</td>
                  </tr>
                ) : (
                  sortedRows.map((c) => (
                    <tr key={c.id}>
                      <td>{c.nombre || "-"}</td>
                      <td>{c.telefono || "-"}</td>
                      <td>{c.email || "-"}</td>
                      <td>{c.cedula || "-"}</td>
                      <td className="font-mono text-xs">{c.uid || "-"}</td>
                      <td>
                        <span className={`dashboard-badge ${c.activo === false ? "dashboard-badge-warning" : "dashboard-badge-success"}`}>
                          {c.activo === false ? "Inactivo" : "Activo"}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="row-actions">
                          <button onClick={() => openEdit(c)} className="row-action-btn" title="Editar conductor" aria-label="Editar conductor" type="button">
                            <DashboardIcon name="pencil" size={15} />
                          </button>
                          <button
                            onClick={() => toggleActivo(c)}
                            className={`row-action-btn ${c.activo === false ? "row-action-active" : "row-action-danger"}`}
                            title={c.activo === false ? "Activar conductor" : "Desactivar conductor"}
                            aria-label={c.activo === false ? "Activar conductor" : "Desactivar conductor"}
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
                <p className="empty-card">Cargando conductores...</p>
              </article>
            ) : sortedRows.length === 0 ? (
              <article className="management-card">
                <p className="empty-card">No hay conductores registrados.</p>
              </article>
            ) : (
              sortedRows.map((c) => (
                <article key={c.id} className="management-card">
                  <div className="management-card-header">
                    <div>
                      <h3 className="management-card-title">{c.nombre || "Sin nombre"}</h3>
                      <p className="management-card-subtitle">{c.email || "Sin correo"}</p>
                    </div>
                    <span className={`dashboard-badge ${c.activo === false ? "dashboard-badge-warning" : "dashboard-badge-success"}`}>
                      {c.activo === false ? "Inactivo" : "Activo"}
                    </span>
                  </div>
                  <div className="management-card-meta">
                    <div className="management-meta-item">
                      <span className="management-meta-label">Teléfono</span>
                      <span className="management-meta-value">{c.telefono || "-"}</span>
                    </div>
                    <div className="management-meta-item">
                      <span className="management-meta-label">Cédula</span>
                      <span className="management-meta-value">{c.cedula || "-"}</span>
                    </div>
                    <div className="management-meta-item">
                      <span className="management-meta-label">UID</span>
                      <span className="management-meta-value">{c.uid || "-"}</span>
                    </div>
                  </div>
                  <div className="management-card-footer">
                    <span className="dashboard-badge dashboard-badge-outline">Disponible para reservas</span>
                    <div className="row-actions">
                      <button onClick={() => openEdit(c)} className="row-action-btn" title="Editar conductor" aria-label="Editar conductor" type="button">
                        <DashboardIcon name="pencil" size={15} />
                      </button>
                      <button
                        onClick={() => toggleActivo(c)}
                        className={`row-action-btn ${c.activo === false ? "row-action-active" : "row-action-danger"}`}
                        title={c.activo === false ? "Activar conductor" : "Desactivar conductor"}
                        aria-label={c.activo === false ? "Activar conductor" : "Desactivar conductor"}
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
              <h2 className="management-modal-title">{editId ? "Editar conductor" : "Nuevo conductor"}</h2>
              <p className="management-modal-subtitle">Completa la ficha operativa para que aparezca disponible en la asignación de reservas.</p>
            </div>
            <form onSubmit={onSubmit} className="management-form-grid">
              <div className="management-field">
                <label>Nombre</label>
                <input value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} required />
              </div>
              <div className="management-field">
                <label>Teléfono</label>
                <input value={form.telefono} onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))} />
              </div>
              <div className="management-field">
                <label>Email</label>
                <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} type="email" />
              </div>
              <div className="management-field">
                <label>Cédula</label>
                <input value={form.cedula} onChange={(e) => setForm((p) => ({ ...p, cedula: e.target.value }))} />
              </div>
              <div className="management-field management-field-full">
                <label>UID (autocompletado por email)</label>
                <input value={form.uid} readOnly placeholder="Se completa automaticamente con el email" />
                <p className="management-modal-subtitle">
                  {uidLookupLoading
                    ? "Buscando UID en usuarios..."
                    : uidLookupFound
                      ? "UID encontrado y vinculado."
                      : "Sin UID asociado para este email."}
                </p>
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
