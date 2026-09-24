import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidDni, onlyDigits } from "@/lib/dni";
import { notificarHis } from "@/lib/his";
import { startOfTodayArgentina } from "@/lib/timezone";

type Body = {
  nombre?: string;
  apellido?: string;
  dni?: string;
  fotoDataUrl?: string;
  consentimiento?: boolean;
};

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  const nombre = body.nombre?.trim() ?? "";
  const apellido = body.apellido?.trim() ?? "";
  const dni = onlyDigits(body.dni ?? "");
  const fotoDataUrl = body.fotoDataUrl ?? "";
  const consentimiento = Boolean(body.consentimiento);

  if (!nombre || !apellido) {
    return NextResponse.json({ error: "Completá nombre y apellido." }, { status: 400 });
  }
  if (!isValidDni(dni)) {
    return NextResponse.json({ error: "El DNI debe tener 7 u 8 dígitos." }, { status: 400 });
  }
  if (!consentimiento) {
    return NextResponse.json(
      { error: "Tenés que aceptar el tratamiento de datos personales." },
      { status: 400 },
    );
  }
  if (!fotoDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "La foto es inválida." }, { status: 400 });
  }
  if (fotoDataUrl.length > 1_200_000) {
    return NextResponse.json({ error: "La foto es demasiado pesada." }, { status: 400 });
  }

  const startOfDay = startOfTodayArgentina();

  const turnosHoy = await prisma.checkIn.count({
    where: { fechaHora: { gte: startOfDay } },
  });
  const codigoTurno = `A-${turnosHoy + 1}`;
  const salaEspera = turnosHoy % 2 === 0 ? "Sala de Espera 2" : "Sala de Espera 1";

  const paciente = await prisma.paciente.upsert({
    where: { dni },
    create: { dni, nombre, apellido },
    update: { nombre, apellido },
  });

  const checkIn = await prisma.checkIn.create({
    data: {
      pacienteId: paciente.id,
      fotoDataUrl,
      codigoTurno,
      salaEspera,
    },
    include: { paciente: true },
  });

  void notificarHis({
    checkInId: checkIn.id,
    dni: paciente.dni,
    nombre: paciente.nombre,
    apellido: paciente.apellido,
    codigoTurno: checkIn.codigoTurno,
    fechaHora: checkIn.fechaHora,
  }).catch((error) => {
    console.error("[HIS mock] falló la notificación", error);
  });

  return NextResponse.json({
    id: checkIn.id,
    codigoTurno: checkIn.codigoTurno,
    salaEspera: checkIn.salaEspera,
    fechaHora: checkIn.fechaHora,
    nombre: paciente.nombre,
    apellido: paciente.apellido,
    dni: paciente.dni,
    fotoDataUrl: checkIn.fotoDataUrl,
  });
}
