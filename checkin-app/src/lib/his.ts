import { prisma } from "./prisma";

type HisPayload = {
  checkInId: string;
  dni: string;
  nombre: string;
  apellido: string;
  codigoTurno: string;
  fechaHora: Date;
};

export async function notificarHis(payload: HisPayload) {
  await new Promise((resolve) => setTimeout(resolve, 250));
  console.info("[HIS mock] ingreso notificado", payload);
  await prisma.checkIn.update({
    where: { id: payload.checkInId },
    data: { hisNotificado: true },
  });
}
