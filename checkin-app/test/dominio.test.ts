import assert from "node:assert/strict";

declare global {
  var __cookieRecepcion: { name: string; value: string } | undefined;
}
import { after, describe, test } from "node:test";
import { formatDni, isValidDni, onlyDigits } from "../src/lib/dni";
import {
  accionesDeEstado,
  etiquetaEstado,
  isEstadoCola,
  puedeTransicionar,
} from "../src/lib/cola";
import { formatFechaHoraArgentina, startOfTodayArgentina } from "../src/lib/timezone";
import { getAppUrl, getCentroNombre } from "../src/lib/app-url";
import { evaluateFace } from "../src/lib/face";
import {
  cifrar,
  cifrarDeterministico,
  descifrar,
  descifrarPaciente,
  estaCifrado,
} from "../src/lib/cifrado";
import { contieneInsulto, listarPalabrasProhibidas, normalizarTexto } from "../src/lib/lenguaje";
import { clearFiliacion, loadFiliacion, saveFiliacion } from "../src/lib/filiacion";
import { getRecepcionPin, pinEsValido, recepcionToken, haySesionRecepcion, cookieSesionOptions, RECEPCION_COOKIE } from "../src/lib/recepcion-auth";
import "../src/lib/image";
import "../src/lib/llamado-sound";
import { prisma } from "../src/lib/prisma";
import { upsertPacienteCifrado } from "../src/lib/paciente";
import { notificarHis } from "../src/lib/his";

const memoria = new Map<string, string>();
Object.defineProperty(globalThis, "sessionStorage", {
  configurable: true,
  value: {
    getItem: (clave: string) => memoria.get(clave) ?? null,
    setItem: (clave: string, valor: string) => memoria.set(clave, valor),
    removeItem: (clave: string) => memoria.delete(clave),
    clear: () => memoria.clear(),
    key: () => null,
    get length() {
      return memoria.size;
    },
  },
});

const INSULTOS = ["boludo", "concha", "hdp", "puta"];

describe("DNI", () => {
  test("deja solo dígitos y corta en 8", () => {
    assert.equal(onlyDigits("42.137.994"), "42137994");
    assert.equal(onlyDigits("abc123456789"), "12345678");
  });

  test("formatea 7 y 8 dígitos como el documento", () => {
    assert.equal(formatDni("42137994"), "42.137.994");
    assert.equal(formatDni("1234567"), "1.234.567");
    assert.equal(formatDni("123456"), "123.456");
    assert.equal(formatDni("12"), "12");
  });

  test("acepta 7 u 8 dígitos", () => {
    assert.equal(isValidDni("42.137.994"), true);
    assert.equal(isValidDni("1234567"), true);
    assert.equal(isValidDni("123456"), false);
    assert.equal(isValidDni(""), false);
  });
});

describe("cola de atención", () => {
  test("solo permite las transiciones definidas", () => {
    assert.equal(puedeTransicionar("en_espera", "llamado"), true);
    assert.equal(puedeTransicionar("llamado", "en_atencion"), true);
    assert.equal(puedeTransicionar("llamado", "en_espera"), true);
    assert.equal(puedeTransicionar("en_atencion", "atendido"), true);
    assert.equal(puedeTransicionar("en_atencion", "en_espera"), true);
    assert.equal(puedeTransicionar("atendido", "en_espera"), false);
    assert.equal(puedeTransicionar("en_espera", "atendido"), false);
    assert.equal(puedeTransicionar("no-existe", "llamado"), false);
  });

  test("etiquetas y acciones de cada estado", () => {
    assert.equal(isEstadoCola("llamado"), true);
    assert.equal(isEstadoCola("otro"), false);
    assert.equal(etiquetaEstado("en_espera"), "En espera");
    assert.equal(etiquetaEstado("llamado"), "Llamado");
    assert.equal(etiquetaEstado("en_atencion"), "En atención");
    assert.equal(etiquetaEstado("atendido"), "Atendido");
    assert.equal(etiquetaEstado("raro"), "raro");
    assert.equal(accionesDeEstado("en_espera")[0]?.label, "Llamar");
    assert.equal(accionesDeEstado("llamado").length, 2);
    assert.equal(accionesDeEstado("en_atencion")[0]?.to, "atendido");
    assert.deepEqual(accionesDeEstado("atendido"), []);
  });
});

