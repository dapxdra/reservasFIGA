"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebase.jsx";
import "../styles/dashboard.css";
import * as XLSX from "xlsx";
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

  const [selected, setSelected] = useState({
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
  });

  const [showSelectors, setShowSelectors] = useState(false);

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

  const exportarExcel = () => {
    try {
      toast.loading("Generando archivo Excel...", { id: "export-Reportes" });

      const wb = XLSX.utils.book_new();

      if (selected.sumPrecioMensual) {
        const rows = monthNames.map((m, i) => ({
          Mes: m,
          TotalPrecio: precioPorMes[i],
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Precio por Mes");
      }
      if (selected.sumPrecioPeriodo) {
        const rows = [
          {
            Inicio: startDate || "-",
            Fin: endDate || "-",
            TotalPrecio: precioPeriodo,
          },
        ];
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Precio por Periodo");
      }
      if (selected.sumPrecioAnual) {
        const rows = precioPorAnio.map((r) => ({
          Año: r.year,
          TotalPrecio: r.total,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Precio por Año");
      }
      if (selected.countMensual) {
        const rows = monthNames.map((m, i) => ({
          Mes: m,
          Cantidad: cantPorMes[i],
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Cant. por Mes");
      }
      if (selected.countPeriodo) {
        const rows = [
          {
            Inicio: startDate || "-",
            Fin: endDate || "-",
            Cantidad: cantPeriodo,
          },
        ];
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Cant. por Periodo");
      }
      if (selected.countAnual) {
        const rows = cantPorAnio.map((r) => ({
          Año: r.year,
          Cantidad: r.count,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Cant. por Año");
      }

      if (selected.canceladasMensual) {
        const rows = monthNames.map((m, i) => ({
          Mes: m,
          Canceladas: canceladasPorMes[i],
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Canceladas por Mes");
      }
      if (selected.canceladasPeriodo) {
        const rows = [
          {
            Inicio: startDate || "-",
            Fin: endDate || "-",
            Canceladas: canceladasPeriodo,
          },
        ];
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Canceladas por Periodo");
      }
      if (selected.canceladasAnual) {
        const rows = canceladasPorAnio.map((r) => ({
          Año: r.year,
          Canceladas: r.count,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Canceladas por Año");
      }

      if (selected.pagadasMensual) {
        const rows = monthNames.map((m, i) => ({
          Mes: m,
          Pagas: pagadasPorMes[i],
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Pagas por Mes");
      }
      if (selected.noPagadasMensual) {
        const rows = monthNames.map((m, i) => ({
          Mes: m,
          NoPagas: noPagadasPorMes[i],
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "No Pagas por Mes");
      }
      if (selected.pagadasPeriodo) {
        const rows = [
          {
            Inicio: startDate || "-",
            Fin: endDate || "-",
            Pagas: pagadasPeriodo,
          },
        ];
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Pagas por Periodo");
      }
      if (selected.noPagadasPeriodo) {
        const rows = [
          {
            Inicio: startDate || "-",
            Fin: endDate || "-",
            NoPagas: noPagadasPeriodo,
          },
        ];
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "No Pagas por Periodo");
      }
      if (selected.pagadasAnual) {
        const rows = pagadasPorAnio.map((r) => ({
          Año: r.year,
          Pagas: r.count,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Pagas por Año");
      }
      if (selected.noPagadasAnual) {
        const rows = noPagadasPorAnio.map((r) => ({
          Año: r.year,
          NoPagas: r.count,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "No Pagas por Año");
      }

      if (selected.topPickUp) {
        const rows = topPickUps.map((r) => ({
          Lugar: r.name,
          Cantidad: r.count,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Top PickUp");
      }
      if (selected.topDropOff) {
        const rows = topDropOffs.map((r) => ({
          Lugar: r.name,
          Cantidad: r.count,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Top DropOff");
      }
      if (selected.topHoras) {
        const rows = topHorasList.map((r) => ({
          Hora: hourLabel12(r.hour),
          Cantidad: r.count,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Top Horas");
      }
      if (selected.topProveedores) {
        const rows = topProveedores.map((r) => ({
          Proveedor: r.name,
          Cantidad: r.count,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Top Proveedores");
      }

      const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([buffer], { type: "application/octet-stream" });
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white flex flex-col items-center text-black">
      <nav className="w-full flex items-center bg-gray-80 border border-gray-200 shadow-sm rounded-xl mb-[10px] gap-2">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <label className="text-xs text-gray-600">
              Año (para vistas mensuales)
            </label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="p-2 border rounded text-black"
              title="Año de referencia"
            >
              {[
                currentYear - 2,
                currentYear - 1,
                currentYear,
                currentYear + 1,
              ].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-600">Inicio</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-2 border rounded text-black datepicker"
              title="Fecha inicio (opcional)"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-600">Fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-2 border rounded text-black datepicker"
              title="Fecha fin (opcional)"
            />
          </div>
        </div>
        <div
          className="flex flex-grow justify-center items-center cursor-pointer"
          role="button"
          title="Ir al dashboard (ver activas)"
          onClick={() => {
            router.push("/dashboard");
          }}
        >
          <Logo />
        </div>
        <div className="flex items-center justify-end gap-4 flex-grow">
          <button
            onClick={() => setShowSelectors((s) => !s)}
            className="button-menuselect px-3 py-2 rounded-md border hover:bg-blue-100"
            title="Mostrar/ocultar selectores de reportes"
          >
            {showSelectors ? "Ocultar selectores" : "Ver selectores"}
          </button>
          <button
            onClick={exportarExcel}
            className="button-export px-3 py-2 rounded-md hover:bg-yellow-100 border"
            title="Exportar reportes seleccionados"
          >
            Exportar
          </button>
        </div>
      </nav>
      {showSelectors && (
        <div className="w-full bg-white border rounded-md shadow-sm p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3">
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
              <label
                key={k}
                className="flex items-center justify-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={!!selected[k]}
                  onChange={() => toggle(k)}
                  className="cursor-pointer"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="w-full grid md:grid-cols-3 gap-6">
        {selected.sumPrecioMensual && (
          <section className="w-full col-span-3">
            <h2 className="text-base text-center font-semibold mb-2">
              Precio por Mes (Año {year})
            </h2>
            <table className="dashboard-table min-w-full table-auto text-sm rounded border shadow-sm">
              <thead>
                <tr>
                  {monthNames.map((m) => (
                    <th key={m}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {precioPorMes.map((v, i) => (
                    <td key={i}>{v.toFixed(2)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {selected.sumPrecioPeriodo && (
          <section className="w-full">
            <h2 className="text-base text-center font-semibold mb-2">
              Precio por Periodo
            </h2>
            <div className="border rounded p-3">
              Total: <strong>{precioPeriodo.toFixed(2)}</strong>
              <div className="text-xs text-gray-500">
                Rango: {startDate || "-"} a {endDate || "-"}
              </div>
            </div>
          </section>
        )}

        {selected.sumPrecioAnual && (
          <section className="w-full col-span-2">
            <h2 className="text-base text-center font-semibold mb-2">
              Precio por Año
            </h2>
            <table className="dashboard-table min-w-full table-auto text-sm rounded border shadow-sm">
              <thead>
                <tr>
                  <th>Año</th>
                  <th>Total Precio</th>
                </tr>
              </thead>
              <tbody>
                {precioPorAnio.map((r) => (
                  <tr key={r.year}>
                    <td>{r.year}</td>
                    <td>{r.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {selected.countMensual && (
          <section className="w-full col-span-3">
            <h2 className="text-base text-center font-semibold mb-2">
              Cantidad por Mes (Año {year})
            </h2>
            <table className="dashboard-table min-w-full table-auto text-sm rounded border shadow-sm">
              <thead>
                <tr>
                  {monthNames.map((m) => (
                    <th key={m}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {cantPorMes.map((v, i) => (
                    <td key={i}>{v}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {selected.countPeriodo && (
          <section className="w-full">
            <h2 className="text-base text-center font-semibold mb-2">
              Cantidad por Periodo
            </h2>
            <div className="border rounded p-3">
              Total: <strong>{cantPeriodo}</strong>
              <div className="text-xs text-gray-500">
                Rango: {startDate || "-"} a {endDate || "-"}
              </div>
            </div>
          </section>
        )}

        {selected.countAnual && (
          <section className="w-full col-span-2">
            <h2 className="text-base text-center font-semibold mb-2">
              Cantidad por Año
            </h2>
            <table className="dashboard-table min-w-full table-auto text-sm rounded border shadow-sm">
              <thead>
                <tr>
                  <th>Año</th>
                  <th>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {cantPorAnio.map((r) => (
                  <tr key={r.year}>
                    <td>{r.year}</td>
                    <td>{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {selected.canceladasMensual && (
          <section className="w-full col-span-3">
            <h2 className="text-base text-center font-semibold mb-2">
              Canceladas por Mes (Año {year})
            </h2>
            <table className="dashboard-table min-w-full table-auto text-sm rounded border shadow-sm">
              <thead>
                <tr>
                  {monthNames.map((m) => (
                    <th key={m}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {canceladasPorMes.map((v, i) => (
                    <td key={i}>{v}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {selected.canceladasPeriodo && (
          <section className="w-full">
            <h2 className="text-base text-center font-semibold mb-2">
              Canceladas por Periodo
            </h2>
            <div className="border rounded p-3">
              Total: <strong>{canceladasPeriodo}</strong>
              <div className="text-xs text-gray-500">
                Rango: {startDate || "-"} a {endDate || "-"}
              </div>
            </div>
          </section>
        )}

        {selected.canceladasAnual && (
          <section className="w-full col-span-2">
            <h2 className="text-base text-center font-semibold mb-2">
              Canceladas por Año
            </h2>
            <table className="dashboard-table min-w-full table-auto text-sm rounded border shadow-sm">
              <thead>
                <tr>
                  <th>Año</th>
                  <th>Canceladas</th>
                </tr>
              </thead>
              <tbody>
                {canceladasPorAnio.map((r) => (
                  <tr key={r.year}>
                    <td>{r.year}</td>
                    <td>{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {selected.pagadasMensual && (
          <section className="w-full col-span-3">
            <h2 className="text-base text-center font-semibold mb-2">
              Pagas por Mes (Año {year})
            </h2>
            <table className="dashboard-table min-w-full table-auto text-sm rounded border shadow-sm">
              <thead>
                <tr>
                  {monthNames.map((m) => (
                    <th key={m}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {pagadasPorMes.map((v, i) => (
                    <td key={i}>{v}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {selected.pagadasPeriodo && (
          <section className="w-full">
            <h2 className="text-base text-center font-semibold mb-2">
              Pagas por Periodo
            </h2>
            <div className="border rounded p-3">
              Total: <strong>{pagadasPeriodo}</strong>
              <div className="text-xs text-gray-500">
                Rango: {startDate || "-"} a {endDate || "-"}
              </div>
            </div>
          </section>
        )}

        {selected.pagadasAnual && (
          <section className="w-full col-span-2">
            <h2 className="text-base text-center font-semibold mb-2">
              Pagas por Año
            </h2>
            <table className="dashboard-table min-w-full table-auto text-sm rounded border shadow-sm">
              <thead>
                <tr>
                  <th>Año</th>
                  <th>Pagas</th>
                </tr>
              </thead>
              <tbody>
                {pagadasPorAnio.map((r) => (
                  <tr key={r.year}>
                    <td>{r.year}</td>
                    <td>{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {selected.noPagadasMensual && (
          <section className="w-full col-span-3">
            <h2 className="text-base text-center font-semibold mb-2">
              No Pagas por Mes (Año {year})
            </h2>
            <table className="dashboard-table min-w-full table-auto text-sm rounded border shadow-sm">
              <thead>
                <tr>
                  {monthNames.map((m) => (
                    <th key={m}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {noPagadasPorMes.map((v, i) => (
                    <td key={i}>{v}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {selected.noPagadasPeriodo && (
          <section className="w-full justify-center">
            <h2 className="text-base text-center font-semibold mb-2">
              No Pagas por Periodo
            </h2>
            <div className="border rounded p-3">
              Total: <strong>{noPagadasPeriodo}</strong>
              <div className="text-xs text-gray-500">
                Rango: {startDate || "-"} a {endDate || "-"}
              </div>
            </div>
          </section>
        )}

        {selected.noPagadasAnual && (
          <section className="w-full col-span-2">
            <h2 className="text-base text-center font-semibold mb-2">
              No Pagas por Año
            </h2>
            <table className="dashboard-table min-w-full table-auto text-sm rounded border shadow-sm">
              <thead>
                <tr>
                  <th>Año</th>
                  <th>No Pagas</th>
                </tr>
              </thead>
              <tbody>
                {noPagadasPorAnio.map((r) => (
                  <tr key={r.year}>
                    <td>{r.year}</td>
                    <td>{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {selected.topPickUp && (
          <section className="w-full">
            <h2 className="text-base text-center font-semibold mb-2">
              Top Lugares (PickUp)
            </h2>
            <table className="dashboard-table min-w-full table-auto text-sm rounded border shadow-sm">
              <thead>
                <tr>
                  <th>Lugar</th>
                  <th>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {topPickUps.map((r) => (
                  <tr key={r.name}>
                    <td className="max-w-xs overflow-x-auto">{r.name}</td>
                    <td>{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {selected.topDropOff && (
          <section className="w-full">
            <h2 className="text-base text-center font-semibold mb-2">
              Top Lugares (DropOff)
            </h2>
            <table className="dashboard-table min-w-full table-auto text-sm rounded border shadow sm">
              <thead>
                <tr>
                  <th>Lugar</th>
                  <th>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {topDropOffs.map((r) => (
                  <tr key={r.name}>
                    <td className="max-w-xs overflow-x-auto">{r.name}</td>
                    <td>{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {selected.topProveedores && (
          <section className="w-full col-span-1">
            <h2 className="text-base text-center font-semibold mb-2">
              Top Proveedores
            </h2>
            <table className="dashboard-table min-w-full table-auto text-sm rounded border shadow-sm">
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {topProveedores.map((r) => (
                  <tr key={r.name}>
                    <td className="max-w-xs overflow-x-auto">{r.name}</td>
                    <td>{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {selected.topHoras && (
          <section className="w-full col-span-3">
            <h2 className="text-base text-center font-semibold mb-2">
              Top Horas
            </h2>
            <table className="dashboard-table min-w-full table-auto text-sm rounded border shadow-sm">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {topHorasList.map((r) => (
                  <tr key={r.hour}>
                    <td>{hourLabel12(r.hour)}</td>
                    <td>{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  );
}
