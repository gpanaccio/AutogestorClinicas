import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatDni } from "@/lib/dni";
import { startOfTodayArgentina } from "@/lib/timezone";

export async function GET() {
  const startOfDay = startOfTodayArgentina();

  const rows = await prisma.checkIn.findMany({
    where: { fechaHora: { gte: startOfDay } },
    include: { paciente: true },
    orderBy: { fechaHora: "desc" },
  });

  return NextResponse.json(
    rows.map((row) => ({
      id: row.id,
      codigoTurno: row.codigoTurno,
      salaEspera: row.salaEspera,
      estado: row.estado,
      fechaHora: row.fechaHora,
      hisNotificado: row.hisNotificado,
      nombre: row.paciente.nombre,
      apellido: row.paciente.apellido,
      dni: formatDni(row.paciente.dni),
      fotoDataUrl: row.fotoDataUrl,
    })),
  );
}
