export const ESTADOS_COLA = ["en_espera", "llamado", "en_atencion", "atendido"] as const;

export type EstadoCola = (typeof ESTADOS_COLA)[number];

const TRANSICIONES: Record<EstadoCola, EstadoCola[]> = {
  en_espera: ["llamado"],
  llamado: ["en_atencion", "en_espera"],
  en_atencion: ["atendido", "en_espera"],
  atendido: [],
};

export function isEstadoCola(value: string): value is EstadoCola {
  return ESTADOS_COLA.includes(value as EstadoCola);
}

export function puedeTransicionar(from: string, to: string) {
  if (!isEstadoCola(from) || !isEstadoCola(to)) return false;
  return TRANSICIONES[from].includes(to);
}

export function etiquetaEstado(estado: string) {
  switch (estado) {
    case "en_espera":
      return "En espera";
    case "llamado":
      return "Llamado";
    case "en_atencion":
      return "En atención";
    case "atendido":
      return "Atendido";
    default:
      return estado;
  }
}

export function accionesDeEstado(estado: string): { to: EstadoCola; label: string; kind: "primary" | "secondary" }[] {
  switch (estado) {
    case "en_espera":
      return [{ to: "llamado", label: "Llamar", kind: "primary" }];
    case "llamado":
      return [
        { to: "en_atencion", label: "Atender", kind: "primary" },
        { to: "en_espera", label: "No se presentó", kind: "secondary" },
      ];
    case "en_atencion":
      return [
        { to: "atendido", label: "Finalizar", kind: "primary" },
        { to: "en_espera", label: "Volver a espera", kind: "secondary" },
      ];
    default:
      return [];
  }
}
