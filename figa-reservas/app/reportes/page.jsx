"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import "../styles/dashboard.css";
import "../styles/reportes.css";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import Logo from "../components/common/Logo.jsx";
import Loading from "../components/common/Loading.jsx";
import { useReservasData } from "../context/ReservasDataContext";
import ProtectedRoute from "../components/common/ProtectedRoute.jsx";
import { ROLES } from "../lib/roles.js";
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

const PIE_COLORS = [
  "#2563eb", "#16a34a", "#dc2626", "#d97706", "#9333ea",
  "#0891b2", "#be185d", "#65a30d", "#ea580c", "#6366f1",
];

function PieChart({ title, data }) {
  const items = Array.isArray(data) ? data.filter((d) => d.count > 0) : [];
  const total = items.reduce((s, d) => s + d.count, 0);

  if (total === 0) {
    return (
      <div className="rpt-pie-card">
        <h3 className="rpt-top-col-title">{title}</h3>
        <p className="rpt-pie-empty">Sin datos</p>
      </div>
    );
  }

  const cx = 80, cy = 80, r = 70;
  let startAngle = -Math.PI / 2;
  const slices = items.map((d, i) => {
    const angle = (d.count / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
    const color = PIE_COLORS[i % PIE_COLORS.length];
    startAngle = endAngle;
    return { path, color, name: d.name, count: d.count };
  });

  return (
    <div className="rpt-pie-card">
      <h3 className="rpt-top-col-title">{title}</h3>
      <svg viewBox="0 0 160 160" className="rpt-pie-svg" aria-hidden="true">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth="1.5">
            <title>{s.name}: {s.count}</title>
          </path>
        ))}
      </svg>
      <ul className="rpt-pie-legend">
        {slices.map((s, i) => (
          <li key={i} className="rpt-pie-legend-item">
            <span className="rpt-pie-legend-dot" style={{ background: s.color }} />
            <span className="rpt-pie-legend-name" title={s.name}>{s.name || "-"}</span>
            <span className="rpt-pie-legend-count">{s.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ReportesPage() {
  return (
    <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
      <ReportesContent />
    </ProtectedRoute>
  );
}

function ReportesContent() {
  const router = useRouter();
  const { getReservas, isLoading, invalidateCache } = useReservasData();
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
            topConductores: true,
            topVehiculos: true,
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
        topConductores: true,
        topVehiculos: true,
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
  const reservasTopSource = useMemo(
    () =>
      reservas.map((r) => ({
        ...r,
        conductorReporte: r.conductorNombre || r.chofer || "",
        vehiculoReporte: r.vehiculoPlaca || r.buseta || "",
      })),
    [reservas]
  );
  const topConductores = useMemo(
    () => topValues(reservasTopSource, "conductorReporte", 10),
    [reservasTopSource]
  );
  const topVehiculos = useMemo(
    () => topValues(reservasTopSource, "vehiculoReporte", 10),
    [reservasTopSource]
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

      const monthCells = (values) =>
        monthNames.reduce((acc, month, idx) => {
          acc[month] = values[idx] ?? 0;
          return acc;
        }, {});

      const mensualRows = [];
      const periodoRows = [];
      const anualRows = [];

      if (selected.sumPrecioMensual) {
        mensualRows.push({ Metrica: "Ingresos ($)", ...monthCells(precioPorMes) });
      }
      if (selected.countMensual) {
        mensualRows.push({ Metrica: "Reservas", ...monthCells(cantPorMes) });
      }
      if (selected.canceladasMensual) {
        mensualRows.push({ Metrica: "Canceladas", ...monthCells(canceladasPorMes) });
      }
      if (selected.pagadasMensual) {
        mensualRows.push({ Metrica: "Pagadas", ...monthCells(pagadasPorMes) });
      }
      if (selected.noPagadasMensual) {
        mensualRows.push({ Metrica: "No Pagadas", ...monthCells(noPagadasPorMes) });
      }

      if (selected.sumPrecioPeriodo) {
        periodoRows.push({
          Metrica: "Ingresos ($)",
          Inicio: startDate || "-",
          Fin: endDate || "-",
          Valor: precioPeriodo,
        });
      }
      if (selected.countPeriodo) {
        periodoRows.push({
          Metrica: "Reservas",
          Inicio: startDate || "-",
          Fin: endDate || "-",
          Valor: cantPeriodo,
        });
      }
      if (selected.canceladasPeriodo) {
        periodoRows.push({
          Metrica: "Canceladas",
          Inicio: startDate || "-",
          Fin: endDate || "-",
          Valor: canceladasPeriodo,
        });
      }
      if (selected.pagadasPeriodo) {
        periodoRows.push({
          Metrica: "Pagadas",
          Inicio: startDate || "-",
          Fin: endDate || "-",
          Valor: pagadasPeriodo,
        });
      }
      if (selected.noPagadasPeriodo) {
        periodoRows.push({
          Metrica: "No Pagadas",
          Inicio: startDate || "-",
          Fin: endDate || "-",
          Valor: noPagadasPeriodo,
        });
      }

      if (selected.sumPrecioAnual) {
        anualRows.push(
          ...precioPorAnio.map((r) => ({
            Metrica: "Ingresos ($)",
            Ano: r.year,
            Valor: r.total,
          }))
        );
      }
      if (selected.countAnual) {
        anualRows.push(
          ...cantPorAnio.map((r) => ({
            Metrica: "Reservas",
            Ano: r.year,
            Valor: r.count,
          }))
        );
      }
      if (selected.canceladasAnual) {
        anualRows.push(
          ...canceladasPorAnio.map((r) => ({
            Metrica: "Canceladas",
            Ano: r.year,
            Valor: r.count,
          }))
        );
      }
      if (selected.pagadasAnual) {
        anualRows.push(
          ...pagadasPorAnio.map((r) => ({
            Metrica: "Pagadas",
            Ano: r.year,
            Valor: r.count,
          }))
        );
      }
      if (selected.noPagadasAnual) {
        anualRows.push(
          ...noPagadasPorAnio.map((r) => ({
            Metrica: "No Pagadas",
            Ano: r.year,
            Valor: r.count,
          }))
        );
      }

      if (mensualRows.length > 0) addSheet("Resumen Mensual", mensualRows);
      if (periodoRows.length > 0) addSheet("Resumen Periodo", periodoRows);
      if (anualRows.length > 0) addSheet("Resumen Anual", anualRows);

      const topRows = [];

      if (selected.topPickUp) {
        topRows.push(
          ...topPickUps.map((r) => ({
            Categoria: "Top Lugares (PickUp)",
            Detalle: r.name || "-",
            Cantidad: r.count,
          }))
        );
      }

      if (selected.topDropOff) {
        topRows.push(
          ...topDropOffs.map((r) => ({
            Categoria: "Top Lugares (DropOff)",
            Detalle: r.name || "-",
            Cantidad: r.count,
          }))
        );
      }

      if (selected.topProveedores) {
        topRows.push(
          ...topProveedores.map((r) => ({
            Categoria: "Top Proveedores",
            Detalle: r.name || "-",
            Cantidad: r.count,
          }))
        );
      }

      if (selected.topConductores) {
        topRows.push(
          ...topConductores.map((r) => ({
            Categoria: "Top Conductores",
            Detalle: r.name || "-",
            Cantidad: r.count,
          }))
        );
      }

      if (selected.topVehiculos) {
        topRows.push(
          ...topVehiculos.map((r) => ({
            Categoria: "Top Vehiculos",
            Detalle: r.name || "-",
            Cantidad: r.count,
          }))
        );
      }

      if (selected.topHoras) {
        topRows.push(
          ...topHorasList.map((r) => ({
            Categoria: "Top Horas",
            Detalle: hourLabel12(r.hour),
            Cantidad: r.count,
          }))
        );
      }

      if (topRows.length > 0) addSheet("Top Estadisticas", topRows);

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
            <PieChart title="Top Lugares (PickUp)" data={topPickUps} />
            <PieChart title="Top Lugares (DropOff)" data={topDropOffs} />
            <PieChart title="Top Proveedores" data={topProveedores} />
            <PieChart title="Top Conductores" data={topConductores} />
            <PieChart title="Top Vehículos" data={topVehiculos} />
            <PieChart
              title="Top Horas"
              data={topHorasList.map((r) => ({ name: hourLabel12(r.hour), count: r.count }))}
            />
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
            <span className="rpt-toggle-caret">{showSelectors ? "^" : "v"}</span>
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
                  ["topConductores", "Top Conductores"],
                  ["topVehiculos", "Top Vehículos"],
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
