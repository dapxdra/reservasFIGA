# Arquitectura Escalable (Hexagonal Pragmatica)

Este proyecto se refactorizo de forma incremental para mantener compatibilidad total de APIs y flujos existentes.

## Objetivo

Separar responsabilidades para escalar sin reescribir todo:

- Dominio/aplicacion: reglas de negocio reutilizables.
- Infraestructura: Firebase, HTTP, serializacion, proveedores externos.
- Interface/adaptadores: rutas API de Next.js y UI cliente.

## Estructura aplicada

- `app/core/client/http/`
  - `authenticatedFetch.js`: cliente HTTP autenticado reutilizable para frontend.
- `app/core/server/reservas/`
  - `resolveReservaAssignment.js`: servicio de aplicacion para resolver conductor/vehiculo.
  - `reservasRepository.js`: adaptador de persistencia para consultas/actualizaciones de reservas.
  - `reservasUseCases.js`: casos de uso de reservas (crear, listar, obtener, actualizar, cancelar).
  - `reservaValidators.js`: validaciones de entrada para payloads de reservas.
- `app/core/server/users/`
  - `usersRepository.js`: persistencia y adaptador Firebase Auth para usuarios.
  - `usersUseCases.js`: casos de uso de usuarios (listar, crear, editar, activar/desactivar).
  - `usersValidators.js`: validaciones de entrada de usuarios.
- `app/core/server/catalogos/`
  - `conductoresRepository.js`: persistencia de conductores.
  - `vehiculosRepository.js`: persistencia de vehiculos.
  - `catalogosUseCases.js`: casos de uso de catalogos.
  - `catalogValidators.js`: validaciones de entrada de catalogos.
- `app/core/server/notifications/`
  - `reservas24hUseCase.js`: caso de uso de recordatorios 24h (email/WhatsApp).
  - `providers/emailResendProvider.js`: adaptador de envio email (Resend).
  - `providers/whatsappTwilioProvider.js`: adaptador de envio WhatsApp (Twilio).
- `app/core/server/auth/`
  - `authSetupUseCase.js`: caso de uso para inicializacion de primer admin.
  - `authValidators.js`: validacion de payload para setup auth.
- `app/core/server/diagnostico/`
  - `diagnosticoUseCase.js`: construccion del diagnostico operativo por rol.
- `app/core/server/shared/`
  - `appError.js`: error de aplicacion estandar para mapear dominio a HTTP.
  - `providers/firebaseAdminAuthProvider.js`: adaptador de Firebase Auth para casos de uso/repositorios.
- `app/core/shared/http/`
  - `jsonResponse.js`: salida JSON estandar para endpoints.
- `app/core/shared/firebase/`
  - `serializeFirestoreRefValue.js`: serializacion unificada de referencias Firestore.

## Adaptadores migrados

Cliente:

- `app/lib/api.js`
- `app/hooks/useCatalogos.js`
- `app/users/page.jsx`
- `app/conductores/page.jsx`
- `app/vehiculos/page.jsx`
- `app/opciones/page.jsx`

Servidor:

- `app/api/reservas/route.jsx`
- `app/api/reservas/[id]/route.jsx`
- `app/api/conductores/route.jsx`
- `app/api/conductores/[id]/route.jsx`
- `app/api/vehiculos/route.jsx`
- `app/api/vehiculos/[id]/route.jsx`
- `app/api/users/route.jsx`
- `app/api/users/[id]/route.jsx`
- `app/api/auth/session/route.jsx`
- `app/api/auth/setup/route.jsx`
- `app/api/diagnostico/route.jsx`
- `app/api/notifications/reservas-24h/route.jsx`

## Beneficios inmediatos

- Menos duplicacion y menor riesgo de inconsistencias.
- Manejo uniforme de headers/autenticacion en frontend.
- Respuestas JSON consistentes en backend.
- Reglas de asignacion de reservas centralizadas.
- Logica de negocio de reservas desacoplada de los handlers HTTP.
- Base de validacion de DTOs sin romper compatibilidad existente.
- Logica de users, catalogos y recordatorios desacoplada de rutas API.
- Proveedores externos desacoplados (Firebase Auth, Resend, Twilio).
- Base de testing automatizado activa para validadores de dominio.
- Base lista para extraer puertos/repositorios por agregado sin romper contratos actuales.

## Estado de fases

- Fase 1 completada: capa core compartida cliente/servidor y estandarizacion de respuestas.
- Fase 2 completada: reservas migradas a casos de uso + repositorio + validadores.
- Fase 3 completada: users, catalogos y recordatorios 24h migrados a casos de uso + repositorios.
- Fase 4 completada: puertos de proveedores externos + testing base con Vitest.
- Fase 5 completada: pruebas de integracion por rol en endpoints criticos + pruebas de casos de uso.
- Fase 6 completada: integracion por rol en endpoints restantes de catalogos y notificaciones.
- Fase 7 completada: pruebas por rol para endpoints con `[id]` (PUT/PATCH/DELETE/GET).
- Fase 8 completada: pruebas de contrato de respuesta API en endpoints criticos.

## Testing base

- Runner: `vitest`
- Config: `vitest.config.mjs`
- Scripts:
  - `npm run test`
  - `npm run test:watch`
- Cobertura inicial de pruebas:
  - `app/core/server/reservas/reservaValidators.test.js`
  - `app/core/server/users/usersValidators.test.js`
  - `app/core/server/catalogos/catalogValidators.test.js`
- Cobertura agregada en fase 5:
  - `app/api/reservas/route.test.js` (autorizacion y flujo por rol)
  - `app/api/users/route.test.js` (autorizacion y manejo de errores de aplicacion)
  - `app/core/server/users/usersUseCases.test.js` (delegacion a repositorio y reglas base)
- Cobertura agregada en fase 6:
  - `app/api/conductores/route.test.js`
  - `app/api/vehiculos/route.test.js`
  - `app/api/notifications/reservas-24h/route.test.js`
- Cobertura agregada en fase 7:
  - `app/api/reservas/[id]/route.test.js`
  - `app/api/users/[id]/route.test.js`
  - `app/api/conductores/[id]/route.test.js`
  - `app/api/vehiculos/[id]/route.test.js`
- Cobertura agregada en fase 8:
  - Aserciones de contrato (`content-type`, campos clave) en:
    - `app/api/reservas/route.test.js`
    - `app/api/users/route.test.js`
    - `app/api/notifications/reservas-24h/route.test.js`

## Siguiente fase recomendada (con aprobacion)

1. Introducir observabilidad estandar (requestId, logs estructurados, trazas por caso de uso).
2. Extender pruebas de contrato al resto de endpoints (`[id]`, auth y diagnostico).
3. Evaluar cache selectivo y paginacion para lecturas de alto volumen.
4. Agregar smoke tests CI (build + test) en pipeline.

Esta hoja de ruta mantiene el principio: cambios minimos, compatibles y sin romper APIs.
