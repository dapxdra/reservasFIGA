"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import "../../styles/dashboard.css";
import "../../styles/reportes.css";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import Logo from "../../components/common/Logo.jsx";
import Loading from "../../components/common/Loading.jsx";
import ProtectedRoute from "../../components/common/ProtectedRoute.jsx";
import { useUser } from "../../context/UserContext.js";
import { ROLES } from "../../lib/roles.js";
import { getRendimientoConductores } from "../../lib/api.js";
import { ESTADO_SERVICIO_LABELS } from "../../core/shared/reservas/estadoServicio.js";

const fmt0 = (n) => Number(n || 0).toLocaleString("es-CR");
const fmt2 = (n) =>
  Number(n || 0).toLocaleString("es-CR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n) => (n == null ? "—" : `${Number(n).toLocaleString("es-CR")}%`);

function fmtMin(n) {
  if (n == null) return "—";
  const total = Math.round(Number(n));
  if (Math.abs(total) < 60) return `${total} min`;
  const h = Math.trunc(total / 60);
  const m = Math.abs(total % 60);
  return `${h} h ${String(m).padStart(2, "0")} min`;
}

function fmtRetraso(n) {
  if (n == null) return "—";
  if (n <= 0) return n < 0 ? `${fmtMin(-n)} antes` : "En hora";
  return `+${fmtMin(n)}`;
}

function estadoLabel(servicio) {
  if (servicio.cancelada) return "Cancelada";
  if (!servicio.estadoServicio) return "Sin confirmar";
  return ESTADO_SERVICIO_LABELS[servicio.estadoServicio] || servicio.estadoServicio;
}

// Verde/amarillo/rojo según qué tan cerca está del objetivo.
function nivelPct(n, { bueno = 90, regular = 75 } = {}) {
  if (n == null) return "";
  if (n >= bueno) return "rpt-cond-good";
  if (n >= regular) return "rpt-cond-warn";
  return "rpt-cond-bad";
}

const openDatePicker = (e) => {
  if (typeof e.currentTarget.showPicker === "function") e.currentTarget.showPicker();
};

export default function RendimientoConductoresPage() {
  return (
    <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.CONDUCTOR]}>
      <RendimientoContent />
    </ProtectedRoute>
  );
}

function Filtros({ pending, setPending, onFiltrar, onExportar, fullWidth }) {
  const dateProps = {
    className: "rpt-filter-input",
    onClick: openDatePicker,
    onFocus: openDatePicker,
    onKeyDown: (e) => {
      if (e.key !== "Tab") e.preventDefault();
    },
  };

  return (
    <>
      <div className="rpt-filter-group">
        <span className="rpt-filter-label">Inicio</span>
        <input
          type="date"
          {...dateProps}
          value={pending.desde}
          onChange={(e) => setPending((p) => ({ ...p, desde: e.target.value }))}
          title="Fecha inicio"
        />
      </div>
      <div className="rpt-filter-group">
        <span className="rpt-filter-label">Fin</span>
        <input
          type="date"
          {...dateProps}
          value={pending.hasta}
          onChange={(e) => setPending((p) => ({ ...p, hasta: e.target.value }))}
          title="Fecha fin"
        />
      </div>
      <div className="rpt-filter-group">
        <span className="rpt-filter-label">Tolerancia</span>
        <select
          className={`rpt-filter-select ${fullWidth ? "rpt-filter-fw" : ""}`}
          value={pending.tolerancia}
          onChange={(e) => setPending((p) => ({ ...p, tolerancia: e.target.value }))}
          title="Minutos de gracia para considerar la llegada a tiempo"
        >
          {[0, 5, 10, 15, 20, 30].map((m) => (
            <option key={m} value={String(m)}>
              {m} min
            </option>
          ))}
        </select>
      </div>
      <button className="rpt-btn-filter" onClick={onFiltrar}>
        Filtrar
      </button>
      <button className="rpt-btn-export" onClick={onExportar}>
        Exportar
      </button>
    </>
  );
}

