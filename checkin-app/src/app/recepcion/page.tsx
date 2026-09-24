"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Item = {
  id: string;
  codigoTurno: string;
  salaEspera: string;
  estado: string;
  fechaHora: string;
  hisNotificado: boolean;
  nombre: string;
  apellido: string;
  dni: string;
  fotoDataUrl: string;
};

export default function RecepcionPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const response = await fetch("/api/check-ins", { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudo cargar la cola");
      setItems((await response.json()) as Item[]);
      setError("");
    } catch {
      setError("Error al leer la cola de atención.");
    }
  }

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="min-h-dvh bg-[#F8FAFC] px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#2563EB]">Recepción</p>
            <h1 className="text-2xl font-bold text-slate-900">Cola de atención de hoy</h1>
          </div>
          <div className="flex gap-3 text-sm font-medium">
            <Link className="text-slate-500 hover:text-[#2563EB]" href="/">
              Check-in
            </Link>
            <Link className="text-slate-500 hover:text-[#2563EB]" href="/qr">
              Código QR
            </Link>
          </div>
        </div>

        {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">
            Todavía no hay ingresos registrados.
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.fotoDataUrl}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">
                    {item.nombre} {item.apellido}
                  </p>
                  <p className="text-sm text-slate-500">
                    DNI {item.dni} · {item.salaEspera}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(item.fechaHora).toLocaleTimeString("es-AR", {
                      timeZone: "America/Argentina/Buenos_Aires",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {item.hisNotificado ? " · HIS notificado" : " · sincronizando HIS..."}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-[#2563EB]">{item.codigoTurno}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-400">{item.estado}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
