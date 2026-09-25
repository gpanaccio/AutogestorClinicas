# Autogestor de clínicas — Check-in médico por QR

Web app de autogestión para que el paciente registre su llegada desde el celular (Nombre, Apellido, DNI y foto), reciba un número de turno y aparezca en la cola de recepción.

## Cómo correrlo en local

No hace falta instalar PostgreSQL. En desarrollo usa **SQLite**.

```bash
cd checkin-app
copy .env.example .env
npm install
npx prisma db push
npx prisma db seed
npm run dev
```

`db push` crea la tabla `PalabraProhibida`. El seed carga la lista de insultos (idempotente: se puede repetir). En Vercel pasa lo mismo en cada deploy.

Abrí:

- Check-in del paciente: http://localhost:3000
- Código QR: http://localhost:3000/qr
- Monitor de sala (TV): http://localhost:3000/sala
- Cola de recepción: http://localhost:3000/recepcion (PIN `2580`, configurable en `RECEPCION_PIN`)

La cámara pide permiso **recién en el paso 2**. En desktop, Chrome/Edge funcionan; en HTTP local a veces hay que usar `localhost` (no la IP).

## Deploy en la nube (solo Vercel, sin Neon)

No hace falta cuenta de Neon. Usás **GitHub** (ya está) y **Vercel** (gratis, con Google o GitHub, sin tarjeta).

1. Entrá a [vercel.com/signup](https://vercel.com/signup) → **Continue with GitHub**.
2. **Add New… → Project** → importá `gpanaccio/AutogestorClinicas`.
3. **Root Directory:** `checkin-app` (importante: la app no está en la raíz).
4. Antes de Deploy, creá la base: **Storage → Create Database → Postgres** (lo ofrece Vercel; por detrás es Neon, pero no abrís cuenta ahí).
5. En **Settings → Environment Variables** deberían aparecer `POSTGRES_URL` / `DATABASE_URL`. Si solo ves `POSTGRES_URL`, agregá:
   - `DATABASE_URL` = el mismo valor que `POSTGRES_URL`
   - `NEXT_PUBLIC_CENTRO_NOMBRE` = `Centro Médico`
   - `RECEPCION_PIN` = PIN de 4 dígitos para `/recepcion` (ej. `2580`)
6. Deploy. Cuando tengas la URL (`https://algo.vercel.app`), agregá `NEXT_PUBLIC_APP_URL` con esa URL y redesplegá para que el QR apunte bien.

En local seguís con SQLite (`npm run dev`). En Vercel el build usa `schema.prod.prisma` (PostgreSQL) solo.

La foto se comprime a WebP (~800px) en el navegador. En el MVP se guarda como data URL en la base (archivos chicos). Para un volumen real, conviene S3/Cloudinary y guardar solo la URI.

El HIS está **mockeado**: el paciente recibe el turno al instante y la notificación se registra en segundo plano.
