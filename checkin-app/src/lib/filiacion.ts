export const FILIACION_KEY = "checkin-filiacion";

export type Filiacion = {
  nombre: string;
  apellido: string;
  dni: string;
};

export function saveFiliacion(data: Filiacion) {
  sessionStorage.setItem(FILIACION_KEY, JSON.stringify(data));
}

export function loadFiliacion(): Filiacion | null {
  const raw = sessionStorage.getItem(FILIACION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Filiacion;
    if (!parsed.nombre || !parsed.apellido || !parsed.dni) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearFiliacion() {
  sessionStorage.removeItem(FILIACION_KEY);
}
