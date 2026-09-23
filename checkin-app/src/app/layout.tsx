import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Check-in médico",
  description: "Autogestión de llegada de pacientes por código QR",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className={`${font.className} min-h-full bg-[#F8FAFC] text-slate-900`}>{children}</body>
    </html>
  );
}
