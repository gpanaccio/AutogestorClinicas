export const ARGENTINA_TZ = "America/Argentina/Buenos_Aires";

/** Inicio del día calendario en Argentina (00:00 ART), en UTC. */
export function startOfTodayArgentina(now = new Date()) {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: ARGENTINA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  return new Date(`${ymd}T00:00:00-03:00`);
}
