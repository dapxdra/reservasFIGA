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

## Auto-asignacion de conductores

Asigna conductores activos a reservas sin conductor (no canceladas) entre hoy (hora CR) y hoy + N dias.

- Ruta: `POST /api/asignacion/auto`, solo admin/operador (caso de uso: `app/core/server/asignacion/asignacionUseCase.js`)
- Se ejecuta solo a demanda con el boton **Auto-asignar** del dashboard: primero muestra la propuesta y luego se aplica. No hay cron.

Reglas (`app/core/server/asignacion/asignacionScoring.js`):

- La ocupacion se calcula con **tiempos estimados**: duracion del viaje pickup -> dropoff (distancia en linea recta x 1.35 a 45 km/h, + 15 min de abordaje) y traslado desde el dropoff anterior hasta el siguiente pickup. El conductor esta disponible si llega con al menos **20 min** de holgura. Esto aplica antes y despues de los servicios que ya tiene ese dia.
- Las ubicaciones salen de `pickUpLat/Lng` y `dropOffLat/Lng` de la reserva o, si faltan, de los lugares conocidos (`app/core/server/shared/knownPlaces.js`). Si un par de servicios no tiene ubicacion, se usa la regla anterior: **5 horas** entre servicios.
- Cada conductor puede tener un **vehiculo fijo** (se elige en Conductores y se puede cambiar cuando se quiera). Al auto-asignar, la reserva recibe ese vehiculo, salvo que ya traiga uno elegido a mano.
- Se descartan conductores ocupados, vehiculos ocupados, vehiculos sin capacidad para `AD + NI` (si el vehiculo tiene `capacidad`) y conductores con 6 servicios ese dia.
- Entre los disponibles se prefiere: 1) quien **encadena** (su dropoff anterior queda a 15 km o menos del pickup y espera 2 h o menos; sin ubicaciones, que el lugar coincida), 2) el menor costo = km vacio para llegar (desde el dropoff anterior o desde el garage) + 40 km por cada servicio que ya tiene ese dia, 3) quien tiene vehiculo fijo.
- Si hay ubicaciones, los tiempos y km salen de **rutas reales por carretera** (OSRM `/table`, x 1.15 porque una buseta es mas lenta que un auto). Se guardan en la coleccion `travelTimes` de Firestore (clave `lat,lng>lat,lng` redondeada a ~100 m) y se recalculan cada 90 dias; si OSRM no responde, ese par se estima en linea recta. La respuesta incluye `tiempos: { pares, cache, osrm, estimados, error }`. `OSRM_BASE_URL` (opcional) apunta a un servidor OSRM propio.
- Motivos: `EncadenaServicio`, `MenorRecorridoVacio`, `MenorCargaDelDia`. Los parametros estan en `DEFAULT_ASIGNACION_CONFIG`.
- Reservas sin hora no se asignan (`SinHora`).
- Cada asignacion guarda `asignacionAuto: { at, motivo, serviciosPreviosDia, kmVacioEstimado, esperaEstimadaMin }` para auditoria.

No requiere variables de entorno nuevas (`OSRM_BASE_URL` es opcional).

Prueba manual (requiere token de admin/operador; sin `"dryRun": false` solo devuelve la propuesta):

```bash
curl -X POST -H "Authorization: Bearer $ID_TOKEN" -H "Content-Type: application/json" \
  -d '{"dias": 2, "dryRun": false}' http://localhost:3000/api/asignacion/auto
```

## App movil de conductores (Capacitor) y seguimiento en segundo plano

La app nativa (`android/`, `ios/`) es la misma web envuelta con Capacitor: carga `https://www.reservasfiga.com` (ver `capacitor.config.json`), asi que cada deploy en Vercel actualiza la app sin publicar otra version. Solo hay que recompilarla si cambian plugins, permisos o la config nativa. `capacitor-shell/` solo tiene la pagina de "sin conexion".

Como funciona el seguimiento:

