# Reporte formal de cobertura — antes y después

Medición de la lógica de dominio en `checkin-app/src/lib`.

| | |
| --- | --- |
| Fecha | 25 de septiembre de 2026 |
| Herramienta | Test runner y coverage nativos de Node.js v24.14.1 (`node --test --experimental-test-coverage`) |
| Comando | `npm test` (desde `checkin-app/`) |
| Alcance | DNI, cola, cifrado, insultos, PIN, reglas del detector de rostro, horario de Argentina y persistencia |
| Fuera de alcance | Pantallas React y rutas HTTP de Next.js (se probaron a mano en el navegador y en https://autogestor-clinicas.vercel.app) |

## Resultado

| Métrica | Antes (sin suite) | Después (suite actual) |
| --- | --- | --- |
| Archivos de test | 0 | 1 (`test/dominio.test.ts`) |
| Tests ejecutados | 0 | 21, todos en verde |
| Archivos de `src/lib` medidos | 0 | 14 |
| Cobertura de líneas | 0% | 84,54% |
| Cobertura de ramas | 0% | 97,54% |
| Cobertura de funciones | 0% | 81,82% |

## Cómo se leyó el “antes”

La misma herramienta, corrida cuando todavía no había tests, imprime:

```
ℹ tests 0
ℹ all files | 100.00 | 100.00 | 100.00 |
```

Ese 100% no es cobertura. La tabla de archivos queda vacía: el denominador es cero porque no se ejecutó ningún módulo. La lectura correcta de esa medición es **0%**.

El “después” usa el mismo comando y el mismo filtro (`src/lib/**/*.ts`), con los 14 módulos cargados por la suite.

## Detalle por archivo (después)

| Archivo | Líneas | Ramas | Funciones | Qué queda afuera |
| --- | --- | --- | --- | --- |
| `app-url.ts`, `cifrado.ts`, `cola.ts`, `dni.ts`, `filiacion.ts`, `his.ts`, `paciente.ts`, `timezone.ts` | 100% | 100% | 100% | — |
| `lenguaje.ts` | 100% | 95,24% | 100% | Una rama menor del normalizador |
| `recepcion-auth.ts` | 100% | 92,31% | 100% | Una rama de la comparación de cookie |
| `prisma.ts` | 100% | 50% | 100% | El nivel de log depende de `NODE_ENV` |
| `face.ts` | 74,36% | 100% | 25% | La descarga de BlazeFace desde el CDN solo corre en el navegador. Las reglas (un rostro, tamaño, centrado) sí están cubiertas |
| `image.ts` | 9,68% | — | 0% | Canvas del navegador (compresión WebP) |
| `llamado-sound.ts` | 18,18% | — | 0% | Web Audio API (sonido de la sala) |

`image.ts` y `llamado-sound.ts` bajan el promedio a propósito: se los incluye en el denominador aunque no se pueden ejecutar en Node. No se los excluyó para inflar el número.
