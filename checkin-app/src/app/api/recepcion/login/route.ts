import { NextResponse } from "next/server";
import { cookieSesionOptions, pinEsValido, RECEPCION_COOKIE, recepcionToken } from "@/lib/recepcion-auth";

export async function POST(request: Request) {
  const body = (await request.json()) as { pin?: string };
  const pin = (body.pin ?? "").trim();
  if (!pinEsValido(pin)) {
    return NextResponse.json({ error: "PIN incorrecto." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(RECEPCION_COOKIE, recepcionToken(), cookieSesionOptions());
  return response;
}