function KpiCards({ resumen, mostrarIngresos }) {
  return (
    <div className="rpt-kpi-row rpt-cond-kpis">
      <div className="rpt-kpi-card">
        <div className="rpt-kpi-icon rpt-kpi-icon-blue" />
        <p className="rpt-kpi-label">Servicios realizados</p>
        <p className="rpt-kpi-value">{fmt0(resumen.realizados)}</p>
        <p className="rpt-kpi-sub">
          {fmt0(resumen.finalizados)} finalizados · {fmt0(resumen.programados)} programados ·{" "}
          {fmt0(resumen.cancelados)} cancelados
        </p>
      </div>
      <div className="rpt-kpi-card">
        <div className="rpt-kpi-icon rpt-kpi-icon-green" />
        <p className="rpt-kpi-label">Puntualidad</p>
        <p className={`rpt-kpi-value ${nivelPct(resumen.puntualidad.aTiempoPct)}`}>
          {fmtPct(resumen.puntualidad.aTiempoPct)}
        </p>
        <p className="rpt-kpi-sub">
          {fmt0(resumen.puntualidad.aTiempo)} de {fmt0(resumen.puntualidad.medidas)} a tiempo · retraso
          prom. {fmtMin(resumen.puntualidad.retrasoPromedioMin)}
        </p>
      </div>
      <div className="rpt-kpi-card">
        <div className="rpt-kpi-icon rpt-kpi-icon-yellow" />
        <p className="rpt-kpi-label">Uso de la app</p>
        <p className={`rpt-kpi-value ${nivelPct(resumen.cumplimiento.finalizacionPct)}`}>
          {fmtPct(resumen.cumplimiento.finalizacionPct)}
        </p>
        <p className="rpt-kpi-sub">
          Finalizados · {fmtPct(resumen.cumplimiento.confirmacionPct)} confirmados ·{" "}
          {fmtPct(resumen.cumplimiento.etapasCompletasPct)} con todas las etapas
        </p>
      </div>
      <div className="rpt-kpi-card">
        <div className="rpt-kpi-icon rpt-kpi-icon-red" />
        <p className="rpt-kpi-label">Sin cerrar</p>
        <p className={`rpt-kpi-value ${resumen.sinCerrar > 0 ? "rpt-cond-bad" : ""}`}>
          {fmt0(resumen.sinCerrar)}
        </p>
        <p className="rpt-kpi-sub">Servicios de días pasados sin finalizar</p>
      </div>
      <div className="rpt-kpi-card">
        <div className="rpt-kpi-icon rpt-kpi-icon-blue" />
        <p className="rpt-kpi-label">Tiempos promedio</p>
        <p className="rpt-kpi-value">{fmtMin(resumen.tiempos.duracionViajePromedioMin)}</p>
        <p className="rpt-kpi-sub">
          Viaje · {fmtMin(resumen.tiempos.trayectoPickupPromedioMin)} al pickup ·{" "}
          {fmtMin(resumen.tiempos.esperaPickupPromedioMin)} de espera
        </p>
      </div>
      <div className="rpt-kpi-card">
        <div className="rpt-kpi-icon rpt-kpi-icon-green" />
        <p className="rpt-kpi-label">Pasajeros</p>
        <p className="rpt-kpi-value">{fmt0(resumen.pasajeros)}</p>
        <p className="rpt-kpi-sub">
          {mostrarIngresos ? `Ingresos $${fmt2(resumen.ingresos)}` : "En servicios realizados"}
        </p>
      </div>
    </div>
  );
}