describe("horario Argentina", () => {
  test("el día empieza a las 00:00 ART, no a las 00:00 UTC", () => {
    const casiMedianoche = startOfTodayArgentina(new Date("2026-09-25T02:30:00.000Z"));
    assert.equal(casiMedianoche.toISOString(), "2026-09-24T03:00:00.000Z");
    const mediodia = startOfTodayArgentina(new Date("2026-09-25T15:00:00.000Z"));
    assert.equal(mediodia.toISOString(), "2026-09-25T03:00:00.000Z");
  });

  test("formatea fecha y hora en es-AR", () => {
    const texto = formatFechaHoraArgentina("2026-09-25T15:00:00.000Z");
    assert.match(texto, /25/);
    assert.match(texto, /12/);
  });
});

describe("URL y centro", () => {
  test("usa la URL pública, Vercel o localhost", () => {
    const previa = process.env.NEXT_PUBLIC_APP_URL;
    const vercel = process.env.VERCEL_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://autogestor-clinicas.vercel.app/";
    assert.equal(getAppUrl(), "https://autogestor-clinicas.vercel.app");
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.VERCEL_URL = "preview.vercel.app";
    assert.equal(getAppUrl(), "https://preview.vercel.app");
    delete process.env.VERCEL_URL;
    assert.equal(getAppUrl(), "http://localhost:3000");
    if (previa) process.env.NEXT_PUBLIC_APP_URL = previa;
    if (vercel) process.env.VERCEL_URL = vercel;
  });

  test("nombre del centro con valor por defecto", () => {
    const previa = process.env.NEXT_PUBLIC_CENTRO_NOMBRE;
    delete process.env.NEXT_PUBLIC_CENTRO_NOMBRE;
    assert.equal(getCentroNombre(), "Centro Médico");
    process.env.NEXT_PUBLIC_CENTRO_NOMBRE = "Clínica Norte";
    assert.equal(getCentroNombre(), "Clínica Norte");
    if (previa) process.env.NEXT_PUBLIC_CENTRO_NOMBRE = previa;
    else delete process.env.NEXT_PUBLIC_CENTRO_NOMBRE;
  });
});

describe("detector de rostro", () => {
  test("rechaza encuadre vacío, sin rostro, más de uno o sin caja", () => {
    assert.equal(evaluateFace([], 0, 0).message, "Esperando la cámara...");
    assert.equal(evaluateFace([], 640, 480).ok, false);
    assert.equal(evaluateFace([{ boundingBox: box(0, 0, 10, 10) }, { boundingBox: box(20, 20, 10, 10) }], 100, 100).message, "Debe verse una sola persona");
    assert.equal(evaluateFace([{}], 100, 100).ok, false);
  });

  test("pide acercar o centrar, y acepta un rostro válido", () => {
    assert.match(evaluateFace([{ boundingBox: box(40, 40, 10, 10) }], 200, 200).message, /Acercá/);
    assert.match(evaluateFace([{ boundingBox: box(0, 0, 80, 80) }], 400, 400).message, /Centrá/);
    const ok = evaluateFace([{ boundingBox: box(150, 120, 200, 200) }], 500, 500);
    assert.equal(ok.ok, true);
    assert.equal(ok.message, "Rostro detectado");
  });
});

function box(originX: number, originY: number, width: number, height: number) {
  return { originX, originY, width, height };
}

describe("cifrado", () => {
  test("exige clave", () => {
    const previa = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    assert.throws(() => cifrar("Ana"), /ENCRYPTION_KEY/);
    process.env.ENCRYPTION_KEY = previa;
  });

  test("el DNI cifrado es estable y el resto no; se puede volver a leer", () => {
    process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "clave-de-prueba";
    const dni = cifrarDeterministico("42137994");
    assert.equal(dni, cifrarDeterministico("42137994"));
    assert.equal(estaCifrado(dni), true);
    assert.notEqual(cifrar("Ana"), cifrar("Ana"));
    assert.equal(descifrar(cifrar("Ana Pérez")), "Ana Pérez");
    assert.equal(descifrar("texto-en-claro"), "texto-en-claro");
    assert.equal(estaCifrado("texto-en-claro"), false);
    const paciente = descifrarPaciente({
      id: "1",
      dni,
      nombre: cifrar("Lucía"),
      apellido: cifrar("Fernández"),
    });
    assert.equal(paciente.dni, "42137994");
    assert.equal(paciente.nombre, "Lucía");
    assert.equal(paciente.apellido, "Fernández");
    assert.equal(paciente.id, "1");
  });
});

