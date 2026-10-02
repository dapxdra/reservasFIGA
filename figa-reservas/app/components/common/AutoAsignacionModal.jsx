"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { autoAsignarReservas } from "@/app/lib/api.js";
import { formatDate } from "@/app/utils/formatDate.js";

const MOTIVOS = {
  EncadenaServicio: "Encadena con su servicio anterior",
  MenorRecorridoVacio: "Menos km sin pasajeros para llegar",
  MenorCargaDelDia: "Menor carga del día",
  SinHora: "La reserva no tiene hora",
  SinConductorDisponible: "Ningún conductor libre en esa franja",
  CapacidadInsuficiente: "Ningún vehículo con capacidad suficiente",
};

function detalleRuta(a) {
  const partes = [];
  if (a.kmVacio != null) partes.push(`~${a.kmVacio} km vacío`);
  if (a.esperaMin != null) partes.push(`espera ~${a.esperaMin} min`);
  return partes.length ? ` · ${partes.join(" · ")}` : "";
}

const DIAS_OPCIONES = [0, 1, 2, 3, 5, 7];

export default function AutoAsignacionModal({ onClose, onApplied }) {
  const [dias, setDias] = useState(2);
  const [propuesta, setPropuesta] = useState(null);
  const [loading, setLoading] = useState(false);

  const verPropuesta = async () => {
    setLoading(true);
    try {
      setPropuesta(await autoAsignarReservas({ dryRun: true, dias }));
    } catch (error) {
      toast.error(error.message || "No se pudo calcular la propuesta");
    } finally {
      setLoading(false);
    }
  };

  const aplicar = async () => {
    setLoading(true);
    try {
      const result = await autoAsignarReservas({ dryRun: false, dias });
      toast.success(`${result.asignadas.length} reservas asignadas`);
      onApplied?.(result.asignadas);
      onClose();
    } catch (error) {
      toast.error(error.message || "No se pudo aplicar la asignación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="management-modal-backdrop" onClick={onClose}>
      <div
        className="management-modal auto-asignacion-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="management-modal-header">
          <h2 className="management-modal-title">Auto-Asignar conductores</h2>
          <p className="management-modal-subtitle">
            Asigna conductores activos, con su vehículo fijo, a reservas sin conductor.
            Cada servicio bloquea al conductor y a su vehículo 5 horas.
          </p>
        </div>

        <div className="auto-asignacion-controls">
          <div className="management-field">
            <label htmlFor="auto-asignacion-dias">Rango</label>
            <select
              id="auto-asignacion-dias"
              value={dias}
              onChange={(e) => {
                setDias(Number(e.target.value));
                setPropuesta(null);
              }}
              disabled={loading}
            >
              {DIAS_OPCIONES.map((d) => (
                <option key={d} value={d}>
                  {d === 0 ? "Solo hoy" : `Hoy + ${d} ${d === 1 ? "día" : "días"}`}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="btn-outline" onClick={verPropuesta} disabled={loading}>
            {loading && !propuesta ? "Calculando..." : "Ver propuesta"}
          </button>
        </div>

        {propuesta ? (
          <div className="auto-asignacion-result">
            <p className="management-modal-subtitle">
              {propuesta.pendientes} reservas sin conductor entre {formatDate(propuesta.desde)} y{" "}
              {formatDate(propuesta.hasta)} · {propuesta.conductoresActivos} conductores activos
            </p>
            {propuesta.tiempos?.pares > 0 ? (
              <p className="auto-asignacion-motivo">
                Tiempos de traslado: {propuesta.tiempos.cache + propuesta.tiempos.osrm} por carretera
                {propuesta.tiempos.estimados > 0 ? `, ${propuesta.tiempos.estimados} estimados en línea recta` : ""}
              </p>
            ) : null}

            {propuesta.asignadas.length > 0 ? (
              <>
                <h3 className="auto-asignacion-subtitle">
                  Se asignarían ({propuesta.asignadas.length})
                </h3>
                <ul className="auto-asignacion-list">
                  {propuesta.asignadas.map((a) => (
                    <li key={a.id}>
                      <strong>#{a.id}</strong> {formatDate(a.fecha)} {a.hora}
                      {a.cliente ? ` · ${a.cliente}` : ""}
                      <span className="auto-asignacion-arrow">→</span>
                      <strong>{a.conductorNombre}</strong>
                      {a.vehiculoPlaca ? ` · ${a.vehiculoPlaca}` : " · sin vehículo"}
                      <span className="auto-asignacion-motivo">
                        {MOTIVOS[a.motivo] || a.motivo}
                        {detalleRuta(a)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {propuesta.sinAsignar.length > 0 ? (
              <>
                <h3 className="auto-asignacion-subtitle">
                  Quedan sin asignar ({propuesta.sinAsignar.length})
                </h3>
                <ul className="auto-asignacion-list">
                  {propuesta.sinAsignar.map((s) => (
                    <li key={s.id}>
                      <strong>#{s.id}</strong> {formatDate(s.fecha)} {s.hora || "--:--"}
                      <span className="auto-asignacion-motivo">{MOTIVOS[s.motivo] || s.motivo}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {propuesta.pendientes === 0 ? (
              <p className="empty-card">No hay reservas pendientes de asignar en este rango.</p>
            ) : null}
          </div>
        ) : null}

        <div className="management-form-actions">
          <button type="button" className="btn-outline" onClick={onClose} disabled={loading}>
            Cerrar
          </button>
          <button
            type="button"
            className="primary-btn"
            onClick={aplicar}
            disabled={loading || !propuesta || propuesta.asignadas.length === 0}
          >
            {loading && propuesta ? "Aplicando..." : "Aplicar asignaciones"}
          </button>
        </div>
      </div>
    </div>
  );
}
