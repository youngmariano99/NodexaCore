# Handoffs y Entregables del Sprint - Sprint 9: Endurecimiento de Calidad y Cobertura de Pruebas

**Objetivo:** Consolidar la pirámide de testing del proyecto asegurando la cobertura mínima del 80% sobre la lógica de negocio ya entregada.
**Capacidad:** 30 Ptos | **Duración:** 2 Semanas
**Estado del Sprint:** ACTIVO

--- 

## 🎯 HU: Pruebas unitarias de cálculos de stock y caja
*Criterios de Aceptación/Descripción:*
```text
Como equipo de desarrollo quiero cubrir con pruebas unitarias los cálculos de stock y de totales de venta para detectar errores de lógica antes de llegar a producción.
```

### 📄 [✔ COMPLETADA] Suite Vitest de funciones puras de dominio
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `tests_dominio` (src/lib/dominio/__tests__/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Auditoría + cierre de gaps sobre suites de test de dominio ya existentes (no creadas desde cero); se agregó el caso de cantidad cero faltante en calcularTotalVenta y se instrumentó un gate de cobertura 100% acotado exclusivamente a los 3 archivos de este ticket, sin afectar el resto del repo.

**Archivos Modificados:**
- `src/lib/dominio/ventas/calcularTotalVenta.test.ts`
- `vitest.coverage-dominio.config.ts`
- `package.json`
- `package-lock.json`
- `.gitignore`

**Contratos y API signatures:**
- `npm run test:coverage:dominio — vitest run --coverage --config vitest.coverage-dominio.config.ts`
- `vitest.coverage-dominio.config.ts: coverage.include acotado a calcularTotalVenta.ts, calcularNuevoSaldo.ts, calcularPorcentajeUsoSku.ts; thresholds 100% lines/branches/functions/statements`


--- 

## 🎯 HU: Pruebas de integración sobre RLS y Server Actions
*Criterios de Aceptación/Descripción:*
```text
Como equipo de desarrollo quiero cubrir con pruebas de integración las políticas RLS y los Server Actions críticos para verificar que el aislamiento multi-tenant funciona correctamente.
```

### 📄 [✔ COMPLETADA] Suite de integración contra Supabase local
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `tests_integracion` (tests/integracion/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Suite de integración contra Supabase local ejecutada y verificada en vivo (25/25), no solo escrita. Se corrigieron dos desajustes reales de configuración local vs. cloud, y se reescribieron las aserciones de RLS tras descubrir que las políticas de lectura pública ya existentes exponen datos de otros tenants intencionalmente en dos tablas específicas.

**Archivos Modificados:**
- `tests/integracion/README.md`
- `tests/integracion/helpers/entornoSupabaseLocal.ts`
- `tests/integracion/rls-multitenant.test.ts`
- `tests/integracion/validacion-inputs-maliciosos.test.ts`
- `tests/integracion/setup-env.ts`
- `tests/integracion/stubs/server-only.ts`
- `vitest.integracion.config.ts`
- `package.json`
- `supabase/config.toml`
- `.github/workflows/ci.yml`

**Contratos y API signatures:**
- `npm run test:integracion — vitest run --config vitest.integracion.config.ts`
- `verificarSupabaseLocalDisponible(), iniciarSesionComo(email), crearClienteAnonimo(), crearClienteServicioLocal(), TENANT_A, TENANT_B — tests/integracion/helpers/entornoSupabaseLocal.ts`
- `supabase/config.toml: [auth.hook.custom_access_token] enabled=true, auto_expose_new_tables=true (solo entorno local)`
- `ci.yml: job integration-tests (supabase/setup-cli + supabase start), agregado a needs de ci-ok`


--- 

## 🎯 HU: Pruebas E2E de flujos críticos del usuario
*Criterios de Aceptación/Descripción:*
```text
Como equipo de desarrollo quiero automatizar con Playwright los flujos de onboarding, alta de producto y cobro en mostrador para asegurar que los caminos más importantes nunca se rompan.
```

### 📄 [✔ COMPLETADA] Suite Playwright de flujos de onboarding, alta y cobro
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `tests_e2e` (e2e/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Suite E2E de 3 flujos críticos contra Supabase local + Upstash real, verificada en vivo repetidas veces (7/7 en verde en la corrida final, sin residuos). Se cerraron 3 hallazgos reales encontrados durante la propia ejecución: agotamiento del rate limiter real de login, colisión de selector role=alert con el route-announcer de Next.js, y una fuga de datos de fixture por orden incorrecto de borrado ante una FK.

**Archivos Modificados:**
- `e2e/flujos-criticos/onboarding.spec.ts`
- `e2e/flujos-criticos/alta-producto.spec.ts`
- `e2e/flujos-criticos/cobro-mostrador.spec.ts`
- `e2e/flujos-criticos/helpers/datosLocal.ts`
- `e2e/flujos-criticos/helpers/login.ts`
- `e2e/flujos-criticos/helpers/selectores.ts`
- `e2e/flujos-criticos/README.md`
- `playwright.flujos-criticos.config.ts`
- `package.json`
- `.gitignore`
- `.github/workflows/ci.yml`

**Contratos y API signatures:**
- `npm run test:e2e:flujos-criticos — playwright test --config playwright.flujos-criticos.config.ts`
- `loginComo(page, email), mensajeError(page) — e2e/flujos-criticos/helpers/`
- `TENANT_A, crearClienteServicioLocal() — e2e/flujos-criticos/helpers/datosLocal.ts`
- `ci.yml: job e2e-flujos-criticos (Docker + supabase start + secrets UPSTASH_*), NO incluido aún en needs de ci-ok`


--- 

