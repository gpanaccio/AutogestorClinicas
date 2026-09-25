import { NextResponse } from "next/server";
import { listarPalabrasProhibidas } from "@/lib/lenguaje";

export async function GET() {
  const palabras = await listarPalabrasProhibidas();
  return NextResponse.json({ palabras });
}
