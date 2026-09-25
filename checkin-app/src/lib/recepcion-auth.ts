import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const RECEPCION_COOKIE = "recepcion_session";

export function getRecepcionPin() {
  return process.env.RECEPCION_PIN?.trim() || "2580";
}

export function recepcionToken() {
  return createHmac("sha256", getRecepcionPin()).update("autogestor-recepcion").digest("hex");
}

export function pinEsValido(input: string) {
  const expected = getRecepcionPin();
  const a = Buffer.from(input.normalize("NFC"));
  const b = Buffer.from(expected.normalize("NFC"));
  if (a.length !== b.length) {
    timingSafeEqual(Buffer.alloc(32, 1), Buffer.alloc(32, 2));
    return false;
  }
  return timingSafeEqual(a, b);
}

export async function haySesionRecepcion() {
  const jar = await cookies();
  const value = jar.get(RECEPCION_COOKIE)?.value;
  if (!value) return false;
  const expected = Buffer.from(recepcionToken());
  const got = Buffer.from(value);
  if (got.length !== expected.length) return false;
  return timingSafeEqual(got, expected);
}

export function cookieSesionOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  };
}
