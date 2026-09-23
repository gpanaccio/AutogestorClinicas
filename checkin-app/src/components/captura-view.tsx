"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadFiliacion } from "@/lib/filiacion";
import { captureAndCompress, measureBrightness } from "@/lib/image";
import { PhoneShell, PrimaryButton } from "@/components/phone-shell";

export function CapturaView() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const probeRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [listo, setListo] = useState(false);
  const [buenaLuz, setBuenaLuz] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const filiacion = loadFiliacion();
    if (!filiacion) {
      router.replace("/");
      return;
    }

    let cancelled = false;
    let interval: number | undefined;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 960 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setListo(true);
        }
        interval = window.setInterval(() => {
          const video = videoRef.current;
          const probe = probeRef.current;
          if (!video || !probe || video.readyState < 2) return;
          probe.width = 80;
          probe.height = 80;
          const ctx = probe.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(video, 0, 0, 80, 80);
          setBuenaLuz(measureBrightness(probe) > 70);
        }, 500);
      } catch {
        setError("No pudimos acceder a la cámara. Habilitá el permiso e intentá de nuevo.");
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      if (interval) window.clearInterval(interval);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [router]);

  async function registrar() {
    const filiacion = loadFiliacion();
    const video = videoRef.current;
    if (!filiacion || !video) return;
    setEnviando(true);
    setError("");
    try {
      const fotoDataUrl = captureAndCompress(video);
      const response = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...filiacion,
          fotoDataUrl,
          consentimiento: sessionStorage.getItem("checkin-consentimiento") === "true",
        }),
      });
      const data = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !data.id) {
        throw new Error(data.error ?? "No se pudo registrar el ingreso.");
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      router.push(`/pase/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar.");
      setEnviando(false);
    }
  }

  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col px-5 pb-6 pt-5">
        <div className="mb-5 flex items-center justify-between text-sm">
          <Link href="/" className="font-medium text-[#2563EB]">
            ← Volver
          </Link>
          <span className="text-slate-400">Paso 2 de 2</span>
        </div>

        <h1 className="text-[1.65rem] font-bold tracking-tight text-slate-900">
          Validación de Identidad
        </h1>
        <p className="mt-1 text-sm text-slate-500">Centrá tu rostro dentro del marco iluminado</p>

        <div className="relative mx-auto mt-6 aspect-[3/4] w-full max-w-[320px] overflow-hidden rounded-[28px] bg-[#0b1220]">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="h-full w-full scale-x-[-1] object-cover"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[78%] w-[72%] rounded-[50%] border-2 border-dashed border-sky-400/90" />
          </div>
          <div className="absolute bottom-4 left-1/2 w-max -translate-x-1/2 rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white">
            {buenaLuz ? "✦ Buena iluminación detectada" : "Buscá un lugar con más luz"}
          </div>
        </div>
        <canvas ref={probeRef} className="hidden" />

        {error ? <p className="mt-4 text-center text-sm text-red-600">{error}</p> : null}

        <div className="mt-auto pt-6">
          <PrimaryButton disabled={!listo || enviando} onClick={() => void registrar()}>
            {enviando ? "Registrando..." : "📸 Tomar Foto y Registrar"}
          </PrimaryButton>
        </div>
      </div>
    </PhoneShell>
  );
}