function TablaServicios({ servicios }) {
  if (!servicios.length) {
    return <div className="rpt-no-data">No hay servicios en el rango seleccionado.</div>;
  }

  return (
    <div className="rpt-table-wrap">
      <table className="rpt-table">
        <thead>
          <tr>
            <th className="rpt-th-metric">Fecha</th>
            <th>Hora</th>
            <th>Cliente</th>
            <th>PickUp</th>
            <th>DropOff</th>
            <th>Vehículo</th>
            <th>Pax</th>
            <th>Estado</th>
            <th>Llegada</th>
            <th>Al pickup</th>
            <th>Viaje</th>
          </tr>
        </thead>
        <tbody>
          {servicios.map((s) => (
            <tr key={s.id} className={s.cancelada ? "rpt-cond-row-muted" : ""}>
              <td className="rpt-metric-label">{s.fecha}</td>
              <td>{s.hora || "—"}</td>
              <td>{s.cliente || "—"}</td>
              <td>{s.pickUp || "—"}</td>
              <td>{s.dropOff || "—"}</td>
              <td>{s.vehiculo || "—"}</td>
              <td>{fmt0(s.pasajeros)}</td>
              <td className={s.sinCerrar ? "rpt-cond-bad" : ""}>
                {estadoLabel(s)}
                {s.sinCerrar ? " (sin cerrar)" : ""}
              </td>
              <td className={s.retrasoMin > 0 ? "rpt-cond-warn" : ""}>{fmtRetraso(s.retrasoMin)}</td>
              <td>{fmtMin(s.trayectoPickupMin)}</td>
              <td>{fmtMin(s.duracionViajeMin)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RendimientoContent() {
  const router = useRouter();
  const { role } = useUser();
  const isConductor = role === ROLES.CONDUCTOR;

  // Vacío = el servidor aplica el mes en curso; luego se rellena con el rango devuelto.
  const [filtros, setFiltros] = useState({ desde: "", hasta: "", tolerancia: "5" });
  const [pending, setPending] = useState(filtros);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [seleccionId, setSeleccionId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getRendimientoConductores(filtros)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError("");
        setPending((p) => ({
          ...p,
          desde: p.desde || result.rango.desde,
          hasta: p.hasta || result.rango.hasta,
        }));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || "No se pudo cargar el reporte.");
        toast.error(err?.message || "No se pudo cargar el reporte.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filtros]);

  const porConductor = useMemo(() => data?.porConductor || [], [data]);
  const claveDe = (c) => c.conductorId || `nombre:${c.nombre}`;

  // El conductor siempre ve su propia ficha; el admin, la fila que seleccione.
  const seleccionado = isConductor
    ? porConductor[0] || null
    : porConductor.find((c) => claveDe(c) === seleccionId) || null;

  const handleFiltrar = () => {
    if (pending.desde && pending.hasta && pending.desde > pending.hasta) {
      toast.error("La fecha inicial no puede ser mayor que la final.");
      return;
    }
    setFiltros({ ...pending });
  };

  const exportarExcel = async () => {
    if (!data) return;
    try {
      toast.loading("Generando archivo Excel...", { id: "export-rendimiento" });
      const wb = new ExcelJS.Workbook();

      const addSheet = (name, rows) => {
        if (!rows.length) return;
        const ws = wb.addWorksheet(String(name).slice(0, 31));
        const headers = Object.keys(rows[0]);
        ws.columns = headers.map((header) => ({
          header,
          key: header,
          width: Math.max(12, header.length + 2),
        }));
        rows.forEach((row) => ws.addRow(row));
        ws.getRow(1).font = { bold: true };
      };

      addSheet(
        "Resumen por conductor",
        porConductor.map((c) => ({
          Conductor: c.nombre,
          Asignados: c.asignados,
          Realizados: c.realizados,
          Finalizados: c.finalizados,
          "Sin cerrar": c.sinCerrar,
          Programados: c.programados,
          Cancelados: c.cancelados,
          Pasajeros: c.pasajeros,
          ...(isConductor ? {} : { "Ingresos ($)": c.ingresos }),
          "Confirmación (%)": c.cumplimiento.confirmacionPct ?? "",
          "Finalización (%)": c.cumplimiento.finalizacionPct ?? "",
          "Etapas completas (%)": c.cumplimiento.etapasCompletasPct ?? "",
          "Llegadas medidas": c.puntualidad.medidas,
          "A tiempo": c.puntualidad.aTiempo,
          Tarde: c.puntualidad.tarde,
          "Puntualidad (%)": c.puntualidad.aTiempoPct ?? "",
          "Retraso prom. (min)": c.puntualidad.retrasoPromedioMin ?? "",
          "Al pickup prom. (min)": c.tiempos.trayectoPickupPromedioMin ?? "",
          "Espera prom. (min)": c.tiempos.esperaPickupPromedioMin ?? "",
          "Viaje prom. (min)": c.tiempos.duracionViajePromedioMin ?? "",
        }))
      );

      addSheet(
        "Servicios",
        porConductor.flatMap((c) =>
          c.servicios.map((s) => ({
            Conductor: c.nombre,
            ID: s.id,
            Fecha: s.fecha,
            Hora: s.hora,
            Cliente: s.cliente,
            PickUp: s.pickUp,
            DropOff: s.dropOff,
            Vehiculo: s.vehiculo,
            Pasajeros: s.pasajeros,
            Estado: estadoLabel(s),
            "Sin cerrar": s.sinCerrar ? "Sí" : "",
            "Retraso llegada (min)": s.retrasoMin ?? "",
            "Al pickup (min)": s.trayectoPickupMin ?? "",
            "Viaje (min)": s.duracionViajeMin ?? "",
          }))
        )
      );

      if (!wb.worksheets.length) throw new Error("No hay datos para exportar.");

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const { desde, hasta } = data.rango;
      saveAs(blob, `Rendimiento_Conductores_${desde}_a_${hasta}.xlsx`);
      toast.success("Archivo Excel generado correctamente.", { id: "export-rendimiento" });
    } catch (err) {
      console.error("Error al exportar rendimiento:", err);
      toast.error(err?.message || "Error al generar el archivo Excel.", { id: "export-rendimiento" });
    }
  };

  if (loading && !data) return <Loading />;

  const titulo = isConductor ? "Mi Rendimiento" : "Rendimiento de Conductores";
  const filtrosProps = { pending, setPending, onFiltrar: handleFiltrar, onExportar: exportarExcel };

  return (
    <div className="reportes-shell">
      <header className="reportes-header desktop-only">
        <div className="rpt-header-left">
          <button
            className="rpt-logo-btn"
            onClick={() => router.push("/dashboard")}
            title="Ir al dashboard"
            aria-label="Ir al dashboard"
          >
            <Logo />
          </button>
          <h1 className="rpt-page-title">{titulo}</h1>
        </div>
        <div className="rpt-header-right">
          <Filtros {...filtrosProps} />
        </div>
      </header>

      <header className="rpt-mobile-header mobile-only">
        <button
          className="rpt-logo-btn"
          onClick={() => router.push("/dashboard")}
          title="Ir al dashboard"
          aria-label="Ir al dashboard"
        >
          <Logo />
        </button>
        <h1 className="rpt-mobile-title">{titulo}</h1>
      </header>

      <section className="rpt-mobile-filters mobile-only">
        <div className="rpt-cond-mobile-filters">
          <Filtros {...filtrosProps} fullWidth />
        </div>
      </section>

      <main className="reportes-main">
        {error && !data ? <div className="rpt-no-data">{error}</div> : null}

        {data ? (
          <div className="rpt-proveedor-banner">
            Periodo: <strong>{data.rango.desde}</strong> a <strong>{data.rango.hasta}</strong> ·
            tolerancia de llegada <strong>{data.rango.toleranciaMin} min</strong>
            {loading ? " · actualizando..." : ""}
          </div>
        ) : null}

        {data && !isConductor ? (
          <>
            <KpiCards resumen={data.totales} mostrarIngresos />
            {data.totales.sinAsignar > 0 ? (
              <p className="rpt-cond-note">
                {fmt0(data.totales.sinAsignar)} reservas activas del periodo no tienen conductor
                asignado y no cuentan en este reporte.
              </p>
            ) : null}

            <section className="rpt-section">
              <div className="rpt-section-header">
                <h2 className="rpt-section-title">Comparativo por conductor</h2>
              </div>
              {porConductor.length ? (
                <div className="rpt-table-wrap">
                  <table className="rpt-table">
                    <thead>
                      <tr>
                        <th className="rpt-th-metric">Conductor</th>
                        <th>Realizados</th>
                        <th>Finalizados</th>
                        <th>Sin cerrar</th>
                        <th>Cancelados</th>
                        <th>Pax</th>
                        <th>Ingresos ($)</th>
                        <th>Confirmación</th>
                        <th>Puntualidad</th>
                        <th>Retraso prom.</th>
                        <th>Al pickup</th>
                        <th>Viaje prom.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {porConductor.map((c) => {
                        const clave = claveDe(c);
                        const activa = clave === seleccionId;
                        return (
                          <tr
                            key={clave}
                            className={`rpt-cond-row ${activa ? "is-selected" : ""}`}
                            onClick={() => setSeleccionId(activa ? null : clave)}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSeleccionId(activa ? null : clave);
                              }
                            }}
                            aria-selected={activa}
                            title="Ver detalle del conductor"
                          >
                            <td className="rpt-metric-label">
                              {c.nombre}
                              {c.activo === false ? " (inactivo)" : ""}
                            </td>
                            <td>{fmt0(c.realizados)}</td>
                            <td>{fmt0(c.finalizados)}</td>
                            <td className={c.sinCerrar > 0 ? "rpt-cond-bad" : ""}>{fmt0(c.sinCerrar)}</td>
                            <td>{fmt0(c.cancelados)}</td>
                            <td>{fmt0(c.pasajeros)}</td>
                            <td>{fmt2(c.ingresos)}</td>
                            <td className={nivelPct(c.cumplimiento.confirmacionPct)}>
                              {fmtPct(c.cumplimiento.confirmacionPct)}
                            </td>
                            <td className={nivelPct(c.puntualidad.aTiempoPct)}>
                              {fmtPct(c.puntualidad.aTiempoPct)}
                            </td>
                            <td>{fmtMin(c.puntualidad.retrasoPromedioMin)}</td>
                            <td>{fmtMin(c.tiempos.trayectoPickupPromedioMin)}</td>
                            <td>{fmtMin(c.tiempos.duracionViajePromedioMin)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rpt-no-data">No hay conductores con servicios en el periodo.</div>
              )}
            </section>
          </>
        ) : null}

        {data && isConductor && !seleccionado ? (
          <div className="rpt-no-data">No tienes servicios asignados en el periodo seleccionado.</div>
        ) : null}

        {seleccionado ? (
          <>
            {isConductor ? <KpiCards resumen={seleccionado} /> : null}
            <section className="rpt-section">
              <div className="rpt-section-header">
                <h2 className="rpt-section-title">
                  {isConductor ? "Mis servicios" : `Servicios de ${seleccionado.nombre}`}
                </h2>
                {!isConductor ? (
                  <button className="rpt-btn-export" onClick={() => setSeleccionId(null)}>
                    Cerrar
                  </button>
                ) : null}
              </div>
              {!isConductor ? <KpiCards resumen={seleccionado} mostrarIngresos /> : null}
              <TablaServicios servicios={seleccionado.servicios} />
            </section>
          </>
        ) : null}

        <p className="rpt-cond-note">
          Puntualidad: compara la marca &quot;Llegué al pickup&quot; con la hora programada de la
          reserva. Los tiempos se calculan con las etapas que el conductor marca en la app; los
          servicios sin esas marcas no entran en los promedios.
        </p>
      </main>
    </div>
  );
}
