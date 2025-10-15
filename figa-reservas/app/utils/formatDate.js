export function formatDate(fecha) {
  if (!fecha) return "";
  const [year, month, day] = fecha.split("-");
  return `${day}-${month}-${year}`;
}
