import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { descifrar, descifrarPaciente } from "@/lib/cifrado";
import { isEstadoCola, puedeTransicionar } from "@/lib/cola";
import { formatDni } from "@/lib/dni";
import { haySesionRecepcion } from "@/lib/recepcion-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await haySesionRecepcion())) {
    return NextResponse.json({ error: "Ingresá el PIN de recepción." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as { estado?: string };
  const siguiente = body.estado ?? "";

  if (!isEstadoCola(siguiente)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }

  const actual = await prisma.checkIn.findUnique({ where: { id } });
  if (!actual) {
    return NextResponse.json({ error: "No se encontró el registro." }, { status: 404 });
  }
  if (!puedeTransicionar(actual.estado, siguiente)) {
    return NextResponse.json(
      { error: `No se puede pasar de ${actual.estado} a ${siguiente}.` },
      { status: 409 },
    );
  }

  const updated = await prisma.checkIn.update({
    where: { id },
    data: { estado: siguiente },
    include: { paciente: true },
  });

  const paciente = descifrarPaciente(updated.paciente);

  return NextResponse.json({
    id: updated.id,
    codigoTurno: updated.codigoTurno,
    salaEspera: updated.salaEspera,
    estado: updated.estado,
    fechaHora: updated.fechaHora,
    hisNotificado: updated.hisNotificado,
    nombre: paciente.nombre,
    apellido: paciente.apellido,
    dni: formatDni(paciente.dni),
    fotoDataUrl: descifrar(updated.fotoDataUrl),
  });
}
