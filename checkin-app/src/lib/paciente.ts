import { prisma } from "./prisma";
import { cifrar, cifrarDeterministico } from "./cifrado";

export async function upsertPacienteCifrado(datos: {
  dni: string;
  nombre: string;
  apellido: string;
}) {
  const dniCifrado = cifrarDeterministico(datos.dni);
  const existente =
    (await prisma.paciente.findUnique({ where: { dni: dniCifrado } })) ??
    (await prisma.paciente.findUnique({ where: { dni: datos.dni } }));

  const payload = {
    dni: dniCifrado,
    nombre: cifrar(datos.nombre),
    apellido: cifrar(datos.apellido),
  };

  if (existente) {
    return prisma.paciente.update({ where: { id: existente.id }, data: payload });
  }
  return prisma.paciente.create({ data: payload });
}
