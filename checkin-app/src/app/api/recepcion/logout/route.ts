import { NextResponse } from "next/server";
import { RECEPCION_COOKIE } from "@/lib/recepcion-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(RECEPCION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
