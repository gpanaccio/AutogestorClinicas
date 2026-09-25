# Autogestor de clínicas — Check-in médico por QR

Web app de autogestión para centros médicos. El paciente escanea un QR en la recepción, carga sus datos desde el celular (nombre, apellido, DNI y foto validada con detección de rostro), recibe un número de turno y aparece en la cola de recepción. Recepción llama al paciente y el monitor de la sala lo muestra con aviso sonoro.

## Demo en Vercel

| Pantalla | URL |
| --- | --- |
| Check-in del paciente | https://autogestor-clinicas.vercel.app |
| Código QR para imprimir | https://autogestor-clinicas.vercel.app/qr |
| Monitor de sala (TV) | https://autogestor-clinicas.vercel.app/sala |
| Cola de recepción (con PIN) | https://autogestor-clinicas.vercel.app/recepcion (PIN por defecto 7874)|

Cada push a `main` en GitHub ([gpanaccio/AutogestorClinicas](https://github.com/gpanaccio/AutogestorClinicas)) dispara un deploy automático en Vercel.

## Flujo

1. **Bienvenida** (`/`): nombre, apellido, DNI (formato `42.137.994`) y consentimiento de datos. Se rechazan nombres con insultos.
2. **Captura** (`/captura`): la cámara frontal valida que haya un solo rostro centrado y toma la foto.
3. **Pase** (`/pase/[id]`): número de turno (`A-1`, `A-2`…), sala de espera asignada y comprobante en PDF.
4. **Recepción** (`/recepcion`): cola del día con los estados *En espera → Llamado → En atención → Atendido*.
5. **Sala** (`/sala`): pantalla para TV que se actualiza cada 2 segundos y suena cuando se llama a alguien.

Los horarios y el "día" de la cola usan la zona horaria de Argentina (`America/Argentina/Buenos_Aires`).

## Stack

- **Next.js 16** (App Router, Turbopack) con **React 19** y **TypeScript**
- **Tailwind CSS 4**
- **Prisma 6** como ORM
- **SQLite** en local y **PostgreSQL** en producción
- **MediaPipe Tasks Vision** para detección de rostro en el navegador
- **jsPDF** para el comprobante y **qrcode** para generar el QR

## Base de datos y ORM

Se usa **Prisma** como ORM, con dos schemas equivalentes:

- `prisma/schema.prisma`: **SQLite** (`file:./dev.db`). Es el que se usa en local; no hace falta instalar nada.
- `prisma/schema.prod.prisma`: **PostgreSQL**. Es el que usa Vercel. La base es **Vercel Postgres** (Neon por detrás), creada desde el panel de Vercel sin abrir cuenta en Neon.

Tablas:

| Tabla | Para qué |
| --- | --- |
| `Paciente` | DNI, nombre y apellido (cifrados). Un paciente por DNI. |
| `CheckIn` | Cada llegada: foto (cifrada), turno, sala, estado de la cola, fecha y si se notificó al HIS. |
| `PalabraProhibida` | Lista de insultos que no se aceptan en nombre o apellido. |

La tabla `PalabraProhibida` se llena con `prisma/seed.js` a partir de `prisma/palabras-prohibidas.json`. El seed usa `upsert`, así que se puede correr varias veces sin duplicar filas. Para sumar palabras, agregalas al JSON y volvé a correr el seed (o hacé deploy).

El HIS (sistema de historia clínica) está **mockeado** en `src/lib/his.ts`: el paciente recibe el turno al instante y la notificación se registra en segundo plano.

## Cifrado de datos sensibles

Nombre, apellido, DNI y foto se guardan **cifrados en la base** con **AES-256-GCM** (`src/lib/cifrado.ts`). La clave se deriva de la variable `ENCRYPTION_KEY` (SHA-256).

- **DNI**: cifrado determinístico (el IV sale de un HMAC del propio DNI). El mismo DNI siempre da el mismo texto cifrado, así se puede buscar al paciente sin guardar el número en claro.
- **Nombre, apellido y foto**: cifrado con IV aleatorio. El mismo valor da un texto cifrado distinto cada vez.
- Los valores cifrados llevan prefijo (`enc1d:` o `enc1r:`). La app los descifra al mostrarlos en recepción, sala, pase y comprobante.
- Los datos que ya estaban en claro se siguen leyendo. Los datos del paciente se cifran la próxima vez que esa persona hace check-in.

Importante:

- Si cambiás `ENCRYPTION_KEY`, los registros existentes **no se pueden descifrar**. Guardala en un lugar seguro.
- No es cifrado de punta a punta: protege la base (un dump o acceso directo a la DB no muestra los datos), pero el servidor con la clave sí los ve.

Otras medidas:

- `/recepcion` pide un **PIN** (`RECEPCION_PIN`). Se guarda una cookie `httpOnly` firmada con HMAC que dura 8 horas. Solo con esa sesión se puede cambiar el estado de un turno.
- El filtro de insultos corre en el formulario y se vuelve a validar en el servidor.

## Detector de rostro (imagen del paciente)

La validación corre **en el navegador del paciente**; la imagen no se manda a ningún servicio externo para detectar el rostro. Está en `src/lib/face.ts` y `src/components/captura-view.tsx`.

- **Librería**: [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/face_detector) `@mediapipe/tasks-vision@1.0.1`, cargada desde jsDelivr en tiempo de ejecución (su bundle usa imports dinámicos que Turbopack no puede empaquetar).
- **Modelo**: **BlazeFace short range** (`blaze_face_short_range.tflite`, float16), pensado para rostros cercanos a la cámara frontal. Se descarga de Google Storage.
- **Ejecución**: modo `VIDEO`, intenta usar **GPU** y si falla cae a **CPU**. Analiza un frame cada 280 ms.

Reglas para habilitar el botón "Tomar foto":

- Confianza mínima de detección: **0,62**.
- Debe haber **un solo rostro**.
- El rostro tiene que ocupar al menos el **20 %** del encuadre ("Acercá un poco más el rostro").
- Tiene que estar **centrado** en el óvalo ("Centrá el rostro en el óvalo").
- Al tocar el botón se vuelve a validar el frame antes de enviar.

También se mide el brillo promedio de la zona central. Si es bajo aparece "Buscá un lugar con más luz" (es un aviso, no bloquea).

La foto se captura del video, se escala a **800 px** como máximo y se comprime en **WebP (calidad 0,72)**. Se envía como data URL (máx. ~1,2 MB) y se guarda cifrada en la base. Para mucho volumen convendría moverla a un storage (S3, Cloudinary) y guardar solo la referencia.

Para que funcione la cámara hace falta HTTPS o `localhost`, y conexión a internet (para bajar MediaPipe y el modelo).

## Cómo levantar el proyecto en local

Requisitos: **Node.js 20+** y npm. No hace falta instalar PostgreSQL.

La app vive en la carpeta `checkin-app/`. Los comandos de npm se corren **desde ahí**, no desde la raíz del repo (en la raíz no hay `package.json`).

```bash
git clone https://github.com/gpanaccio/AutogestorClinicas.git
cd AutogestorClinicas/checkin-app
copy .env.example .env      # en macOS/Linux: cp .env.example .env
npm install
npm run db:push             # crea las tablas en SQLite y corre el seed
npm run dev
```

Editá `.env` y poné un valor propio en `ENCRYPTION_KEY` antes de cargar datos.

Abrí:

- Check-in: http://localhost:3000
- QR: http://localhost:3000/qr
- Sala: http://localhost:3000/sala
- Recepción: http://localhost:3000/recepcion (PIN por defecto `2580`)

Para probar desde el celular en la misma red, usá la URL "Network" que muestra `npm run dev`. Ojo: por HTTP en una IP, algunos navegadores bloquean la cámara.

### Variables de entorno

| Variable | Ejemplo | Uso |
| --- | --- | --- |
| `DATABASE_URL` | `file:./dev.db` | Conexión a la base (SQLite local o Postgres en Vercel). |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | URL pública; la usa el QR. |
| `NEXT_PUBLIC_CENTRO_NOMBRE` | `Centro Médico` | Nombre que se muestra en pantallas y PDF. |
| `RECEPCION_PIN` | `2580` | PIN de `/recepcion`. |
| `ENCRYPTION_KEY` | secreto largo aleatorio | Clave para cifrar datos del paciente. |

## Cómo deployarlo en Vercel

1. Entrá a [vercel.com](https://vercel.com/signup) con tu cuenta de GitHub.
2. **Add New… → Project** e importá `gpanaccio/AutogestorClinicas`.
3. En **Root Directory** poné `checkin-app` (la app no está en la raíz).
4. En **Storage → Create Database → Postgres**, creá la base y conectala al proyecto. Vercel agrega `POSTGRES_URL` y en general también `DATABASE_URL`.
5. En **Settings → Environment Variables**, agregá:
   - `DATABASE_URL`: el mismo valor que `POSTGRES_URL` (si no apareció solo).
   - `NEXT_PUBLIC_CENTRO_NOMBRE`: por ejemplo `Centro Médico`.
   - `RECEPCION_PIN`: un PIN propio.
   - `ENCRYPTION_KEY`: un secreto largo y aleatorio (no lo cambies una vez que haya datos).
   - `NEXT_PUBLIC_APP_URL`: la URL del proyecto, por ejemplo `https://autogestor-clinicas.vercel.app`.
6. **Deploy**. Si agregaste o cambiaste variables después del primer deploy, hacé **Redeploy**.

Vercel usa el script `vercel-build`, que hace todo solo en cada deploy:

```bash
prisma generate --schema=prisma/schema.prod.prisma   # cliente de Prisma para Postgres
prisma db push --schema=prisma/schema.prod.prisma    # crea o actualiza las tablas
prisma db seed                                       # carga las palabras prohibidas
next build
```

No hay migraciones: `db push` sincroniza la base con el schema. Si cambiás un modelo, actualizá **los dos** schemas (`schema.prisma` y `schema.prod.prisma`).

## Comandos

Desde `checkin-app/`:

| Comando | Qué hace |
| --- | --- |
| `npm install` | Instala dependencias y genera el cliente de Prisma (`postinstall`). |
| `npm run dev` | Servidor de desarrollo en http://localhost:3000. |
| `npm run build` | Genera el cliente de Prisma y compila para producción. |
| `npm run start` | Levanta el build de producción. |
| `npm run lint` | Corre ESLint. |
| `npm run db:push` | Crea o actualiza las tablas y corre el seed. |
| `npm run db:seed` | Solo el seed de palabras prohibidas. |
| `npx prisma studio` | Explorador visual de la base (los datos sensibles se ven cifrados). |
| `npm run vercel-build` | Build que usa Vercel (Postgres + seed + build). |

Si en Windows `npx prisma generate` falla con `EPERM`, cortá `npm run dev` y volvé a correrlo: el servidor tiene tomado el motor de Prisma.

## Estructura

```
checkin-app/
├─ prisma/
│  ├─ schema.prisma             # SQLite (local)
│  ├─ schema.prod.prisma        # PostgreSQL (Vercel)
│  ├─ seed.js                   # carga palabras prohibidas
│  └─ palabras-prohibidas.json
└─ src/
   ├─ app/
   │  ├─ page.tsx               # bienvenida / datos
   │  ├─ captura/               # foto + detector de rostro
   │  ├─ pase/[id]/             # turno + comprobante PDF
   │  ├─ recepcion/             # cola con PIN
   │  ├─ sala/                  # monitor TV
   │  ├─ qr/                    # QR para imprimir
   │  └─ api/                   # check-in, cola, PIN, palabras prohibidas
   ├─ components/
   └─ lib/                      # cifrado, face, lenguaje, cola, prisma, timezone…
```
