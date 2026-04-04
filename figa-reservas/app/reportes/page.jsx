"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebase.jsx";
import "../styles/dashboard.css";
import "../styles/reportes.css";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import Logo from "../components/common/Logo.jsx";
import Loading from "../components/common/Loading.jsx";
import { useReservasData } from "../context/ReservasDataContext";
import { notifySuccess, notifyError } from "../utils/notify";
import toast from "react-hot-toast";
import {
  sumPrecioByMonth,
  sumPrecioByPeriod,
  sumPrecioByYear,
  countsByMonth,
  countByPeriod,
  countsByYear,
  topValues,
  topHours,
  canceladasByMonth,
  canceladasByPeriod,
  canceladasByYear,
  hourLabel12,
  pagadasByMonth,
  noPagadasByMonth,
  pagadasByPeriod,
  noPagadasByPeriod,
  pagadasByYear,
  noPagadasByYear,
} from "../utils/reportes";

const monthNames = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export default function ReportesPage() {
  const router = useRouter();
  const { getReservas, isLoading, invalidateCache } = useReservasData();

  const [user, setUser] = useState(null);
  const [reservas, setReservas] = useState([]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const [year, setYear] = useState(currentYear.toString());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selected, setSelected] = useState(() => {
    try {
      const saved = localStorage.getItem("reportesSelected");
      return saved
        ? JSON.parse(saved)
        : {
            sumPrecioMensual: true,
            sumPrecioPeriodo: true,
            sumPrecioAnual: true,
            topPickUp: true,
            topDropOff: true,
            topHoras: true,
            topProveedores: true,
            countPeriodo: true,
            countMensual: true,
            countAnual: true,
            canceladasMensual: true,
            canceladasPeriodo: true,
            canceladasAnual: true,
            pagadasMensual: true,
            noPagadasMensual: true,
            pagadasPeriodo: true,
            noPagadasPeriodo: true,
            pagadasAnual: true,
            noPagadasAnual: true,
          };
    } catch {
      return {
        sumPrecioMensual: true,
        sumPrecioPeriodo: true,
        sumPrecioAnual: true,
        topPickUp: true,
        topDropOff: true,
        topHoras: true,
        topProveedores: true,
        countPeriodo: true,
        countMensual: true,
        countAnual: true,
        canceladasMensual: true,
        canceladasPeriodo: true,
        canceladasAnual: true,
        pagadasMensual: true,
        noPagadasMensual: true,
        pagadasPeriodo: true,
        noPagadasPeriodo: true,
        pagadasAnual: true,
        noPagadasAnual: true,
      };
    }
  });
  const fmt2 = (n) =>
    Number(n).toLocaleString("es-CR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const fmt0 = (n) => Number(n).toLocaleString("es-CR");

  const [showSelectors, setShowSelectors] = useState(false);
  const [pendingStartDate, setPendingStartDate] = useState("");
  const [pendingEndDate, setPendingEndDate] = useState("");

  const openDatePicker = (e) => {
    if (typeof e.currentTarget.showPicker === "function") {
      e.currentTarget.showPicker();
    }
  };

  const handleFiltrar = () => {
    setStartDate(pendingStartDate);
    setEndDate(pendingEndDate);
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      if (!u) router.push("/login");
      else setUser(u);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    async function load() {
      const data = await getReservas();
      setReservas(Array.isArray(data) ? data : []);
    }
    load();
  }, [getReservas]);

  useEffect(() => {
    localStorage.setItem("reportesSelected", JSON.stringify(selected));
  }, [selected]);

  const precioPorMes = useMemo(
    () => sumPrecioByMonth(reservas, year),
    [reservas, year]
  );
  const precioPeriodo = useMemo(
    () => sumPrecioByPeriod(reservas, startDate, endDate),
    [reservas, startDate, endDate]
  );
  const precioPorAnio = useMemo(() => sumPrecioByYear(reservas), [reservas]);

  const cantPorMes = useMemo(
    () => countsByMonth(reservas, year),
    [reservas, year]
  );
  const cantPeriodo = useMemo(
    () => countByPeriod(reservas, startDate, endDate),
    [reservas, startDate, endDate]
  );
  const cantPorAnio = useMemo(() => countsByYear(reservas), [reservas]);

  const canceladasPorMes = useMemo(
    () => canceladasByMonth(reservas, year),
    [reservas, year]
  );
  const canceladasPeriodo = useMemo(
    () => canceladasByPeriod(reservas, startDate, endDate),
    [reservas, startDate, endDate]
  );
  const canceladasPorAnio = useMemo(
    () => canceladasByYear(reservas),
    [reservas]
  );

  const pagadasPorMes = useMemo(
    () => pagadasByMonth(reservas, year),
    [reservas, year]
  );
  const noPagadasPorMes = useMemo(
    () => noPagadasByMonth(reservas, year),
    [reservas, year]
  );
  const pagadasPeriodo = useMemo(
    () => pagadasByPeriod(reservas, startDate, endDate),
    [reservas, startDate, endDate]
  );
  const noPagadasPeriodo = useMemo(
    () => noPagadasByPeriod(reservas, startDate, endDate),
    [reservas, startDate, endDate]
  );
  const pagadasPorAnio = useMemo(() => pagadasByYear(reservas), [reservas]);
  const noPagadasPorAnio = useMemo(() => noPagadasByYear(reservas), [reservas]);

  const topPickUps = useMemo(
    () => topValues(reservas, "pickUp", 10),
    [reservas]
  );
  const topDropOffs = useMemo(
    () => topValues(reservas, "dropOff", 10),
    [reservas]
  );
  const topHorasList = useMemo(() => topHours(reservas, 10), [reservas]);
  const topProveedores = useMemo(
    () => topValues(reservas, "proveedor", 10),
    [reservas]
  );

  const toggle = (key) => setSelected((s) => ({ ...s, [key]: !s[key] }));

  const hasPeriod = Boolean(startDate && endDate);
  const kpiIngresos = hasPeriod
    ? precioPeriodo
    : precioPorMes.reduce((a, b) => a + b, 0);
  const kpiReservas = hasPeriod
    ? cantPeriodo
    : cantPorMes.reduce((a, b) => a + b, 0);
  const kpiCanceladas = hasPeriod
    ? canceladasPeriodo
    : canceladasPorMes.reduce((a, b) => a + b, 0);
  const kpiNoPagadas = hasPeriod
    ? noPagadasPeriodo
    : noPagadasPorMes.reduce((a, b) => a + b, 0);

  const exportarExcel = async () => {
    try {
      toast.loading("Generando archivo Excel...", { id: "export-Reportes" });

      const wb = new ExcelJS.Workbook();

      const addSheet = (name, rows) => {
        const safeRows = Array.isArray(rows) ? rows : [];
        if (safeRows.length === 0) return;

        // Excel limita los nombres de hoja a 31 caracteres.
        const ws = wb.addWorksheet(String(name).slice(0, 31));
        const headers = Object.keys(safeRows[0]);
        ws.columns = headers.map((header) => ({
          header,
          key: header,
          width: Math.max(14, String(header).length + 2),
        }));
        safeRows.forEach((row) => ws.addRow(row));
      };

      if (selected.sumPrecioMensual) {
        const rows = monthNames.map((m, i) => ({
          Mes: m,
          TotalPrecio: precioPorMes[i],
        }));
        addSheet("Precio por Mes", rows);
      }
      if (selected.sumPrecioPeriodo) {
        const rows = [
          {
            Inicio: startDate || "-",
            Fin: endDate || "-",
            TotalPrecio: precioPeriodo,
          },
        ];
        addSheet("Precio por Periodo", rows);
      }
      if (selected.sumPrecioAnual) {
        const rows = precioPorAnio.map((r) => ({
          Año: r.year,
          TotalPrecio: r.total,
        }));
        addSheet("Precio por Año", rows);
      }
      if (selected.countMensual) {
        const rows = monthNames.map((m, i) => ({
          Mes: m,
          Cantidad: cantPorMes[i],
        }));
        addSheet("Cant. por Mes", rows);
      }
      if (selected.countPeriodo) {
        const rows = [
          {
            Inicio: startDate || "-",
            Fin: endDate || "-",
            Cantidad: cantPeriodo,
          },
        ];
        addSheet("Cant. por Periodo", rows);
      }
      if (selected.countAnual) {
        const rows = cantPorAnio.map((r) => ({
          Año: r.year,
          Cantidad: r.count,
        }));
        addSheet("Cant. por Año", rows);
      }

      if (selected.canceladasMensual) {
        const rows = monthNames.map((m, i) => ({
          Mes: m,
          Canceladas: canceladasPorMes[i],
        }));
        addSheet("Canceladas por Mes", rows);
      }
      if (selected.canceladasPeriodo) {
        const rows = [
          {
            Inicio: startDate || "-",
            Fin: endDate || "-",
            Canceladas: canceladasPeriodo,
          },
        ];
        addSheet("Canceladas por Periodo", rows);
      }
      if (selected.canceladasAnual) {
        const rows = canceladasPorAnio.map((r) => ({
          Año: r.year,
          Canceladas: r.count,
        }));
        addSheet("Canceladas por Año", rows);
      }

      if (selected.pagadasMensual) {
        const rows = monthNames.map((m, i) => ({
          Mes: m,
          Pagas: pagadasPorMes[i],
        }));
        addSheet("Pagas por Mes", rows);
      }
      if (selected.noPagadasMensual) {
        const rows = monthNames.map((m, i) => ({
          Mes: m,
          NoPagas: noPagadasPorMes[i],
        }));
        addSheet("No Pagas por Mes", rows);
      }
      if (selected.pagadasPeriodo) {
        const rows = [
          {
            Inicio: startDate || "-",
            Fin: endDate || "-",
            Pagas: pagadasPeriodo,
          },
        ];
        addSheet("Pagas por Periodo", rows);
      }
      if (selected.noPagadasPeriodo) {
        const rows = [
          {
            Inicio: startDate || "-",
            Fin: endDate || "-",
            NoPagas: noPagadasPeriodo,
          },
        ];
        addSheet("No Pagas por Periodo", rows);
      }
      if (selected.pagadasAnual) {
        const rows = pagadasPorAnio.map((r) => ({
          Año: r.year,
          Pagas: r.count,
        }));
        addSheet("Pagas por Año", rows);
      }
      if (selected.noPagadasAnual) {
        const rows = noPagadasPorAnio.map((r) => ({
          Año: r.year,
          NoPagas: r.count,
        }));
        addSheet("No Pagas por Año", rows);
      }

      if (selected.topPickUp) {
        const rows = topPickUps.map((r) => ({
          Lugar: r.name,
          Cantidad: r.count,
        }));
        addSheet("Top PickUp", rows);
      }
      if (selected.topDropOff) {
        const rows = topDropOffs.map((r) => ({
          Lugar: r.name,
          Cantidad: r.count,
        }));
        addSheet("Top DropOff", rows);
      }
      if (selected.topHoras) {
        const rows = topHorasList.map((r) => ({
          Hora: hourLabel12(r.hour),
          Cantidad: r.count,
        }));
        addSheet("Top Horas", rows);
      }
      if (selected.topProveedores) {
        const rows = topProveedores.map((r) => ({
          Proveedor: r.name,
          Cantidad: r.count,
        }));
        addSheet("Top Proveedores", rows);
      }

      if (wb.worksheets.length === 0) {
        throw new Error("No hay reportes seleccionados para exportar.");
      }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const today = new Date().toISOString().split("T")[0];
      saveAs(blob, `Reportes_FIGA_${today}.xlsx`);

      toast.success("Archivo Excel generado correctamente.", {
        id: "export-Reportes",
      });
    } catch (error) {
      console.error("Error al exportar a Excel:", error);
      toast.error("Error al generar el archivo Excel.", {
        id: "export-Reportes",
      });
    }
  };

  if (isLoading && reservas.length === 0) {
    return <Loading />;
  }
  const noData = !isLoading && reservas.length === 0;

  return (
    <div className="reportes-shell">
      {/* â”€â”€ Desktop header â”€â”€ */}
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
          <h1 className="rpt-page-title">Reportes Generales</h1>
        </div>

        <div className="rpt-header-right">
          <div className="rpt-filter-group">
            <span className="rpt-filter-label">Año</span>
            <select
              className="rpt-filter-select"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              title="Año de referencia"
            >
              {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(
                (y) => (
                  <option key={y} value={y}>{y}</option>
                )
              )}
            </select>
          </div>

          <div className="rpt-filter-group">
            <span className="rpt-filter-label">Inicio</span>
            <input
              type="date"
              className="rpt-filter-input"
              value={pendingStartDate}
              onClick={openDatePicker}
              onFocus={openDatePicker}
              onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }}
              onChange={(e) => setPendingStartDate(e.target.value)}
              title="Fecha inicio"
            />
          </div>

          <div className="rpt-filter-group">
            <span className="rpt-filter-label">Fin</span>
            <input
              type="date"
              className="rpt-filter-input"
              value={pendingEndDate}
              onClick={openDatePicker}
              onFocus={openDatePicker}
              onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }}
              onChange={(e) => setPendingEndDate(e.target.value)}
              title="Fecha fin"
            />
          </div>

          <button className="rpt-btn-filter" onClick={handleFiltrar}>
            Filtrar
          </button>
          <button className="rpt-btn-export" onClick={exportarExcel}>
            Exportar
          </button>
        </div>
      </header>

      {/* â”€â”€ Mobile header â”€â”€ */}
      <header className="rpt-mobile-header mobile-only">
        <button
          className="rpt-logo-btn"
          onClick={() => router.push("/dashboard")}
          title="Ir al dashboard"
          aria-label="Ir al dashboard"
        >
          <Logo />
        </button>
        <h1 className="rpt-mobile-title">Reportes Generales</h1>
      </header>

      {/* â”€â”€ Mobile filters â”€â”€ */}
      <section className="rpt-mobile-filters mobile-only">
        <div className="rpt-filter-group">
          <span className="rpt-filter-label">Año</span>
          <select
            className="rpt-filter-select rpt-filter-fw"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(
              (y) => (
                <option key={y} value={y}>{y}</option>
              )
            )}
          </select>
        </div>

        <div className="rpt-mobile-filter-row">
          <div className="rpt-filter-group">
            <span className="rpt-filter-label">Inicio</span>
            <input
              type="date"
              className="rpt-filter-input"
              value={pendingStartDate}
              onClick={openDatePicker}
              onFocus={openDatePicker}
              onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }}
              onChange={(e) => setPendingStartDate(e.target.value)}
            />
          </div>
          <div className="rpt-filter-group">
            <span className="rpt-filter-label">Fin</span>
            <input
              type="date"
              className="rpt-filter-input"
              value={pendingEndDate}
              onClick={openDatePicker}
              onFocus={openDatePicker}
              onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }}
              onChange={(e) => setPendingEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="rpt-mobile-actions">
          <button className="rpt-btn-filter" onClick={handleFiltrar}>
            Filtrar
          </button>
          <button className="rpt-btn-export" onClick={exportarExcel}>
            Exportar
          </button>
        </div>
      </section>

      {/* â”€â”€ Main content â”€â”€ */}
      <main className="reportes-main">
        {noData && (
          <div className="rpt-no-data">
            No hay reservas para mostrar. Ajusta el rango de fechas o el año, o
            intenta recargar.
          </div>
        )}

        {/* KPI cards */}
        <div className="rpt-kpi-row">
          <div className="rpt-kpi-card">
            <div className="rpt-kpi-icon rpt-kpi-icon-green" />
            <p className="rpt-kpi-label">Ingresos Totales</p>
            <p className="rpt-kpi-value">${fmt2(kpiIngresos)}</p>
            <p className="rpt-kpi-sub">
              {hasPeriod ? "Periodo seleccionado" : `Año ${year}`}
            </p>
          </div>
          <div className="rpt-kpi-card">
            <div className="rpt-kpi-icon rpt-kpi-icon-blue" />
            <p className="rpt-kpi-label">Total Reservas</p>
            <p className="rpt-kpi-value">{fmt0(kpiReservas)}</p>
            <p className="rpt-kpi-sub">Reservas exitosas</p>
          </div>
          <div className="rpt-kpi-card">
            <div className="rpt-kpi-icon rpt-kpi-icon-red" />
            <p className="rpt-kpi-label">Canceladas</p>
            <p className="rpt-kpi-value">{fmt0(kpiCanceladas)}</p>
            <p className="rpt-kpi-sub">
              {hasPeriod ? "En el periodo" : `En el año ${year}`}
            </p>
          </div>
          <div className="rpt-kpi-card">
            <div className="rpt-kpi-icon rpt-kpi-icon-yellow" />
            <p className="rpt-kpi-label">No Pagadas</p>
            <p className="rpt-kpi-value">{fmt0(kpiNoPagadas)}</p>
            <p className="rpt-kpi-sub">Pendientes de cobro</p>
          </div>
        </div>

        {/* Resumen Mensual */}
        <section className="rpt-section">
          <div className="rpt-section-header">
            <h2 className="rpt-section-title">Resumen Mensual ({year})</h2>
          </div>
          <div className="rpt-table-wrap">
            <table className="rpt-table">
              <thead>
                <tr>
                  <th className="rpt-th-metric">Métrica</th>
                  {monthNames.map((m) => (
                    <th key={m}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="rpt-metric-label">Ingresos ($)</td>
                  {precioPorMes.map((v, i) => (
                    <td key={i}>{fmt2(v)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="rpt-metric-label">Reservas</td>
                  {cantPorMes.map((v, i) => (
                    <td key={i}>{fmt0(v)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="rpt-metric-label">Canceladas</td>
                  {canceladasPorMes.map((v, i) => (
                    <td key={i}>{fmt0(v)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="rpt-metric-label">No Pagadas</td>
                  {noPagadasPorMes.map((v, i) => (
                    <td key={i}>{fmt0(v)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Top Estadísticas */}
        <section className="rpt-section">
          <div className="rpt-section-header">
            <h2 className="rpt-section-title">Top Estadísticas</h2>
          </div>
          <div className="rpt-top-grid">
            <div className="rpt-top-col">
              <h3 className="rpt-top-col-title">Top Lugares (PickUp)</h3>
              {topPickUps.map((r) => (
                <div key={r.name} className="rpt-top-row">
                  <span className="rpt-top-name" title={r.name}>{r.name}</span>
                  <span className="rpt-badge">{fmt0(r.count)}</span>
                </div>
              ))}
            </div>
            <div className="rpt-top-col">
              <h3 className="rpt-top-col-title">Top Lugares (DropOff)</h3>
              {topDropOffs.map((r) => (
                <div key={r.name} className="rpt-top-row">
                  <span className="rpt-top-name" title={r.name}>{r.name}</span>
                  <span className="rpt-badge">{fmt0(r.count)}</span>
                </div>
              ))}
            </div>
            <div className="rpt-top-col">
              <h3 className="rpt-top-col-title">Top Proveedores</h3>
              {topProveedores.map((r) => (
                <div key={r.name} className="rpt-top-row">
                  <span className="rpt-top-name" title={r.name}>{r.name || "-"}</span>
                  <span className="rpt-badge">{fmt0(r.count)}</span>
                </div>
              ))}
            </div>
            <div className="rpt-top-col">
              <h3 className="rpt-top-col-title">Top Horas</h3>
              {topHorasList.map((r) => (
                <div key={r.hour} className="rpt-top-row">
                  <span className="rpt-top-name">{hourLabel12(r.hour)}</span>
                  <span className="rpt-badge">{fmt0(r.count)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Configurar exportación */}
        <section className="rpt-section">
          <button
            className="rpt-section-header rpt-section-toggle"
            onClick={() => setShowSelectors((s) => !s)}
            type="button"
            aria-expanded={showSelectors}
          >
            <h2 className="rpt-section-title">Configurar exportación</h2>
            <span className="rpt-toggle-caret">{showSelectors ? "â–²" : "â–¼"}</span>
          </button>
          {showSelectors && (
            <div className="rpt-selectors-body">
              <div className="rpt-selectors-grid">
                {[
                  ["sumPrecioMensual", "Precio x Mes"],
                  ["sumPrecioPeriodo", "Precio x Periodo"],
                  ["sumPrecioAnual", "Precio x Año"],
                  ["countMensual", "Cantidad x Mes"],
                  ["countPeriodo", "Cantidad x Periodo"],
                  ["countAnual", "Cantidad x Año"],
                  ["canceladasMensual", "Canceladas x Mes"],
                  ["canceladasPeriodo", "Canceladas x Periodo"],
                  ["canceladasAnual", "Canceladas x Año"],
                  ["pagadasMensual", "Pagas x Mes"],
                  ["pagadasPeriodo", "Pagas x Periodo"],
                  ["pagadasAnual", "Pagas x Año"],
                  ["noPagadasMensual", "No Pagas x Mes"],
                  ["noPagadasPeriodo", "No Pagas x Periodo"],
                  ["noPagadasAnual", "No Pagas x Año"],
                  ["topPickUp", "Top PickUp"],
                  ["topDropOff", "Top DropOff"],
                  ["topHoras", "Top Horas"],
                  ["topProveedores", "Top Proveedores"],
                ].map(([k, label]) => (
                  <label key={k} className="rpt-selector-item">
                    <input
                      type="checkbox"
                      checked={!!selected[k]}
                      onChange={() => toggle(k)}
                      className="rpt-selector-check"
                      aria-label={label}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
