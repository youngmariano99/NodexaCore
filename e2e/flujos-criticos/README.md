# Suite E2E de flujos críticos (Playwright + Supabase local)

10% de la pirámide de testing (CLAUDE.md §4). A diferencia de
`e2e/vidriera-publica.spec.ts` (que corre con credenciales placeholder y
prueba degradación controlada sin backend), estos 3 specs necesitan un
backend real: login real, `limite_sku` real, descuento de stock real.

## Cómo correrla

Requiere:

1. Docker corriendo + `npx supabase start` (misma instancia que
   `tests/integracion/`, ver ese README para detalles de configuración).
2. Credenciales **reales** de Upstash Redis en `.env.local`
   (`UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`) — el login real
   pasa por `verificarAuthLimiter` (docs/ERRORS.md `NX-SYS-005`), que hace
   una llamada de red real a Upstash en cada intento. Sin credenciales
   reales, todo login falla con un error sin manejar.

```bash
npx supabase start
npm run test:e2e:flujos-criticos
```

## ⚠️ Rate limiting real (NX-SYS-005)

El login está protegido por un rate limiter real (5 intentos cada 15
minutos, por IP+email — `src/lib/rate-limit/authLimiter.ts`). Esta suite
está diseñada para consumir el mínimo posible: **un solo login por
archivo de spec**, reutilizando la misma sesión (`page` de módulo dentro
de `test.describe.serial`) entre todos los tests de ese archivo, en vez
de loguearse en cada `test()`.

Total por corrida completa: 2 intentos (`onboarding.spec.ts`, uno válido y
uno inválido) + 1 (`alta-producto.spec.ts`) + 1 (`cobro-mostrador.spec.ts`)
= **4 intentos**, dentro del límite de 5.

**Si corrés la suite varias veces seguidas mientras debuggeás, vas a
agotar el límite real** (mismo usuario demo, misma IP local) y vas a ver
`NX-SYS-005` ("Estás enviando demasiadas solicitudes seguidas") en vez del
error esperado por cada test — no es un bug de los specs, es el rate
limiter real haciendo su trabajo. Esperá ~15 minutos entre corridas
completas, o usá un usuario demo distinto temporalmente si necesitás
iterar rápido.

## Qué cubre

- **`onboarding.spec.ts`** (Criterio de Aceptación 1): login válido hasta
  el dashboard + navegación a `/mostrador`, login inválido (`NX-SYS-006`),
  y acceso sin sesión (`NX-SYS-002`).
- **`alta-producto.spec.ts`** (Criterio de Aceptación 2): alta exitosa
  (con limpieza del producto creado) y bloqueo al 100% del `limite_sku`
  (`NX-PRD-001`, `ModalBloqueoSku`) — el límite se baja temporalmente al
  conteo real de productos del tenant vía `service_role` y se restaura al
  terminar, porque ningún tenant del seed está exactamente en su límite.
- **`cobro-mostrador.spec.ts`** (Criterio de Aceptación 3): venta exitosa
  con verificación del descuento real de `stock_actual` y del
  `movimientos_stock` generado, y stock insuficiente en el momento exacto
  de confirmar (`NX-VTA-001`) simulando una venta concurrente vía
  `service_role` entre la búsqueda y la confirmación.

Cada test de `alta-producto`/`cobro-mostrador` limpia sus propios
productos de fixture al terminar (`service_role`), sin dejar residuos en
la base local.