- **Ventana**: desde **3 h antes** de la hora del servicio hasta el fin estimado + 1 h (`app/core/server/tracking/trackingWindow.js`). Si el siguiente servicio empieza antes de que termine el actual, la ventana se extiende.
- `GET /api/conductores/tracking` (solo conductor) dice si su celular debe enviar ubicacion: `{ ok, activo, reservaId, desde, hasta }` o `{ ok, activo: false, proximo }`. El hook `useReportConductorLocation` lo consulta cada 5 min, al volver a la app y al recibir el aviso push.
- **En la app nativa** usa `@capacitor-community/background-geolocation`: sigue enviando con la **pantalla apagada o la app minimizada** (Android muestra una notificacion fija "Seguimiento de servicio activo") y envia por HTTP nativo. Se apaga sola al cerrar la ventana. **En el navegador** solo envia con la pagina abierta.
- **Aviso push 3 h antes**: `GET /api/notifications/tracking-start` (requiere `CRON_SECRET`; `POST` manual solo admin, con `{ "dryRun": true }` para ver que enviaria) manda por FCM "Tu servicio inicia en unas 3 horas" a los celulares registrados del conductor, una vez por reserva (`trackingPush.sentAt`). Al tocarlo se abre la app y arranca el seguimiento.
- Los celulares se registran en `POST /api/conductores/device-token` (coleccion `deviceTokens`) y se quitan al cerrar sesion (`DELETE`).

Limitacion: si el conductor **cierra la app a la fuerza** (la desliza fuera de recientes) o el sistema la mata, el seguimiento se detiene hasta que vuelva a abrirla, por ejemplo desde el aviso push. Para seguir aun con la app cerrada a la fuerza hace falta un plugin comercial (Transistorsoft background-geolocation, licencia para Android).

### Puesta en marcha

1. **Firebase**: en la consola del proyecto, agregar una app Android con el paquete `com.reservasfiga.app` y copiar `google-services.json` a `android/app/` (esta ignorado en git). Sin este archivo la app funciona, pero sin push.
2. **Compilar Android**: instalar Android Studio, luego `npm.cmd run cap:sync` y `npm.cmd run cap:android`, y ejecutar o generar el APK/AAB desde Android Studio.
3. **Cron externo** (Vercel Hobby no permite crons cada hora): en cron-job.org u otro, cada **15 min**: `GET https://www.reservasfiga.com/api/notifications/tracking-start` con el header `Authorization: Bearer <CRON_SECRET>`.
4. **Celulares de los conductores**: aceptar ubicacion y notificaciones, y en Android quitar la **optimizacion de bateria** para FIGA (Samsung/Xiaomi/Huawei matan servicios en segundo plano si no).
5. **Distribucion**: para una flota propia basta instalar el APK firmado o usar una prueba interna de Play. Para publicar en Play Store hay que declarar el uso de "foreground service de ubicacion" en Play Console.
6. **iOS** (requiere Mac con Xcode): `npm.cmd run cap:ios`, activar las capabilities *Push Notifications* y *Background Modes* (Location updates, Remote notifications), subir la llave APNs a Firebase y agregar Firebase Messaging al AppDelegate para obtener el token FCM (en iOS Capacitor entrega el token APNs). Los permisos de ubicacion ya estan en `ios/App/App/Info.plist`.

### Estados del servicio (confirmacion del conductor)

El conductor asignado confirma la reserva y marca su avance desde el dashboard (boton en la fila o tarjeta y en el modal del mapa): `confirmada` -> `en_camino` -> `en_pickup` -> `a_bordo` -> `finalizada` (solo avanza; puede saltar estados).

- `PATCH /api/reservas/[id]/estado` con `{ "estado": "confirmada" }`, solo el conductor asignado. Guarda `estadoServicio` y `estadoServicioAt` (hora de cada estado). Responde 409 si la reserva esta cancelada o el estado no avanza.
- Si un admin cambia el conductor de la reserva, la confirmacion se borra.
- Admin/operador ven las reservas confirmadas con un borde azul a la izquierda y un icono junto al ID (azul confirmada, ambar en curso, gris finalizada; el estado aparece al pasar el mouse). En movil, una etiqueta con el estado.
- `en_camino` activa el seguimiento aunque falten mas de 3 h; `finalizada` lo apaga.
- En el mapa, la ruta naranja va del conductor al pick up (o al drop off con pasajeros a bordo), con km, minutos y hora estimada de llegada, y avisa si llegaria tarde al pick up. Se recalcula solo si el conductor se sale de la ruta (>200 m) o cada 2 min.

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