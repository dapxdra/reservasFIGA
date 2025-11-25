// Normaliza a 'YYYY-MM-DD'
function toYMD(dateLike, tz = "America/Costa_Rica") {
  if (dateLike == null) return "";
  if (typeof dateLike === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateLike))
    return dateLike;
  if (typeof dateLike === "string") {
    const m = dateLike.match(
      /^(\d{4}-\d{2}-\d{2})T0{1,2}:\d{2}(:\d{2}(\.\d{3})?)?(Z|[+-]\d{2}:\d{2})?$/
    );
    if (m) return m[1];
  }
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
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (isNaN(d)) return "";
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return f.format(d);
}

export function normalizePrecio(p) {
  const n = typeof p === "string" ? parseFloat(p.replace(",", ".")) : Number(p);
  return Number.isFinite(n) ? n : 0;
}

export function filterByDateRange(reservas, { startDate, endDate }) {
  const sd = startDate ? toYMD(startDate) : null;
  const ed = endDate ? toYMD(endDate) : null;
  return reservas.filter((r) => {
    const ymd = toYMD(r.fecha);
    if (!ymd) return false;
    if (sd && ymd < sd) return false;
    if (ed && ymd > ed) return false;
    return true;
  });
}

export function yearOf(ymd) {
  return ymd?.slice(0, 4);
}
export function monthIndex(ymd) {
  return Math.max(0, Math.min(11, parseInt(ymd.slice(5, 7), 10) - 1));
}

export function sumPrecioByMonth(reservas, year) {
  const out = new Array(12).fill(0);
  reservas.forEach((r) => {
    if (r.cancelada) return; // Solo no canceladas
    const ymd = toYMD(r.fecha);
    if (!ymd) return;
    if (year && yearOf(ymd) !== String(year)) return;
    out[monthIndex(ymd)] += normalizePrecio(r.precio);
  });
  return out; // índice 0..11
}

export function sumPrecioByPeriod(reservas, startDate, endDate) {
  const filtered = filterByDateRange(reservas, { startDate, endDate });
  return filtered.reduce(
    (acc, r) => (r.cancelada ? acc : acc + normalizePrecio(r.precio)),
    0
  );
}

export function sumPrecioByYear(reservas) {
  const map = {};
  reservas.forEach((r) => {
    if (r.cancelada) return; // Solo no canceladas
    const ymd = toYMD(r.fecha);
    if (!ymd) return;
    const y = yearOf(ymd);
    map[y] = (map[y] || 0) + normalizePrecio(r.precio);
  });
  return Object.entries(map)
    .map(([year, total]) => ({ year, total }))
    .sort((a, b) => a.year.localeCompare(b.year));
}

export function countsByMonth(reservas, year) {
  const out = new Array(12).fill(0);
  reservas.forEach((r) => {
    if (r.cancelada) return; // Solo no canceladas
    const ymd = toYMD(r.fecha);
    if (!ymd) return;
    if (year && yearOf(ymd) !== String(year)) return;
    out[monthIndex(ymd)] += 1;
  });
  return out;
}

export function countByPeriod(reservas, startDate, endDate) {
  return filterByDateRange(reservas, { startDate, endDate }).filter(
    (r) => !r.cancelada
  ).length;
}

export function countsByYear(reservas) {
  const map = {};
  reservas.forEach((r) => {
    if (r.cancelada) return; // Solo no canceladas
    const ymd = toYMD(r.fecha);
    if (!ymd) return;
    const y = yearOf(ymd);
    map[y] = (map[y] || 0) + 1;
  });
  return Object.entries(map)
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year.localeCompare(b.year));
}

