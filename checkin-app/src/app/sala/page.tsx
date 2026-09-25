"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { etiquetaEstado } from "@/lib/cola";
import { playLlamadoChime } from "@/lib/llamado-sound";

type Item = {
  id: string;
  codigoTurno: string;
  salaEspera: string;
  estado: string;
  fechaHora: string;
  nombre: string;
  apellido: string;
};

const CENTRO = process.env.NEXT_PUBLIC_CENTRO_NOMBRE ?? "Centro Médico";

function ordenarActivos(items: Item[]) {
  const rank: Record<string, number> = { llamado: 0, en_atencion: 1, en_espera: 2 };
  return [...items].sort((a, b) => {
    const d = (rank[a.estado] ?? 9) - (rank[b.estado] ?? 9);
    if (d !== 0) return d;
    return new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime();
  });
}

export default function SalaPage() {
  const [items, setItems] = useState<Item[]>([]);
  const vistoLlamados = useRef<Set<string> | null>(null);

  async function load() {
    const response = await fetch("/api/check-ins", { cache: "no-store" });
    if (!response.ok) return;
    const rows = (await response.json()) as Item[];
    const activos = rows.filter(
      (row) => row.estado === "llamado" || row.estado === "en_atencion" || row.estado === "en_espera",
    );
    const llamadosIds = new Set(activos.filter((row) => row.estado === "llamado").map((row) => row.id));

    if (vistoLlamados.current === null) {
      vistoLlamados.current = llamadosIds;
    } else {
      const nuevos = [...llamadosIds].filter((id) => !vistoLlamados.current?.has(id));
      if (nuevos.length > 0) {
        void playLlamadoChime().catch(() => undefined);
      }
      vistoLlamados.current = llamadosIds;
    }

    setItems(activos);
  }

  useEffect(() => {
    void load().catch(() => undefined);
    const id = window.setInterval(() => {
      void load().catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(id);
  }, []);

  const ordenados = useMemo(() => ordenarActivos(items), [items]);
  const llamados = ordenados.filter((item) => item.estado === "llamado");
  const resto = ordenados.filter((item) => item.estado !== "llamado");

  return (
    <div className="min-h-dvh bg-[#0b1220] px-6 py-6 text-white sm:px-10 sm:py-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-300">{CENTRO}</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-5xl">Turnos en sala</h1>
        </div>
        <p className="text-lg text-slate-400">Acercate al mostrador cuando te llamen</p>
      </header>

      {llamados.length > 0 ? (
        <section className="mb-8 space-y-4">
          {llamados.map((item) => (
            <article
              key={item.id}
              className="animate-pulse rounded-[32px] bg-[#2563EB] px-8 py-10 shadow-[0_20px_60px_rgba(37,99,235,0.45)]"
            >
              <p className="text-lg font-semibold uppercase tracking-[0.25em] text-blue-100">Llamando</p>
              <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                <p className="text-6xl font-extrabold leading-none sm:text-8xl">{item.codigoTurno}</p>
                <div className="text-right">
                  <p className="text-3xl font-bold sm:text-4xl">
                    {item.nombre} {item.apellido}
                  </p>
                  <p className="mt-2 text-xl text-blue-100">{item.salaEspera}</p>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="mb-8 rounded-[32px] border border-slate-700 bg-slate-900/60 px-8 py-12 text-center">
          <p className="text-2xl font-semibold text-slate-300">Nadie está siendo llamado</p>
          <p className="mt-2 text-slate-500">Aguardar en la sala de espera</p>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Cola activa</h2>
        {resto.length === 0 && llamados.length === 0 ? (
          <p className="text-xl text-slate-500">No hay pacientes en espera.</p>
        ) : resto.length === 0 ? (
          <p className="text-xl text-slate-500">No hay más turnos en cola.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {resto.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/80 px-5 py-4"
              >
                <div>
                  <p className="text-2xl font-bold">{item.codigoTurno}</p>
                  <p className="text-lg text-slate-300">
                    {item.nombre} {item.apellido}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-400">{etiquetaEstado(item.estado)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
