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

## Integracion de reservas desde web externa

Si tu web de compras necesita insertar reservas automaticamente en este sistema, usa el endpoint:

- Ruta: `/api/integrations/reservas`
- Metodo: `POST`
- Seguridad: `Authorization: Bearer <RESERVAS_WEBHOOK_SECRET>` o header `x-webhook-key`
- Firma opcional (recomendada): `x-webhook-timestamp` + `x-webhook-signature` con HMAC SHA-256
- Idempotencia: requiere `externalReservationId` (o `orderId`/`purchaseId`) para evitar duplicados por reintentos

Variable de entorno requerida:

- `RESERVAS_WEBHOOK_SECRET`

Variable opcional recomendada:

- `RESERVAS_WEBHOOK_HMAC_SECRET` (si esta definida, la firma HMAC pasa a ser obligatoria)

Payload minimo sugerido:

```json
{
	"source": "mi-tienda",
	"externalReservationId": "ORDER-2026-0001",
	"cliente": "Juan Perez",
	"fecha": "2026-08-01",
	"hora": "14:30",
	"pickUp": "Aeropuerto SJO",
	"dropOff": "Hotel X",
	"proveedor": "WebStore"
}
```

Campos opcionales soportados: `itinId`, `nota`, `precio`, `AD`, `NI`, `conductorId`, `vehiculoId`, `pago`, `fechaPago`, `cancelada`, `metadata`.

### Mapeo recomendado (web -> FIGA)

| Campo en web externa | Campo en FIGA | Requerido | Nota |
| --- | --- | --- | --- |
| `order.id` | `externalReservationId` | Si | Clave de idempotencia por `source` |
| `order.channel` | `source` | Si | Ej: `shopify`, `woocommerce`, `mi-tienda` |
| `customer.fullName` | `cliente` | Si | Nombre del pasajero o titular |
| `service.date` | `fecha` | Si | Formato `YYYY-MM-DD` |
| `service.time` | `hora` | Si | Formato `HH:mm` |
| `trip.pickup` | `pickUp` | Si | Punto de origen |
| `trip.dropoff` | `dropOff` | Si | Punto de destino |
| `order.vendor` | `proveedor` | No | Nombre del canal/agencia |
| `order.total` | `precio` | No | Numerico |
| `passengers.adults` | `AD` | No | Entero |
| `passengers.children` | `NI` | No | Entero |
| `driver.id` | `conductorId` | No | Si viene preasignado |
| `vehicle.id` | `vehiculoId` | No | Si viene preasignado |
| `payment.paid` | `pago` | No | Booleano |
| `payment.date` | `fechaPago` | No | Fecha de pago |
| `order.notes` | `nota` | No | Texto libre |
| `order.meta` | `metadata` | No | Objeto JSON adicional |

### Firma HMAC (recomendada)

Si defines `RESERVAS_WEBHOOK_HMAC_SECRET`, el endpoint exige:

- `x-webhook-timestamp`: unix epoch en segundos
- `x-webhook-signature`: `sha256=<hex>`

La firma se calcula sobre:

```text
${x-webhook-timestamp}.${rawRequestBody}
```

Con una ventana maxima de 5 minutos para mitigar replay attacks.

Ejemplo curl:

```bash
curl -X POST http://localhost:3000/api/integrations/reservas \
	-H "Content-Type: application/json" \
	-H "Authorization: Bearer $RESERVAS_WEBHOOK_SECRET" \
	-d '{
		"source":"mi-tienda",
		"externalReservationId":"ORDER-2026-0001",
		"cliente":"Juan Perez",
		"fecha":"2026-08-01",
		"hora":"14:30",
		"pickUp":"Aeropuerto SJO",
		"dropOff":"Hotel X"
	}'
```

### Replay manual de integraciones fallidas

Si una integracion quedo en estado `failed`, puedes ejecutar un reintento manual:

- Ruta: `/api/integrations/reservas/replay`
- Metodo: `POST`
- Seguridad: `Authorization: Bearer <RESERVAS_WEBHOOK_SECRET>` o `x-webhook-key`

Payload recomendado:

```json
{
	"integrationKey": "mi-tienda:ORDER-2026-0001"
}
```

Alternativa sin `integrationKey`:

```json
{
	"source": "mi-tienda",
	"externalReservationId": "ORDER-2026-0001"
}
```

`force: true` solo para casos operativos donde una integracion quedo colgada en `processing`.