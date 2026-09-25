import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDni } from "@/lib/dni";
import { getCentroNombre } from "@/lib/app-url";
import { PhoneShell } from "@/components/phone-shell";
import { FinishButton } from "@/components/finish-button";
import { DownloadComprobanteButton } from "@/components/download-comprobante-button";

export const dynamic = "force-dynamic";

export default async function PasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const checkIn = await prisma.checkIn.findUnique({
    where: { id },
    include: { paciente: true },
  });

  if (!checkIn) notFound();

  const nombreCompleto = `${checkIn.paciente.nombre} ${checkIn.paciente.apellido}`;

  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col px-6 pb-6 pt-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-[#16A34A]">
          ✓
        </div>
        <h1 className="mt-5 text-center text-[1.85rem] font-bold tracking-tight text-slate-900">
          ¡Registro Exitoso!
        </h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          Tu ingreso ha sido notificado a recepción
        </p>

        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={checkIn.fotoDataUrl}
            alt={nombreCompleto}
            className="h-14 w-14 rounded-full object-cover"
          />
          <div>
            <p className="font-semibold text-slate-900">{nombreCompleto}</p>
            <p className="text-sm text-slate-500">DNI: {formatDni(checkIn.paciente.dni)}</p>
          </div>
        </div>

        <div className="mt-5 rounded-[28px] bg-[#eef4ff] px-6 py-8 text-center">
          <p className="text-xs font-semibold tracking-[0.18em] text-[#2563EB]">
            TU NÚMERO DE TURNO
          </p>
          <p className="mt-3 text-6xl font-extrabold text-[#2563EB]">{checkIn.codigoTurno}</p>
          <p className="mt-4 text-sm font-medium text-slate-600">
            📍 Aguardá en la {checkIn.salaEspera}
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          Te llamaremos por los monitores del salón
        </p>

        <div className="mt-auto pt-8">
          <DownloadComprobanteButton
            centro={getCentroNombre()}
            nombre={nombreCompleto}
            dni={formatDni(checkIn.paciente.dni)}
            codigoTurno={checkIn.codigoTurno}
            salaEspera={checkIn.salaEspera}
            fechaHora={checkIn.fechaHora.toISOString()}
            fotoDataUrl={checkIn.fotoDataUrl}
          />
          <FinishButton />
        </div>
      </div>
    </PhoneShell>
  );
}
