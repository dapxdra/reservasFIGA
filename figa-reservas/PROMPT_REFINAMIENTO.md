# Prompt Maestro de Refinamiento - FIGA Reservas

Este documento resume todos los cambios implementados hasta ahora y sirve como prompt base para seguir refinando el desarrollo sin perder contexto.

## Objetivo actual del proyecto

Consolidar una app de reservas con:

- Control de acceso por roles (admin, operador, conductor).
- Dashboard operativo limpio y enfocado por perfil.
- Catalogos de conductores y vehiculos integrados al flujo de reservas.
- Gestion real de usuarios con Firebase Authentication.
- Recordatorios automaticos de reservas 24h antes por email/WhatsApp.

## Estado funcional implementado (hasta hoy)

### 1) Roles y seguridad (RBAC)

- Se estandarizaron roles en `app/lib/roles.js` (`admin`, `operador`, `conductor`).
- Se centralizo autenticacion/autorizacion server-side en `app/lib/serverAuth.js`.
- Se agrego `ProtectedRoute` para proteger paginas cliente.
- Se restringieron rutas y acciones por rol en frontend y backend:
  - Admin: acceso total.
  - Operador: sin reportes.
  - Conductor: solo dashboard con sus reservas asignadas.

### 2) Dashboard y UX por perfil

- Se ajusto dashboard para mostrar acciones segun rol.
- Conductor:
  - solo ve reservas propias (filtro por `assignedUid`, con fallback por nombre).
  - no ve columnas de precio/pago/fecha de pago.
  - no ve botones de gestion (crear, editar, cancelar, marcar revisada).
- Se activo exportar tambien para conductor usando sus reservas visibles.
- Se anadio acceso a `Opciones` (engranaje) para admin/operador.

### 3) Modulo de Opciones y gestion

- Se creo `app/opciones/page.jsx` como hub de administracion.
- Se separaron modulos de gestion del dashboard principal:
  - `app/users/page.jsx`
  - `app/conductores/page.jsx`
  - `app/vehiculos/page.jsx`
  - `app/reportes/page.jsx` (solo admin)
- Se agregaron botones de "Volver a opciones" en users/conductores/vehiculos.

### 4) Catalogos (conductores y vehiculos)

- Se crearon APIs CRUD con permisos por rol:
  - `app/api/conductores/route.jsx`
  - `app/api/conductores/[id]/route.jsx`
  - `app/api/vehiculos/route.jsx`
  - `app/api/vehiculos/[id]/route.jsx`
- Se resolvio fallo de carga por consultas que requerian indice compuesto:
  - se evita `where + orderBy` dependiente de indice.
  - se ordena en memoria.
- Se creo `app/hooks/useCatalogos.js` para carga robusta con:
  - token auth,
  - `Promise.allSettled`,
  - manejo de errores y reintento.

### 5) Flujo de reservas enlazado a catalogos

- Formularios de crear/editar reserva ahora usan:
  - `conductorId` en lugar de texto libre de chofer.
  - `vehiculoId` en lugar de numero libre de buseta.
- Backend de reservas resuelve y guarda campos derivados:
  - `conductorNombre` / `chofer`
  - `vehiculoPlaca` / `buseta`
  - `assignedUid`
- Rutas modificadas:
  - `app/api/reservas/route.jsx`
  - `app/api/reservas/[id]/route.jsx`

### 6) Usuarios reales en Firebase Auth

- Se elimino dependencia de UID manual en creacion de usuario.
- Alta de usuario crea/sincroniza cuenta real en Firebase Authentication.
- Se guarda perfil en `users` con `uid` autentico.
- Edicion/estado del usuario sincroniza con Auth (`disabled`, `email`, `displayName`).
- Endpoints:
  - `app/api/users/route.jsx`
  - `app/api/users/[id]/route.jsx`

### 7) Login y recuperacion de acceso

