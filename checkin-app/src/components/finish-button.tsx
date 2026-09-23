"use client";

import Link from "next/link";
import { FILIACION_KEY } from "@/lib/filiacion";

export function FinishButton() {
  return (
    <Link
      href="/"
      onClick={() => {
        sessionStorage.removeItem(FILIACION_KEY);
        sessionStorage.removeItem("checkin-consentimiento");
      }}
      className="flex h-14 w-full items-center justify-center rounded-2xl bg-slate-900 text-base font-semibold text-white"
    >
      Finalizar y Cerrar
    </Link>
  );
}