describe("lenguaje", () => {
  test("normaliza acentos y reemplazos", () => {
    assert.equal(normalizarTexto("B0lúdo"), "boludo");
    assert.equal(normalizarTexto("  B0lúd@@@  "), "boludaa");
    assert.equal(normalizarTexto(""), "");
  });

  test("detecta insulto exacto, separado o pegado, y no un nombre parecido", () => {
    assert.equal(contieneInsulto("", INSULTOS), false);
    assert.equal(contieneInsulto("Ana", []), false);
    assert.equal(contieneInsulto("Boludo", INSULTOS), true);
    assert.equal(contieneInsulto("hdp", INSULTOS), true);
    assert.equal(contieneInsulto("Juan Boludo Pérez", INSULTOS), true);
    assert.equal(contieneInsulto("xxboludoyy", INSULTOS), true);
    assert.equal(contieneInsulto("Analía", INSULTOS), false);
    assert.equal(contieneInsulto("Concepción", ["concha"]), false);
  });

  test("lee la lista persistida y usa la caché", async () => {
    const primera = await listarPalabrasProhibidas();
    const segunda = await listarPalabrasProhibidas();
    assert.ok(primera.includes("boludo"));
    assert.equal(segunda, primera);
  });
});

describe("filiación en el navegador", () => {
  test("guarda, lee y descarta datos incompletos o rotos", () => {
    memoria.clear();
    assert.equal(loadFiliacion(), null);
    saveFiliacion({ nombre: "Ana", apellido: "Perez", dni: "42137994" });
    assert.deepEqual(loadFiliacion(), { nombre: "Ana", apellido: "Perez", dni: "42137994" });
    memoria.set("checkin-filiacion", JSON.stringify({ nombre: "Ana" }));
    assert.equal(loadFiliacion(), null);
    memoria.set("checkin-filiacion", "{");
    assert.equal(loadFiliacion(), null);
    clearFiliacion();
    assert.equal(loadFiliacion(), null);
  });
});

describe("PIN de recepción", () => {
  test("acepta el PIN configurado y rechaza otro, aunque sea más corto", () => {
    const pin = getRecepcionPin();
    assert.equal(pinEsValido(pin), true);
    assert.equal(pinEsValido(pin === "0000" ? "1111" : "0000"), false);
    assert.equal(pinEsValido("12"), false);
    assert.equal(recepcionToken().length, 64);
  });

  test("la sesión solo vale con la cookie firmada", async () => {
    globalThis.__cookieRecepcion = undefined;
    assert.equal(await haySesionRecepcion(), false);
    globalThis.__cookieRecepcion = { name: RECEPCION_COOKIE, value: "corta" };
    assert.equal(await haySesionRecepcion(), false);
    globalThis.__cookieRecepcion = { name: RECEPCION_COOKIE, value: recepcionToken() };
    assert.equal(await haySesionRecepcion(), true);
    const entorno = process.env as { NODE_ENV?: string };
    const previa = entorno.NODE_ENV;
    entorno.NODE_ENV = "production";
    assert.equal(cookieSesionOptions().secure, true);
    entorno.NODE_ENV = "development";
    assert.equal(cookieSesionOptions().secure, false);
    assert.equal(cookieSesionOptions().httpOnly, true);
    entorno.NODE_ENV = previa;
  });
});

describe("persistencia cifrada", () => {
  const dni = "99000011";

  after(async () => {
    const cifrados = await prisma.paciente.findMany({ select: { id: true, dni: true } });
    for (const row of cifrados) {
      if (descifrar(row.dni) !== dni) continue;
      await prisma.checkIn.deleteMany({ where: { pacienteId: row.id } });
      await prisma.paciente.delete({ where: { id: row.id } });
    }
    await prisma.$disconnect();
  });

  test("crea y actualiza un paciente sin guardar el DNI en claro", async () => {
    const creado = await upsertPacienteCifrado({ dni, nombre: "Cobertura", apellido: "Inicial" });
    assert.equal(estaCifrado(creado.dni), true);
    assert.equal(descifrar(creado.nombre), "Cobertura");
    const actualizado = await upsertPacienteCifrado({ dni, nombre: "Cobertura", apellido: "Final" });
    assert.equal(creado.id, actualizado.id);
    assert.equal(descifrar(actualizado.apellido), "Final");
  });

  test("la notificación al HIS marca el check-in", async () => {
    const paciente = await upsertPacienteCifrado({ dni, nombre: "Cobertura", apellido: "Final" });
    const checkIn = await prisma.checkIn.create({
      data: {
        pacienteId: paciente.id,
        fotoDataUrl: cifrar("data:image/webp,test"),
        codigoTurno: "T-COV",
        salaEspera: "Sala de Espera 1",
      },
    });
    await notificarHis({
      checkInId: checkIn.id,
      dni,
      nombre: "Cobertura",
      apellido: "Final",
      codigoTurno: checkIn.codigoTurno,
      fechaHora: checkIn.fechaHora,
    });
    const guardado = await prisma.checkIn.findUniqueOrThrow({ where: { id: checkIn.id } });
    assert.equal(guardado.hisNotificado, true);
  });
});
