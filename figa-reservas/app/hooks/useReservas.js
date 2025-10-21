import { useState, useEffect } from "react";
import { getReservas } from "../lib/api";

// Detecta formatos comunes
const isDMY = (s) => typeof s === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(s);
const isYMD = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

// Normaliza cualquier fecha a 'YYYY-MM-DD' en zona CR sin “mover” fechas-solas
function toCRYmd(dateLike, tz = "America/Costa_Rica") {
  if (dateLike == null) return "";

  // Si es 'DD/MM/YYYY' => a 'YYYY-MM-DD' directo
  if (isDMY(dateLike)) {
    const [dd, mm, yyyy] = dateLike.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }

  // Si ya es 'YYYY-MM-DD' (fecha-sola), úsalo tal cual (no crear Date)
  if (isYMD(dateLike)) return dateLike;

  // Si es ISO con medianoche UTC/offset => tomar solo la parte de fecha
  if (typeof dateLike === "string") {
    // 2025-10-21T00:00:00Z | 2025-10-21T00:00:00.000Z | 2025-10-21T00:00:00+00:00 | 2025-10-21T00:00:00-06:00
    const m = dateLike.match(
      /^(\d{4}-\d{2}-\d{2})T0{1,2}:\d{2}(:\d{2}(\.\d{3})?)?(Z|[+-]\d{2}:\d{2})?$/
    );
    if (m) {
      return m[1]; // YYYY-MM-DD (trátalo como fecha-sola)
    }
  }

  // Firestore Timestamp { seconds, nanoseconds }
  if (typeof dateLike === "object" && dateLike?.seconds != null) {
    const d = new Date(dateLike.seconds * 1000);
    const f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return f.format(d);
  }

  // Para Date, timestamp o ISO con hora real, formatear en zona CR
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (isNaN(d)) return "";
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return f.format(d); // YYYY-MM-DD
}

// Suma días a un YMD sin perder el día (trabaja en UTC y vuelve a YMD CR)
function addDaysYmd(ymd, days) {
  const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
  const utc = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10); // YYYY-MM-DD (sin efectos de zona)
}

export function useReservas(filtro, searchQuery, filters) {
  const [reservas, setReservas] = useState([]);
  const [filteredReservas, setFilteredReservas] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const data = await getReservas({ filtro, searchQuery, ...filters });
      setReservas(Array.isArray(data) ? data : []);
    }
    fetchData();
  }, [filtro, searchQuery, filters]);

  useEffect(() => {
    // Base inicial
    let base = [...reservas];

    // Hoy y mañana en CR usando YMD estable
    const todayStr = toCRYmd(new Date(), "America/Costa_Rica");
    const tomorrowStr = addDaysYmd(todayStr, 1);

    // Si el filtro principal es canceladas, trabajar solo con canceladas
    if (filtro === "canceladas") {
      base = base.filter((r) => r.cancelada);
    }

    // 1) Filtros avanzados SIEMPRE sobre la base
    let advanced = base.filter((r) => true);

    if (filters.startDate) {
      const sd = toCRYmd(filters.startDate);
      advanced = advanced.filter((r) => toCRYmd(r.fecha) >= sd);
    }
    if (filters.endDate) {
      const ed = toCRYmd(filters.endDate);
      advanced = advanced.filter((r) => toCRYmd(r.fecha) <= ed);
    }
    if (filters.month) {
      const mFilter = parseInt(filters.month, 10);
      advanced = advanced.filter(
        (r) => parseInt(toCRYmd(r.fecha).slice(5, 7), 10) === mFilter
      );
    }
    if (filters.cliente) {
      const q = filters.cliente.toLowerCase();
      advanced = advanced.filter((r) => r.cliente?.toLowerCase().includes(q));
    }
    if (filters.proveedor) {
      const q = filters.proveedor.toLowerCase();
      advanced = advanced.filter((r) => r.proveedor?.toLowerCase().includes(q));
    }
    if (filters.itinId) {
      advanced = advanced.filter(
        (r) => r.itinId?.toString() === filters.itinId
      );
    }
    if (filters.id) {
      advanced = advanced.filter((r) => r.id?.toString() === filters.id);
    }

    // 2) Búsqueda
    if (searchQuery && searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const searchBase =
        filtro === "canceladas"
          ? advanced
          : advanced.filter((r) => !r.cancelada);
      setFilteredReservas(
        searchBase.filter(
          (r) =>
            r.id?.toString().toLowerCase().includes(q) ||
            r.itinId?.toString().toLowerCase().includes(q) ||
            r.cliente?.toLowerCase().includes(q) ||
            r.proveedor?.toLowerCase().includes(q)
        )
      );
      return;
    }

    // 3) Filtro principal sobre advanced
    let result = [...advanced];
    if (filtro === "activas") {
      // Mostrar hoy y mañana (inclusive), excluyendo canceladas
      result = result.filter((r) => {
        const ymd = toCRYmd(r.fecha);
        return ymd >= todayStr && ymd <= tomorrowStr && !r.cancelada;
      });
    } else if (filtro === "futuras") {
      result = result.filter(
        (r) => toCRYmd(r.fecha) > tomorrowStr && !r.cancelada
      );
    } else if (filtro === "antiguas") {
      result = result.filter(
        (r) => toCRYmd(r.fecha) < todayStr && !r.cancelada
      );
    } else if (filtro === "canceladas") {
      result = result.filter((r) => r.cancelada);
    }

    setFilteredReservas(result);
  }, [reservas, filtro, searchQuery, filters]);

  return { reservas, filteredReservas, setReservas };
}
