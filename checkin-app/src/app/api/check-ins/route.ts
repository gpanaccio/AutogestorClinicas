import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { descifrar, descifrarPaciente } from "@/lib/cifrado";
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
    rows.map((row) => {
      const paciente = descifrarPaciente(row.paciente);
      return {
        id: row.id,
        codigoTurno: row.codigoTurno,
        salaEspera: row.salaEspera,
        estado: row.estado,
        fechaHora: row.fechaHora,
        hisNotificado: row.hisNotificado,
        nombre: paciente.nombre,
        apellido: paciente.apellido,
        dni: formatDni(paciente.dni),
        fotoDataUrl: descifrar(row.fotoDataUrl),
      };
    }),
  );
}