export function topValues(reservas, key, limit = 10) {
  const map = {};
  reservas.forEach((r) => {
    const val = (r?.[key] || "").toString().trim();
    if (!val) return;
    map[val] = (map[val] || 0) + 1;
  });
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function topHours(reservas, limit = 10) {
  const map = {};
  reservas.forEach((r) => {
    const h = (r?.hora || "").toString().slice(0, 2); // HH de HH:mm
    if (!h || isNaN(Number(h))) return;
    map[h] = (map[h] || 0) + 1;
  });
  return Object.entries(map)
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// Cantidad de canceladas por mes (de un año específico)
export function canceladasByMonth(reservas, year) {
  const out = new Array(12).fill(0);
  reservas.forEach((r) => {
    if (!r.cancelada) return; // Solo canceladas
    const ymd = toYMD(r.fecha);
    if (!ymd) return;
    if (year && yearOf(ymd) !== String(year)) return;
    out[monthIndex(ymd)] += 1;
  });
  return out; // índice 0..11
}

// Cantidad de canceladas en un periodo específico
export function canceladasByPeriod(reservas, startDate, endDate) {
  const filtered = filterByDateRange(reservas, { startDate, endDate });
  return filtered.filter((r) => r.cancelada).length;
}

// Cantidad de canceladas por año (global)
export function canceladasByYear(reservas) {
  const map = {};
  reservas.forEach((r) => {
    if (!r.cancelada) return; // Solo canceladas
    const ymd = toYMD(r.fecha);
    if (!ymd) return;
    const y = yearOf(ymd);
    map[y] = (map[y] || 0) + 1;
  });
  return Object.entries(map)
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year.localeCompare(b.year));
}

export function hourLabel12(hour) {
  const n = typeof hour === "string" ? parseInt(hour, 10) : Number(hour);
  if (!Number.isFinite(n)) return String(hour ?? "");
  const h12 = n % 12 === 0 ? 12 : n % 12;
  const period = n < 12 ? "am" : "pm";
  return `${h12}:00 ${period}`;
}

export function pagadasByMonth(reservas, year) {
  const out = new Array(12).fill(0);
  reservas.forEach((r) => {
    if (r.cancelada) return; // Solo no canceladas
    if (!r.pago) return; // Solo pagas
    const ymd = toYMD(r.fecha);
    if (!ymd) return;
    if (year && yearOf(ymd) !== String(year)) return;
    out[monthIndex(ymd)] += 1;
  });
  return out; // índice 0..11
}

export function noPagadasByMonth(reservas, year) {
  const out = new Array(12).fill(0);
  reservas.forEach((r) => {
    if (r.cancelada) return; // Solo no canceladas
    if (r.pago) return; // Solo NO pagas
    const ymd = toYMD(r.fecha);
    if (!ymd) return;
    if (year && yearOf(ymd) !== String(year)) return;
    out[monthIndex(ymd)] += 1;
  });
  return out; // índice 0..11
}

export function pagadasByPeriod(reservas, startDate, endDate) {
  const filtered = filterByDateRange(reservas, { startDate, endDate });
  return filtered.filter((r) => !r.cancelada && r.pago).length;
}

export function noPagadasByPeriod(reservas, startDate, endDate) {
  const filtered = filterByDateRange(reservas, { startDate, endDate });
  return filtered.filter((r) => !r.cancelada && !r.pago).length;
}

export function pagadasByYear(reservas) {
  const map = {};
  reservas.forEach((r) => {
    if (r.cancelada) return; // Solo no canceladas
    if (!r.pago) return; // Solo pagas
    const ymd = toYMD(r.fecha);
    if (!ymd) return;
    const y = yearOf(ymd);
    map[y] = (map[y] || 0) + 1;
  });
  return Object.entries(map)
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year.localeCompare(b.year));
}

export function noPagadasByYear(reservas) {
  const map = {};
  reservas.forEach((r) => {
    if (r.cancelada) return; // Solo no canceladas
    if (r.pago) return; // Solo NO pagas
    const ymd = toYMD(r.fecha);
    if (!ymd) return;
    const y = yearOf(ymd);
    map[y] = (map[y] || 0) + 1;
  });
  return Object.entries(map)
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year.localeCompare(b.year));
}
