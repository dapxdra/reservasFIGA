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