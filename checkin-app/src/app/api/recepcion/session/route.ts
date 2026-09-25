import { NextResponse } from "next/server";
import { haySesionRecepcion } from "@/lib/recepcion-auth";

export async function GET() {
  const ok = await haySesionRecepcion();
  return NextResponse.json({ ok }, { status: ok ? 200 : 401 });
}
