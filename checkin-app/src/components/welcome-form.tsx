"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDni, isValidDni } from "@/lib/dni";
import { contieneInsulto, MENSAJE_INSULTO } from "@/lib/lenguaje";
import { saveFiliacion } from "@/lib/filiacion";
import { PhoneShell, PrimaryButton } from "@/components/phone-shell";

const CENTRO = process.env.NEXT_PUBLIC_CENTRO_NOMBRE ?? "Centro Médico";

export function WelcomeForm() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [dni, setDni] = useState("");
  const [consentimiento, setConsentimiento] = useState(false);
  const [error, setError] = useState("");
  const [prohibidas, setProhibidas] = useState<string[]>([]);

  useEffect(() => {
    void fetch("/api/palabras-prohibidas")
      .then((response) => response.json())
      .then((data: { palabras?: string[] }) => {
        if (Array.isArray(data.palabras)) setProhibidas(data.palabras);
      })
      .catch(() => undefined);
  }, []);

  const canContinue = useMemo(
    () => nombre.trim().length > 1 && apellido.trim().length > 1 && isValidDni(dni) && consentimiento,
    [nombre, apellido, dni, consentimiento],
  );

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canContinue) {
      setError("Completá los datos y aceptá el consentimiento para continuar.");
      return;
    }
    if (contieneInsulto(nombre, prohibidas) || contieneInsulto(apellido, prohibidas)) {
      setError(MENSAJE_INSULTO);
      return;
    }
    saveFiliacion({
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      dni,
    });
    sessionStorage.setItem("checkin-consentimiento", "true");
    router.push("/captura");
  }

  return (
    <PhoneShell>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col px-6 pb-6 pt-8">
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2563EB] text-xl font-bold text-white">
              +
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">{CENTRO}</p>
              <p className="text-sm text-slate-500">Autogestión de Pacientes</p>
            </div>
          </div>
        </header>

        <h1 className="text-[2rem] font-bold leading-tight tracking-tight text-slate-900">
          ¡Bienvenido!
        </h1>
        <p className="mt-2 text-base text-slate-500">
          Ingresá tus datos para registrar tu llegada
        </p>

        <div className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">Nombre</span>
            <input
              autoComplete="given-name"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none ring-[#2563EB] placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2"
              placeholder="Juan"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">Apellido</span>
            <input
              autoComplete="family-name"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none ring-[#2563EB] placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2"
              placeholder="Pérez"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">DNI / Documento</span>
            <input
              inputMode="numeric"
              autoComplete="off"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none ring-[#2563EB] placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2"
              placeholder="38.450.123"
              value={dni}
              onChange={(e) => setDni(formatDni(e.target.value))}
            />
          </label>
        </div>

        <label className="mt-5 flex items-start gap-3 text-sm leading-5 text-slate-600">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-[#2563EB]"
            checked={consentimiento}
            onChange={(e) => setConsentimiento(e.target.checked)}
          />
          <span>
            Acepto el tratamiento de mis datos personales e imagen conforme a la Ley N° 25.326
            de Protección de Datos Personales.
          </span>
        </label>

        <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">Proceso rápido</p>
          <p className="mt-1 text-sm text-amber-800/80">
            En el siguiente paso validaremos tu rostro con la cámara.
          </p>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <div className="mt-auto pt-8">
          <PrimaryButton type="submit" disabled={!canContinue}>
            Continuar →
          </PrimaryButton>
        </div>
      </form>
    </PhoneShell>
  );
}
