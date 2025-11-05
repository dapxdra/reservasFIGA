/**
 * Retorna la fecha de "hoy" en Costa Rica en formato YYYY-MM-DD
 * Evita problemas de zona horaria al usar UTC
 */
export function getTodayCR() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Costa_Rica",
  });
}
