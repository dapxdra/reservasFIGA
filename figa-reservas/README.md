# FIGA Reservas

Aplicacion de reservas construida con Next.js y Firebase.

## Requisitos

- Node.js 20+
- npm 10+

## Configuracion

1. Copia el archivo de ejemplo de variables:

```bash
cp .env.example .env.local
```

2. Completa las variables Firebase en `.env.local`:

- Cliente (Web SDK): `NEXT_PUBLIC_FIREBASE_*`
- Servidor (Admin SDK): `FIREBASE_SERVICE_ACCOUNT_KEY` en una sola linea JSON

Si faltan variables de cliente, la app muestra un error explicito al iniciar para evitar errores ambiguos de tipo `auth/invalid-api-key`.

## Ejecutar en desarrollo

```bash
npm install
npm run dev
```

## Build y verificacion

```bash
npm run build
```

## Seguridad de dependencias

```bash
npm run audit
npm run audit:fix
npm run audit:ci
```

- `audit:ci` falla solo desde severidad `moderate` en adelante.
- Vulnerabilidades `low` transitivas pueden permanecer hasta que los mantenedores publiquen fixes.

## Recordatorio 24h a conductores

La aplicacion incluye un endpoint para enviar recordatorios 24 horas antes de la reserva:

- Ruta: `/api/notifications/reservas-24h`
- Ejecucion automatica: cada hora via `vercel.json`
- Seguridad: requiere `CRON_SECRET` (Bearer token)

Variables de entorno:

- `CRON_SECRET`: token para proteger la ruta de cron.
- `REMINDER_MIN_HOURS` (opcional, default `23`)
- `REMINDER_MAX_HOURS` (opcional, default `25`)

Para enviar por correo (Resend):

- `RESEND_API_KEY`
- `REMINDER_FROM_EMAIL` (ej: `Reservas FIGA <no-reply@tu-dominio.com>`)

Para enviar por WhatsApp (Twilio):

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM` (ej: `whatsapp:+14155238886`)

Prueba manual local:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/notifications/reservas-24h
```