import { prisma } from "@/lib/prisma";

export function normalizarTexto(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/3/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/[$5]/g, "s")
    .replace(/7/g, "t")
    .replace(/(.)\1{2,}/g, "$1$1")
    .replace(/[^a-z\s-]/g, " ")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function contieneInsulto(value: string, insultos: Iterable<string>) {
  const lista = insultos instanceof Set ? insultos : new Set(insultos);
  const normalizado = normalizarTexto(value);
  if (!normalizado || lista.size === 0) return false;

  const compacto = normalizado.replace(/\s+/g, "");
  if (lista.has(normalizado) || lista.has(compacto)) return true;

  const palabras = normalizado.split(" ").filter(Boolean);
  if (palabras.some((palabra) => lista.has(palabra))) return true;

  const pegado = palabras.join("");
  for (const insulto of lista) {
    if (insulto.length >= 4 && pegado.includes(insulto)) return true;
  }
  return false;
}

export const MENSAJE_INSULTO =
  "El nombre o apellido no puede incluir insultos ni lenguaje ofensivo.";

let cache: { at: number; palabras: string[] } | null = null;
const CACHE_MS = 60_000;

export async function listarPalabrasProhibidas() {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache.palabras;

  const rows = await prisma.palabraProhibida.findMany({
    select: { palabra: true },
  });
  const palabras = rows.map((row) => row.palabra);
  cache = { at: now, palabras };
  return palabras;
}
