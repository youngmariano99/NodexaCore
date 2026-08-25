# Handoffs y Entregables del Sprint - Sprint 1: Cimientos de Infraestructura y Primer Acceso

**Objetivo:** Dejar operativo el esqueleto técnico del proyecto (Next.js, Supabase, Vercel, CI/CD y observabilidad) y habilitar el primer flujo de inicio de sesión.
**Capacidad:** 30 Ptos | **Duración:** 2 Semanas
**Estado del Sprint:** COMPLETADO

--- 

## 🎯 HU: Inicialización del proyecto Next.js con TypeScript estricto
*Criterios de Aceptación/Descripción:*
```text
Como equipo de desarrollo quiero inicializar el repositorio con Next.js App Router, TypeScript estricto, Tailwind CSS y Shadcn UI para contar con una base de código consistente antes de construir cualquier módulo.
```

### 📄 [✔ COMPLETADA] Scaffold del proyecto Next.js App Router + TypeScript estricto
- **Rol:** DevOps / Platform Engineer
- **Componente/Ruta:** `estructura_base_proyecto` (/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se scaffoldeó Next.js 16 App Router + TypeScript estricto en la raíz del repo (git init + rama feature creada, ya que no existía repositorio previo). tsconfig.json extendido con noImplicitAny y noUncheckedIndexedAccess sobre la base strict de create-next-app. Se creó la estructura modular src/{app,components,repositories,services,lib,types} exigida por CLAUDE.md. build, tsc --noEmit y lint verificados sin errores; se confirmó que un any implícito falla el build.

**Archivos Modificados:**
- `package.json`
- `tsconfig.json`
- `.gitignore`
- `eslint.config.mjs`
- `next.config.ts`
- `postcss.config.mjs`
- `AGENTS.md`
- `README.md`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`
- `src/app/favicon.ico`
- `src/components/.gitkeep`
- `src/repositories/.gitkeep`
- `src/services/.gitkeep`
- `src/lib/.gitkeep`
- `src/types/.gitkeep`
- `public/*`


--- 

## 🎯 HU: Conexión y configuración de Supabase
*Criterios de Aceptación/Descripción:*
```text
Como equipo de desarrollo quiero conectar el proyecto a Supabase (PostgreSQL, Auth, RLS) para disponer de la base de datos y autenticación desde el inicio del desarrollo.
```

### 📄 [✔ COMPLETADA] Provisionar proyecto Supabase y variables de entorno
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `supabaseClient` (src/lib/supabase/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se instaló @supabase/supabase-js, @supabase/ssr, zod, server-only (runtime) y postgres, tsx (dev, solo para el script de verificación). env.ts separa validación cliente (eager) de servidor (lazy) para que la service_role key jamás se evalúe en el bundle del navegador. server.ts usa el import 'server-only' para bloquear a nivel bundler cualquier importación desde un Client Component, verificado con un build de prueba que efectivamente falla. Como el anon/service_role viajan por PostgREST (sin SQL crudo), el SELECT 1 del Paso 5 se implementó como script standalone con conexión directa a Postgres vía SUPABASE_DB_URL, no como parte del arranque de la app. Se corrigió .gitignore porque el patrón .env* bloqueaba también a .env.example (el template que sí debe versionarse).

**Archivos Modificados:**
- `package.json`
- `package-lock.json`
- `.gitignore`
- `.env.example`
- `src/lib/env.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `scripts/verificar-conexion-supabase.ts`

**Contratos y API signatures:**
- `entornoCliente: { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY }`
- `obtenerEntornoServidor(): { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY }`
- `crearClienteSupabaseNavegador(): SupabaseClient`
- `crearClienteSupabaseServidor(): Promise<SupabaseClient>`
- `crearClienteSupabaseAdmin(): SupabaseClient`
- `npm run db:verificar (requiere SUPABASE_DB_URL)`


--- 

## 🎯 HU: Definición de tipos ENUM y migraciones base
*Criterios de Aceptación/Descripción:*
```text
Como equipo de desarrollo quiero definir los tipos ENUM del dominio y la estructura inicial de migraciones para tener un modelo de datos versionado desde el arranque del proyecto.
```

### 📄 [✔ COMPLETADA] Crear migraciones SQL iniciales con Supabase CLI
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `migraciones_iniciales` (supabase/migrations/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Migración inicial escrita 1:1 desde docs/SCHEMA.md, con guardas idempotentes (DO $$ + pg_type para ENUMs, IF NOT EXISTS para tablas/índices, DROP POLICY IF EXISTS para políticas) que permiten reejecución segura, verificado corriendo el script dos veces contra el proyecto real vía el MCP de Supabase. Se habilitó RLS en las tres tablas: clientes y el patrón genérico de tenant_modules se tomaron literalmente de ROLES.md; usuarios requirió diseño propio porque ROLES.md no lo incluye en su lista de tablas con patrón documentado, así que se derivó directamente de la matriz de permisos §2 (documentado inline en el SQL). Se corrigió un WARN de seguridad real detectado por get_advisors (function_search_path_mutable) fijando search_path en las 3 funciones helper. Se sembró el tenant demo-nodexa como smoke test, separado del lote volumétrico de docs/SEED.md que corresponde a una estación futura. supabase link por CLI no se completó por falta de sesión de cuenta (access token), pero no bloquea el criterio de aceptación porque push y verificación ya se cubrieron por el MCP oficial de Supabase.

**Archivos Modificados:**
- `supabase/config.toml`
- `supabase/.gitignore`
- `supabase/migrations/20260805214353_init_enums_y_tablas_core.sql`

**Contratos y API signatures:**
- `ENUM rol_usuario ('admin_nodexa','comerciante','empleado')`
- `ENUM modulo_nodexa ('catalogo_web','carga_ia','fiados','devoluciones','bot_whatsapp')`
- `ENUM tipo_movimiento_stock ('entrada','salida')`
- `ENUM estado_venta ('confirmada','devuelta_parcial','devuelta_total')`
- `ENUM tipo_movimiento_cuenta ('cargo','pago')`
- `ENUM estado_devolucion ('registrada','procesada')`
- `ENUM origen_alta_producto ('manual','excel','ia_vision')`
- `function auth_cliente_id() returns uuid`
- `function auth_rol() returns rol_usuario`
- `function es_admin_nodexa() returns boolean`
- `table clientes(cliente_id, nombre_comercio, slug UNIQUE, estado_pago, limite_sku, cuota_mensual_ia, ia_consultas_usadas, ia_periodo_actual, logo_url, color_primario, dominio_personalizado UNIQUE, telefono_whatsapp, creado_en, eliminado_en)`
- `table usuarios(usuario_id, auth_user_id UNIQUE FK auth.users, cliente_id FK clientes, rol, nombre, email UNIQUE, creado_en, eliminado_en)`
- `table tenant_modules(tenant_module_id, cliente_id FK clientes, modulo, activo, activado_en, desactivado_en) UNIQUE(cliente_id, modulo)`


--- 

## 🎯 HU: Configuración de despliegue en Vercel
*Criterios de Aceptación/Descripción:*
```text
Como equipo de desarrollo quiero configurar el despliegue automatizado en Vercel para publicar cambios de forma continua en entornos de preview y producción.
```

### 📄 [✔ COMPLETADA] Configurar proyecto en Vercel Edge Network
- **Rol:** DevOps / Platform Engineer
- **Componente/Ruta:** `vercel.json` (/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se confirmó vía MCP de Vercel que el proyecto nodexa-modular está correctamente vinculado al repo de GitHub con deploys automáticos activos. Se agregó vercel.json con cabeceras de caché Edge (s-maxage + stale-while-revalidate) para el grupo (publico) del sitemap, aplicando ISR (revalidate=60) al único route real existente hoy. Como el MCP de Vercel disponible no expone gestión de variables de entorno ni el toggle de Preview Deployments, se compensó con un guardrail automatizado y verificado en el pipeline de build (postbuild) que falla el build completo si la service_role key aparece en el bundle de cliente — probado con control positivo y negativo. Se dejó documentado qué queda pendiente de confirmar manualmente en el dashboard de Vercel. (Se comprobó manualmente y quedó todo bien configurado) 

**Archivos Modificados:**
- `vercel.json`
- `src/app/page.tsx`
- `scripts/verificar-fugas-env-cliente.ts`
- `package.json`

**Contratos y API signatures:**
- `vercel.json: headers Cache-Control Edge para /, /login, /c/:clienteSlug, /c/:clienteSlug/producto/:productoId`
- `src/app/page.tsx: export const revalidate = 60`
- `npm run build → postbuild ejecuta scripts/verificar-fugas-env-cliente.ts (exit 1 si SUPABASE_SERVICE_ROLE_KEY aparece en .next/static)`


--- 

## 🎯 HU: Integración de Sentry y PostHog
*Criterios de Aceptación/Descripción:*
```text
Como equipo de desarrollo quiero integrar Sentry y PostHog en el proyecto para contar con monitoreo técnico y analítica de negocio desde las primeras funcionalidades.
```

### 📄 [✔ COMPLETADA] Instrumentar Sentry para monitoreo técnico
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `sentry.config` (/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
El wizard oficial (npx @sentry/wizard) no pudo ejecutarse en este entorno por falta de TTY real (ERR_TTY_INIT_FAILED), y no había MCP de Sentry conectado para provisionar/verificar por API, así que se completó el setup manual ya construido en la estación anterior (instrumentation-client.ts en vez del sentry.client.config.ts deprecado bajo Turbopack, sentry.server/edge.config.ts vía instrumentation.ts, beforeSend compartido con redacción de password/token/cliente_id) cargando el DSN real que proveyó el usuario desde sentry.io (org nodexa-cf, project javascript-nextjs). Se verificó end-to-end disparando un error real a través de la app corriendo (GET /api/sentry-example-api, sin scripts standalone que bypaseen el init), confirmando con debug temporal que el evento se capturó y flusheó sin errores de transporte, y el usuario confirmó visualmente el issue ErrorDePruebaSentry en el dashboard de Sentry. El debug:true se retiró antes de dejar el código final.

**Archivos Modificados:**
- `package.json`
- `package-lock.json`
- `next.config.ts`
- `src/lib/env.ts`
- `.env.example`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `src/instrumentation-client.ts`
- `src/instrumentation.ts`
- `src/app/global-error.tsx`
- `src/app/api/sentry-example-api/route.ts`
- `src/lib/sentry/filtrar-datos-sensibles.ts`

**Contratos y API signatures:**
- `filtrarDatosSensibles(evento: ErrorEvent): ErrorEvent`
- `register() — instrumentation.ts, carga sentry.server.config / sentry.edge.config según NEXT_RUNTIME`
- `onRequestError = Sentry.captureRequestError (instrumentation.ts)`
- `onRouterTransitionStart = Sentry.captureRouterTransitionStart (instrumentation-client.ts)`
- `GET /api/sentry-example-api → 500 (ruta de prueba, no productiva)`
- `env NEXT_PUBLIC_SENTRY_DSN / SENTRY_ORG / SENTRY_PROJECT / SENTRY_AUTH_TOKEN`
- `Proyecto Sentry verificado: org nodexa-cf, project javascript-nextjs, issue ErrorDePruebaSentry (JAVASCRIPT-NEXTJS-2) confirmado en dashboard`


### 📄 [✔ COMPLETADA] Instrumentar PostHog para métricas de negocio
- **Rol:** Frontend / UX Engineer
- **Componente/Ruta:** `posthog` (src/lib/analytics/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Ticket redirigido de PostHog a Nave Nodriza (sistema propio de telemetría de AppyStudio) por decisión explícita del usuario, siguiendo el protocolo HTTP documentado en sus guías de integración. Se implementó como fetch directo sin nuevas dependencias npm, con no-op silencioso cuando faltan credenciales. Se documentó explícitamente la distinción entre el client_id de Nave Nodriza (Nodexa Core como app registrada) y el cliente_id propio de Nodexa (comercio multi-tenant, viaja en metadata). Se detectaron y corrigieron dos bugs reales en src/lib/env.ts durante la verificación: el objeto fuente de entornoCliente omitía los campos opcionales nuevos, y el schema de Zod no toleraba cadenas vacías (habituales en .env.local) como 'no configurado', lo que tumbaba toda la app — exactamente el escenario que el criterio de aceptación 4 exige que no falle. Se scaffoldearon páginas públicas mínimas (sin datos reales de productos, pendiente de otro ticket) para que el CTA de WhatsApp fuera verificable de punta a punta, no solo declarativo. No se pudo cerrar la verificación contra el dashboard real de Nave Nodriza por falta de credenciales de un tenant registrado.

**Archivos Modificados:**
- `src/lib/env.ts`
- `.env.example`
- `src/lib/analytics/nave-nodriza.ts`
- `src/lib/analytics/eventos.ts`
- `src/components/analytics/boton-whatsapp-cta.tsx`
- `src/components/analytics/registrador-vista-vidriera.tsx`
- `src/app/(publico)/c/[clienteSlug]/page.tsx`
- `src/app/(publico)/c/[clienteSlug]/producto/[productoId]/page.tsx`

**Contratos y API signatures:**
- `enviarEventoNodriza(tipoEvento: string, metadata?: MetadataEventoNodriza): void`
- `registrarClicWhatsapp({ clienteId, productoId, productoNombre, precio? }): void`
- `registrarConversionCatalogo({ clienteId }): void`
- `registrarUsoModulo({ clienteId, modulo, accion }): void`
- `<BotonWhatsappCta clienteId productoId productoNombre precio? numeroWhatsapp mensaje? className? />`
- `<RegistradorVistaVidriera clienteId />`
- `env NEXT_PUBLIC_NN_CLIENT_ID / NEXT_PUBLIC_NN_API_KEY / NEXT_PUBLIC_NN_ENDPOINT`
- `Rutas: /c/[clienteSlug], /c/[clienteSlug]/producto/[productoId] (placeholders funcionales)`


--- 

## 🎯 HU: Pipeline de CI/CD con validaciones previas al deploy
*Criterios de Aceptación/Descripción:*
```text
Como equipo de desarrollo quiero un pipeline de CI/CD que ejecute linters, chequeo de tipos y pruebas automáticas para evitar que código defectuoso llegue a producción.
```

### 📄 [✔ COMPLETADA] Configurar GitHub Actions con validaciones de calidad
- **Rol:** DevOps / Platform Engineer
- **Componente/Ruta:** `ci.yml` (.github/workflows/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se creó el pipeline de CI/CD completo (lint, tsc --noEmit, Vitest, Playwright) disparado por pull_request hacia main, con un job agregador (ci-ok) pensado como único required status check. Vitest y Playwright no existían en el repo: se instalaron y configuraron desde cero con pruebas reales (no stubs), incluyendo un test de regresión directo del bug de env.ts encontrado en la estación anterior. Se detectó y corrigió que 'eslint' sin --max-warnings 0 no falla ante warnings, lo cual rompía el criterio de aceptación de bloqueo por lint; se verificó localmente el fix (exit code 1 confirmado). El build/typecheck se validó también sin .env.local para confirmar que no depende de secretos reales en CI.

El usuario re-autenticó gh CLI (estaba con token inválido) y mergeó manualmente PR #1 a main. Al abrir PR #2 (rama demo/ci-lint-error-intencional, con el error de lint intencional) se detectó que ningún job de GitHub Actions corría — ni siquiera aparecía como check. Se investigó a fondo vía API (gh api + un Personal Access Token clásico que el usuario generó y compartió puntualmente, usado en memoria y no persistido): se descartaron contenido del workflow (verificado byte a byte contra GitHub), permisos de Actions a nivel repo, cuenta sin verificar/bloqueada, y delay de sincronización (se probaron merge a main, apertura de PR, push vacío y push real, con esperas de varios minutos entre cada uno vía Monitor). Se intentó forzar el ajuste 'check-suites/preferences' vía API, rechazado (403, solo lo puede modificar la app dueña del check suite). Se agregó workflow_dispatch al workflow como prueba diagnóstica y se disparó manualmente vía API (POST .../actions/workflows/ci.yml/dispatches): la corrida SÍ se ejecutó, corrió los 5 jobs, lint falló por el error intencional y ci-ok falló en cascada — confirmando que el pipeline funciona correctamente de punta a punta y que los runners/la cuenta no están bloqueados. Se probó también deshabilitar y rehabilitar 'actions/permissions' como fix típico para este tipo de glitch, sin efecto: push y pull_request siguen sin generar ningún run (GET .../actions/runs?event=push|pull_request → total_count: 0 de forma consistente).

Conclusión: es un problema de integración interna de GitHub Actions específico de este repositorio (los eventos automáticos push/pull_request no disparan corridas, pero el dispatch manual por API sí funciona perfectamente), no resoluble desde la API pública ni desde ningún ajuste de configuración disponible. Se le indicó al usuario abrir un ticket a GitHub Support con el diagnóstico exacto reproducible, y revocar el PAT temporal ya usado. Como mitigación inmediata, workflow_dispatch queda disponible en la rama demo como botón manual de 'Run workflow' mientras se resuelve el tema de fondo; pendiente decisión del usuario sobre llevarlo también a main. Paso 3 (branch protection) quedó parcialmente configurado por el usuario vía Rulesets, bloqueado en 'Require status checks to pass' porque el buscador de checks solo lista nombres de checks que ya corrieron al menos una vez — lo cual depende de resolver primero el problema de triggers automáticos.

**Archivos Modificados:**
- `.github/workflows/ci.yml`
- `vitest.config.ts`
- `playwright.config.ts`
- `src/lib/env.test.ts`
- `src/lib/sentry/filtrar-datos-sensibles.test.ts`
- `e2e/vidriera-publica.spec.ts`
- `package.json`
- `package-lock.json`
- `.gitignore`

**Contratos y API signatures:**
- `npm run test → vitest run`
- `npm run test:e2e → playwright test`
- `npm run lint → eslint --max-warnings 0`
- `Workflow CI (.github/workflows/ci.yml): jobs lint, typecheck, unit-tests, e2e-tests, ci-ok — check requerido a configurar en branch protection: 'CI (requerido para mergear)'`
- `on: pull_request (branches: [main]) + workflow_dispatch (agregado como vía manual de respaldo, disponible en la rama demo/ci-lint-error-intencional, pendiente de llevar a main)`
- `PR #1 (feature/mc-act-az2d-...) → mergeado a main: ci.yml, tests y config quedaron en producción`
- `PR #2 (demo/ci-lint-error-intencional) → abierto y activo: PR de prueba con error de lint intencional, no mergear, cerrar una vez resuelto el problema de triggers automáticos`


--- 

## 🎯 HU: Inicio de sesión con Supabase Auth
*Criterios de Aceptación/Descripción:*
```text
Como usuario del sistema quiero iniciar sesión con mis credenciales para acceder al panel correspondiente a mi rol y comercio.
```

### 📄 [✔ COMPLETADA] Implementar formulario de login con Server Action
- **Rol:** Frontend / UX Engineer
- **Componente/Ruta:** `LoginForm` (app/(publico)/login/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementó el formulario de login con Server Action siguiendo el checklist (Zod Fail-Fast, signInWithPassword, manejo NX-SYS-006, redirect por rol, sistema de diseño con min-touch-target 44px). Se detectó que el custom_access_token_hook documentado en ROLES.md nunca se había creado en ninguna estación previa, dejando rotas en silencio todas las políticas RLS que dependen de auth_rol()/auth_cliente_id()/es_admin_nodexa(); se creó y aplicó la migración correspondiente. El Server Action lee el rol desde la tabla usuarios (vía RLS, no del JWT) para funcionar independientemente del estado del hook. Se sembraron 3 usuarios reales en auth.users con bcrypt y auth.identities, verificados con login real contra la API de Supabase Auth. Se encontró y corrigió en vivo un bug real de Next.js (un archivo 'use server' no puede exportar nada que no sea una función async). El usuario activó manualmente el hook en el Dashboard; al re-verificar los 3 roles se encontró un segundo bug real y más sutil en la función SQL: 'record IS NOT NULL' en PL/pgSQL exige que TODOS los campos de la fila sean no-nulos, no 'al menos uno' — como admin_nodexa tiene cliente_id NULL por diseño, el hook nunca le agregaba claims. Se corrigió usando FOUND en vez de la comparación IS NOT NULL, y se re-verificó con los 3 logins reales que el JWT ahora trae rol y cliente_id correctamente para los tres roles. Los tres flujos de redirección de la app (comerciante/empleado a /dashboard, admin_nodexa a /admin) y el mensaje NX-SYS-006 ante credenciales inválidas ya estaban verificados en navegador real; el fix del hook no afecta esa lógica porque el Server Action no depende del JWT para redirigir.

**Archivos Modificados:**
- `src/app/(publico)/login/page.tsx`
- `src/components/auth/login-form.tsx`
- `src/services/autenticacion/iniciarSesion.ts`
- `src/services/autenticacion/tipos.ts`
- `src/lib/errores/catalogo.ts`
- `supabase/migrations/20260807231800_custom_access_token_hook.sql`
- `supabase/migrations/20260807231822_seed_usuarios_demo.sql`
- `package.json`
- `package-lock.json`

**Contratos y API signatures:**
- `iniciarSesion(estadoPrevio: EstadoLogin, formData: FormData): Promise<EstadoLogin> — Server Action`
- `EstadoLogin { error: string | null }, ESTADO_LOGIN_INICIAL`
- `<LoginForm /> — client component`
- `obtenerMensajeError(codigo: string): string`
- `SQL function public.custom_access_token_hook(event jsonb) returns jsonb — ACTIVADO en Supabase Dashboard (Authentication > Hooks) y verificado funcionando para los 3 roles`
- `3 usuarios demo: admin.demo@nodexa.app (admin_nodexa, cliente_id=null), comerciante.demo@nodexa.app (comerciante, cliente_id=demo-nodexa), empleado.demo@nodexa.app (empleado, cliente_id=demo-nodexa) — password NodexaDemo123! para los tres`


--- 

