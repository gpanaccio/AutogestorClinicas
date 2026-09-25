"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";
import { formatFechaHoraArgentina } from "@/lib/timezone";

type Props = {
  centro: string;
  nombre: string;
  dni: string;
  codigoTurno: string;
  salaEspera: string;
  fechaHora: string;
  fotoDataUrl: string;
};

async function toJpeg(dataUrl: string) {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo leer la foto"));
    img.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar la foto");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function DownloadComprobanteButton(props: Props) {
  const [busy, setBusy] = useState(false);

  async function descargar() {
    setBusy(true);
    try {
      const doc = new jsPDF({ unit: "mm", format: "a5", orientation: "portrait" });
      const pageW = doc.internal.pageSize.getWidth();

      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageW, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(props.centro, 14, 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Comprobante de check-in", 14, 20);

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Registro de llegada", 14, 42);

      try {
        const jpeg = await toJpeg(props.fotoDataUrl);
        doc.addImage(jpeg, "JPEG", pageW - 42, 34, 26, 26);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(pageW - 42, 34, 26, 26, 3, 3, "S");
      } catch {
        /* ticket still valid without photo */
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text("Paciente", 14, 58);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text(props.nombre, 14, 66);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text(`DNI ${props.dni}`, 14, 73);

      doc.setFillColor(238, 244, 255);
      doc.roundedRect(14, 84, pageW - 28, 42, 4, 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(37, 99, 235);
      doc.text("NUMERO DE TURNO", pageW / 2, 96, { align: "center" });
      doc.setFontSize(32);
      doc.text(props.codigoTurno, pageW / 2, 112, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`Sala: ${props.salaEspera}`, 14, 140);
      doc.text(`Fecha y hora: ${formatFechaHoraArgentina(props.fechaHora)}`, 14, 148);

      doc.setDrawColor(226, 232, 240);
      doc.line(14, 158, pageW - 14, 158);
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      const nota =
        "Presentá este comprobante si recepción lo solicita. No reemplaza una orden médica ni un certificado.";
      doc.text(doc.splitTextToSize(nota, pageW - 28), 14, 166);

      const safeTurno = props.codigoTurno.replace(/[^\w-]+/g, "");
      doc.save(`comprobante-${safeTurno}.pdf`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void descargar()}
      className="mb-3 flex h-14 w-full items-center justify-center rounded-2xl border-2 border-[#2563EB] bg-white text-base font-semibold text-[#2563EB] disabled:opacity-60"
    >
      {busy ? "Generando PDF..." : "Descargar comprobante PDF"}
    </button>
  );
}
