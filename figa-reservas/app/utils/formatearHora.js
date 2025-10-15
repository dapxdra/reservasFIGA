export function formatearHora(horaStr) {
  if (!horaStr) return "";
  const [hora, minutos] = horaStr.split(":").map(Number);
  const ampm = hora >= 12 ? "pm" : "am";
  const hora12 = hora % 12 === 0 ? 12 : hora % 12;
  return `${hora12}:${minutos.toString().padStart(2, "0")} ${ampm}`;
}
