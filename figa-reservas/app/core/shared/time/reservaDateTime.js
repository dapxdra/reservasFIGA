// Fecha/hora de reservas en Costa Rica (compartido cliente/servidor, sin dependencias).

// Costa Rica no tiene horario de verano: UTC-6 todo el año.
const CR_UTC_OFFSET_MIN = 6 * 60;
const MIN_MS = 60 * 1000;

// Acepta "HH:mm", "HH:mm:ss" o "h:mm AM/PM". Devuelve minutos desde 00:00 o null.
export function parseHoraToMinutes(hora) {
  const value = String(hora || "").trim();
  if (!value) return null;

  const match24 = value.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (match24) return Number(match24[1]) * 60 + Number(match24[2]);

  const match12 = value.match(/^([1-9]|1[0-2]):([0-5]\d)\s*([AaPp])\.?\s*[Mm]\.?$/);
  if (match12) {
    const hours = (Number(match12[1]) % 12) + (match12[3].toUpperCase() === "P" ? 12 : 0);
    return hours * 60 + Number(match12[2]);
  }

  return null;
}

/** Instante (ms UTC) de la hora de la reserva en Costa Rica, o null sin fecha/hora válidas. */
export function reservaInicioMs(fecha, hora) {
  const match = String(fecha || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const minutos = parseHoraToMinutes(hora);
  if (!match || minutos == null) return null;
  const medianoche = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return medianoche + (minutos + CR_UTC_OFFSET_MIN) * MIN_MS;
}
