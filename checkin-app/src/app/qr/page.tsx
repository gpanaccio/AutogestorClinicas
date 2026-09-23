import QRCode from "qrcode";
import Link from "next/link";
import { getAppUrl, getCentroNombre } from "@/lib/app-url";

export const dynamic = "force-dynamic";

export default async function QrPage() {
  const checkInUrl = `${getAppUrl()}/`;
  const qr = await QRCode.toDataURL(checkInUrl, {
    width: 360,
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#F8FAFC] px-4 py-10">
      <div className="w-full max-w-md rounded-[28px] bg-white p-8 text-center shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
        <p className="text-sm font-medium text-[#2563EB]">{getCentroNombre()}</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Escaneá para registrarte</h1>
        <p className="mt-2 text-sm text-slate-500">
          Mostrá este código en recepción o en una pantalla. El paciente abre el check-in en el
          navegador, sin instalar nada.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="Código QR de check-in" className="mx-auto mt-6 h-64 w-64" />
        <p className="mt-4 break-all text-xs text-slate-400">{checkInUrl}</p>
        <div className="mt-6 flex justify-center gap-4 text-sm font-medium">
          <Link className="text-[#2563EB]" href="/">
            Ir al check-in
          </Link>
          <Link className="text-slate-500" href="/recepcion">
            Ver recepción
          </Link>
        </div>
      </div>
    </div>
  );
}
