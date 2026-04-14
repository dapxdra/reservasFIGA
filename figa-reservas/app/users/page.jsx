"use client";

import { useEffect, useMemo, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebase.jsx";
import { ROLES } from "../lib/roles.js";
import ProtectedRoute from "../components/common/ProtectedRoute.jsx";
import LogoNav from "../components/common/LogoNav.jsx";
import DashboardIcon from "../components/common/DashboardIcon.jsx";
import "../styles/dashboard.css";
import toast from "react-hot-toast";

const EMPTY_FORM = { nombre: "", email: "", role: ROLES.OPERADOR, activo: true };

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

function getPasswordResetSettings() {
  if (typeof window === "undefined") return undefined;

  return {
    url: `${window.location.origin}/login`,
    handleCodeInApp: false,
  };
}

export default function UsersPage() {
  return (
    <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
      <UsersContent />
    </ProtectedRoute>
  );
}

function UsersContent() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""))),
    [users]
  );

  const activeUsers = useMemo(() => users.filter((user) => user.activo !== false).length, [users]);
  const totalAdmins = useMemo(
    () => users.filter((user) => String(user.role || "").toLowerCase() === ROLES.ADMIN).length,
    [users]
  );

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "No se pudo cargar users");
      setUsers(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openCreate = () => {
    setEditId("");
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (user) => {
    setEditId(user.id);
    setForm({
      nombre: user.nombre || "",
      email: user.email || "",
      role: user.role || ROLES.OPERADOR,
      activo: user.activo !== false,
    });
    setOpen(true);
  };

  const sendResetEmail = async (email) => {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error("El usuario no tiene un correo válido.");
    }

    auth.languageCode = "es";
    await sendPasswordResetEmail(auth, normalizedEmail, getPasswordResetSettings());
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!editId) {
        const res = await authFetch("/api/users", {
          method: "POST",
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || "Error creando usuario");

        try {
          await sendResetEmail(data.email || form.email);
          toast.success("Usuario creado y correo de acceso enviado");
        } catch (error) {
          toast.error(`Usuario creado, pero no se pudo enviar el correo: ${error.message}`);
        }
      } else {
        const res = await authFetch(`/api/users/${editId}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || "Error actualizando usuario");
        toast.success("Usuario actualizado");
      }

      setOpen(false);
      loadUsers();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const resendAccess = async (user) => {
    try {
      await sendResetEmail(user.email);
      toast.success("Correo para definir o restablecer contraseña enviado");
    } catch (error) {
      toast.error(error.message || "No se pudo enviar el correo de acceso");
    }
  };

  const toggleActivo = async (user) => {
    try {
      const res = await authFetch(`/api/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ activo: user.activo === false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Error cambiando estado");
      toast.success(user.activo === false ? "Usuario activado" : "Usuario desactivado");
      loadUsers();
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
              <h1 className="page-title">Usuarios</h1>
              <p className="page-title-sub">Administra accesos, roles y estados dentro del mismo diseño del dashboard principal.</p>
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
                Nuevo usuario
              </button>
            </div>
          </div>
        </header>

        <section className="summary-grid" aria-label="Resumen de usuarios">
          <article className="summary-card">
            <span className="summary-card-icon">
              <DashboardIcon name="users" size={18} />
            </span>
            <div className="summary-card-content">
              <p className="summary-card-label">Total</p>
              <p className="summary-card-value">{users.length}</p>
              <p className="summary-card-note">Registros disponibles en users</p>
            </div>
          </article>
          <article className="summary-card">
            <span className="summary-card-icon">
              <DashboardIcon name="check" size={18} />
            </span>
            <div className="summary-card-content">
              <p className="summary-card-label">Activos</p>
              <p className="summary-card-value">{activeUsers}</p>
              <p className="summary-card-note">Cuentas habilitadas</p>
            </div>
          </article>
          <article className="summary-card">
            <span className="summary-card-icon">
              <DashboardIcon name="circleDot" size={18} />
            </span>
            <div className="summary-card-content">
              <p className="summary-card-label">Admins</p>
              <p className="summary-card-value">{totalAdmins}</p>
              <p className="summary-card-note">Control total del sistema</p>
            </div>
          </article>
        </section>

        <section className="table-card">
          <div className="table-responsive">
            <table className="dashboard-table desktop-only">
              <thead>
                <tr>
                  <th>UID</th>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="empty-state-cell">Cargando usuarios...</td>
                  </tr>
                ) : sortedUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-state-cell">No hay usuarios en la colección users.</td>
                  </tr>
                ) : (
                  sortedUsers.map((u) => (
                    <tr key={u.id}>
                      <td className="font-mono text-xs">{u.id}</td>
                      <td>{u.nombre || "-"}</td>
                      <td>{u.email || "-"}</td>
                      <td>
                        <span className="dashboard-badge dashboard-badge-outline">{u.role || "-"}</span>
                      </td>
                      <td>
                        <span className={`dashboard-badge ${u.activo === false ? "dashboard-badge-warning" : "dashboard-badge-success"}`}>
                          {u.activo === false ? "Inactivo" : "Activo"}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="row-actions">
                          <button
                            onClick={() => resendAccess(u)}
                            className="row-action-btn"
                            title="Enviar correo de acceso"
                            aria-label="Enviar correo de acceso"
                            type="button"
                          >
                            <DashboardIcon name="mail" size={15} />
                          </button>
                          <button onClick={() => openEdit(u)} className="row-action-btn" title="Editar usuario" aria-label="Editar usuario" type="button">
                            <DashboardIcon name="pencil" size={15} />
                          </button>
                          <button
                            onClick={() => toggleActivo(u)}
                            className={`row-action-btn ${u.activo === false ? "row-action-active" : "row-action-danger"}`}
                            title={u.activo === false ? "Activar usuario" : "Desactivar usuario"}
                            aria-label={u.activo === false ? "Activar usuario" : "Desactivar usuario"}
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
                <p className="empty-card">Cargando usuarios...</p>
              </article>
            ) : sortedUsers.length === 0 ? (
              <article className="management-card">
                <p className="empty-card">No hay usuarios en la colección users.</p>
              </article>
            ) : (
              sortedUsers.map((u) => (
                <article key={u.id} className="management-card">
                  <div className="management-card-header">
                    <div>
                      <h3 className="management-card-title">{u.nombre || "Sin nombre"}</h3>
                      <p className="management-card-subtitle">{u.email || "Sin correo"}</p>
                    </div>
                    <span className={`dashboard-badge ${u.activo === false ? "dashboard-badge-warning" : "dashboard-badge-success"}`}>
                      {u.activo === false ? "Inactivo" : "Activo"}
                    </span>
                  </div>
                  <div className="management-card-meta">
                    <div className="management-meta-item">
                      <span className="management-meta-label">UID</span>
                      <span className="management-meta-value">{u.id}</span>
                    </div>
                    <div className="management-meta-item">
                      <span className="management-meta-label">Rol</span>
                      <span className="management-meta-value">{u.role || "-"}</span>
                    </div>
                  </div>
                  <div className="management-card-footer">
                    <span className="dashboard-badge dashboard-badge-outline">Gestión de acceso</span>
                    <div className="row-actions">
                      <button
                        onClick={() => resendAccess(u)}
                        className="row-action-btn"
                        title="Enviar correo de acceso"
                        aria-label="Enviar correo de acceso"
                        type="button"
                      >
                        <DashboardIcon name="mail" size={15} />
                      </button>
                      <button onClick={() => openEdit(u)} className="row-action-btn" title="Editar usuario" aria-label="Editar usuario" type="button">
                        <DashboardIcon name="pencil" size={15} />
                      </button>
                      <button
                        onClick={() => toggleActivo(u)}
                        className={`row-action-btn ${u.activo === false ? "row-action-active" : "row-action-danger"}`}
                        title={u.activo === false ? "Activar usuario" : "Desactivar usuario"}
                        aria-label={u.activo === false ? "Activar usuario" : "Desactivar usuario"}
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
              <h2 className="management-modal-title">{editId ? "Editar usuario" : "Nuevo usuario"}</h2>
              <p className="management-modal-subtitle">La cuenta se crea en Firebase Authentication y luego se envía un correo para definir la contraseña.</p>
            </div>
            <form onSubmit={onSubmit} className="management-form-grid">
              {editId ? (
                <div className="management-field management-field-full">
                  <label>UID Firebase Auth</label>
                  <input value={editId} disabled readOnly />
                </div>
              ) : null}
              <div className="management-field">
                <label>Nombre</label>
                <input
                  value={form.nombre}
                  onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                  required
                />
              </div>
              <div className="management-field">
                <label>Email</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  required
                  type="email"
                />
              </div>
              <div className="management-field management-field-full">
                <label>Rol</label>
                <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
                  <option value={ROLES.ADMIN}>admin</option>
                  <option value={ROLES.OPERADOR}>operador</option>
                  <option value={ROLES.CONDUCTOR}>conductor</option>
                </select>
              </div>
              {!editId ? (
                <div className="management-field management-field-full">
                  <p className="management-modal-subtitle">No hace falta escribir UID ni contraseña. Se generan automáticamente.</p>
                </div>
              ) : null}
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
