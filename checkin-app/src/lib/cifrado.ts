import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "crypto";

const PREFIJO_DET = "enc1d:";
const PREFIJO_RND = "enc1r:";

function clave(): Buffer {
  const secreto = process.env.ENCRYPTION_KEY;
  if (!secreto) {
    throw new Error("Falta ENCRYPTION_KEY en las variables de entorno.");
  }
  return createHash("sha256").update(secreto).digest();
}

function empaquetar(prefijo: string, iv: Buffer, tag: Buffer, datos: Buffer) {
  return prefijo + Buffer.concat([iv, tag, datos]).toString("base64");
}

function cifrarConIv(texto: string, iv: Buffer, prefijo: string) {
  const cipher = createCipheriv("aes-256-gcm", clave(), iv);
  const datos = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  return empaquetar(prefijo, iv, cipher.getAuthTag(), datos);
}

/** Mismo texto → mismo cifrado. Sirve para buscar por DNI sin guardar el DNI en claro. */
export function cifrarDeterministico(texto: string) {
  const iv = createHmac("sha256", clave()).update(`iv:${texto}`).digest().subarray(0, 12);
  return cifrarConIv(texto, iv, PREFIJO_DET);
}

export function cifrar(texto: string) {
  return cifrarConIv(texto, randomBytes(12), PREFIJO_RND);
}

export function estaCifrado(valor: string) {
  return valor.startsWith(PREFIJO_DET) || valor.startsWith(PREFIJO_RND);
}

export function descifrar(valor: string) {
  if (!estaCifrado(valor)) return valor;

  const prefijo = valor.startsWith(PREFIJO_DET) ? PREFIJO_DET : PREFIJO_RND;
  const raw = Buffer.from(valor.slice(prefijo.length), "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const datos = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", clave(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(datos), decipher.final()]).toString("utf8");
}

export function descifrarPaciente<T extends { dni: string; nombre: string; apellido: string }>(paciente: T) {
  return {
    ...paciente,
    dni: descifrar(paciente.dni),
    nombre: descifrar(paciente.nombre),
    apellido: descifrar(paciente.apellido),
  };
}