- Se agrego "Olvide mi contrasena" en login (`sendPasswordResetEmail`).
- Se agrego setup inicial de primer admin:
  - `app/api/auth/setup/route.jsx`
  - `app/api/auth/session/route.jsx`
- `UserContext` ahora gestiona sesion completa con perfil y rol.

### 8) Navegacion y barra superior

- Navbar fuera de dashboard simplificada a logo + logout.
- Ajuste final solicitado:
  - logo centrado,
  - logout al extremo derecho.

### 9) Reportes

- Reportes limitados a admin.
- Se agregaron top conductores y top vehiculos.
- Se ajusto layout responsive de top cards.

### 10) Recordatorios 24h (correo/WhatsApp)

- Se creo endpoint:
  - `app/api/notifications/reservas-24h/route.jsx`
- Modos de ejecucion:
  - GET para cron (protegido por `CRON_SECRET`).
  - POST manual (solo admin).
- Cron configurado en `vercel.json` cada hora.
- Se agrego boton manual de prueba en Opciones.
- Se agrego anti-duplicado:
  - marca `reminder24hSentAt` y canales enviados.
- Se mejoro diagnostico:
  - `skippedReasons`,
  - estado de canales configurados,
  - fallback de email desde coleccion `users` via `assignedUid`.

## Estado operativo actual

El codigo esta funcional a nivel logico. El bloqueo principal para notificaciones reales es de configuracion de proveedores/entorno:

- Email: falta configurar `RESEND_API_KEY` y `REMINDER_FROM_EMAIL`.
- WhatsApp: falta configurar credenciales Twilio.
- Ventana 24h: puede que no haya reservas dentro de `REMINDER_MIN_HOURS` a `REMINDER_MAX_HOURS`.

## Variables de entorno relevantes

- `CRON_SECRET`
- `REMINDER_MIN_HOURS` (default 23)
- `REMINDER_MAX_HOURS` (default 25)
- `RESEND_API_KEY`
- `REMINDER_FROM_EMAIL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM`

## Prompt sugerido para la siguiente iteracion

Usa este texto para continuar refinando:

"Actua como lead developer del proyecto FIGA Reservas (Next.js + Firebase). Ya existen RBAC por roles (admin/operador/conductor), dashboard filtrado por conductor, CRUD de catalogos (conductores/vehiculos), gestion de usuarios integrada con Firebase Auth, y motor de recordatorios 24h por email/WhatsApp.

Quiero refinar el sistema sin romper lo implementado:

1. Verifica consistencia end-to-end de permisos por rol (frontend y backend) en todas las rutas y acciones.
2. Mejora UX de errores y estados vacios (dashboard, catalogos, users, recordatorios).
3. Fortalece observabilidad de recordatorios 24h (logs claros, resumen accionable, trazabilidad por reserva).
4. Agrega pruebas prioritarias para flujos criticos:
   - acceso por roles,
   - creacion/edicion de reservas con conductor/vehiculo,
   - creacion de usuario con Auth + reset,
   - ejecucion de recordatorios 24h.
5. Valida que conductor nunca vea campos sensibles (precio/pago/fechaPago) ni acciones de gestion.
6. Propone mejoras de estructura de codigo (sin reescribir todo) para reducir duplicacion y facilitar mantenimiento.

Entregame:
- hallazgos priorizados (alto/medio/bajo),
- cambios concretos recomendados por archivo,
- plan de implementacion por fases,
- checklist de QA para validar en staging.

No rompas APIs actuales ni comportamiento productivo existente."

## Checklist rapido de refinamiento

- Confirmar variables de entorno en entorno local/staging/produccion.
- Ejecutar prueba manual de recordatorio desde Opciones.
- Verificar `sent/sentEmail/sentWhatsApp/skippedReasons` en respuesta.
- Confirmar que conductor solo vea sus reservas y sin columnas sensibles.
- Confirmar que alta de usuario crea Auth y permite reset por correo.

