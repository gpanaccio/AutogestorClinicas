"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { accionesDeEstado, etiquetaEstado, type EstadoCola } from "@/lib/cola";

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

const ORDEN: Record<string, number> = {
  en_atencion: 0,
  llamado: 1,
  en_espera: 2,
  atendido: 3,
};

function ordenarCola(items: Item[]) {
  return [...items].sort((a, b) => {
    const rank = (ORDEN[a.estado] ?? 9) - (ORDEN[b.estado] ?? 9);
    if (rank !== 0) return rank;
    const ta = new Date(a.fechaHora).getTime();
    const tb = new Date(b.fechaHora).getTime();
    if (a.estado === "atendido") return tb - ta;
    return ta - tb;
  });
}

function badgeClass(estado: string) {
  switch (estado) {
    case "llamado":
      return "bg-blue-100 text-[#2563EB]";
    case "en_atencion":
      return "bg-amber-100 text-amber-800";
    case "atendido":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default function RecepcionPage() {
  const [auth, setAuth] = useState<"loading" | "pin" | "ok">("loading");
  const [pin, setPin] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  async function checkSession() {
    const response = await fetch("/api/recepcion/session", { cache: "no-store" });
    setAuth(response.ok ? "ok" : "pin");
  }

  useEffect(() => {
    void checkSession();
  }, []);

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
    if (auth !== "ok") return;
    void load();
    const id = window.setInterval(() => {
      if (!busyId) void load();
    }, 4000);
    return () => window.clearInterval(id);
  }, [auth, busyId]);

  async function entrar(event: FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/recepcion/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (!response.ok) {
      setError("PIN incorrecto.");
      return;
    }
    setPin("");
    setAuth("ok");
  }

  async function salir() {
    await fetch("/api/recepcion/logout", { method: "POST" });
    setItems([]);
    setAuth("pin");
  }

  async function cambiarEstado(id: string, estado: EstadoCola) {
    setBusyId(id);
    setError("");
    const previous = items;
    setItems((current) => current.map((item) => (item.id === id ? { ...item, estado } : item)));
    try {
      const response = await fetch(`/api/check-ins/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      const data = (await response.json()) as Item & { error?: string };
      if (!response.ok) {
        setItems(previous);
        throw new Error(data.error ?? "No se pudo actualizar el turno.");
      }
      setItems((current) => current.map((item) => (item.id === id ? { ...item, ...data } : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el turno.");
    } finally {
      setBusyId("");
    }
  }

  const ordenados = useMemo(() => ordenarCola(items), [items]);
  const siguienteEsperaId = ordenados.find((item) => item.estado === "en_espera")?.id;
  const activos = ordenados.filter((item) => item.estado !== "atendido");
  const atendidos = ordenados.filter((item) => item.estado === "atendido");

  if (auth === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F8FAFC] text-slate-500">
        Cargando...
      </div>
    );
  }

  if (auth === "pin") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F8FAFC] px-4">
        <form
          onSubmit={(event) => void entrar(event)}
          className="w-full max-w-sm rounded-[28px] bg-white p-8 shadow-[0_20px_50px_rgba(15,23,42,0.08)]"
        >
          <p className="text-sm font-medium text-[#2563EB]">Recepción</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Ingresá el PIN</h1>
          <p className="mt-2 text-sm text-slate-500">Solo personal de mostrador.</p>
          <input
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            className="mt-6 h-14 w-full rounded-xl border border-slate-200 px-4 text-center text-2xl tracking-[0.4em] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
          />
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            className="mt-6 flex h-14 w-full items-center justify-center rounded-2xl bg-[#2563EB] text-base font-semibold text-white"
          >
            Entrar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#F8FAFC] px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#2563EB]">Recepción</p>
            <h1 className="text-2xl font-bold text-slate-900">Cola de atención de hoy</h1>
            <p className="mt-1 text-sm text-slate-500">
              Llamá al siguiente, atendelo en el mostrador y finalizá cuando termine.
            </p>
          </div>
          <div className="flex gap-3 text-sm font-medium">
            <Link className="text-slate-500 hover:text-[#2563EB]" href="/sala">
              Monitor sala
            </Link>
            <Link className="text-slate-500 hover:text-[#2563EB]" href="/">
              Check-in
            </Link>
            <Link className="text-slate-500 hover:text-[#2563EB]" href="/qr">
              Código QR
            </Link>
            <button type="button" onClick={() => void salir()} className="text-slate-500 hover:text-red-600">
              Salir
            </button>
          </div>
        </div>

        {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">
            Todavía no hay ingresos registrados.
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Cola activa
              </h2>
              {activos.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
                  No hay pacientes en espera.
                </p>
              ) : (
                <ul className="space-y-3">
                  {activos.map((item) => (
                    <FilaTurno
                      key={item.id}
                      item={item}
                      destacado={item.id === siguienteEsperaId}
                      busy={busyId === item.id}
                      onCambiar={cambiarEstado}
                    />
                  ))}
                </ul>
              )}
            </section>

            {atendidos.length > 0 ? (
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Atendidos hoy
                </h2>
                <ul className="space-y-3">
                  {atendidos.map((item) => (
                    <FilaTurno
                      key={item.id}
                      item={item}
                      destacado={false}
                      busy={false}
                      onCambiar={cambiarEstado}
                    />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function FilaTurno({
  item,
  destacado,
  busy,
  onCambiar,
}: {
  item: Item;
  destacado: boolean;
  busy: boolean;
  onCambiar: (id: string, estado: EstadoCola) => void;
}) {
  const acciones = accionesDeEstado(item.estado);

  return (
    <li
      className={`rounded-2xl border bg-white p-4 shadow-sm ${
        destacado ? "border-[#2563EB] ring-2 ring-[#2563EB]/20" : "border-slate-100"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.fotoDataUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
          <div className="min-w-0 flex-1">
            {destacado ? (
              <p className="text-xs font-semibold uppercase tracking-wide text-[#2563EB]">Siguiente</p>
            ) : null}
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
        </div>

        <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end">
          <div className="text-right">
            <p className="text-2xl font-extrabold text-[#2563EB]">{item.codigoTurno}</p>
            <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(item.estado)}`}>
              {etiquetaEstado(item.estado)}
            </span>
          </div>
        </div>
      </div>

      {acciones.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {acciones.map((accion) => (
            <button
              key={accion.to}
              type="button"
              disabled={busy}
              onClick={() => onCambiar(item.id, accion.to)}
              className={
                accion.kind === "primary"
                  ? "flex h-12 min-w-[8rem] flex-1 items-center justify-center rounded-xl bg-[#2563EB] px-4 text-base font-semibold text-white disabled:opacity-60 sm:flex-none"
                  : "flex h-12 min-w-[8rem] flex-1 items-center justify-center rounded-xl border border-slate-200 px-4 text-base font-semibold text-slate-600 disabled:opacity-60 sm:flex-none"
              }
            >
              {busy ? "..." : accion.label}
            </button>
          ))}
        </div>
      ) : null}
    </li>
  );
}
