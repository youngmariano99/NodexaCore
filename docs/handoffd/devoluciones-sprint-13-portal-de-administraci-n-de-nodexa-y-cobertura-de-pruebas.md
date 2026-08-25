# Handoffs y Entregables del Sprint - Sprint 13: Portal de Administración de NODEXA y Cobertura de Pruebas

**Objetivo:** Entregar las interfaces para el Administrador NODEXA, la autogestión de módulos para el comerciante y asegurar la calidad del frontend mediante pruebas E2E.
**Capacidad:** 30 Ptos | **Duración:** 2 Semanas
**Estado del Sprint:** COMPLETADO

--- 

## 🎯 HU: UI de Alta y Detalle de Comercios para Admin
*Criterios de Aceptación/Descripción:*
```text
Como administrador de NODEXA quiero crear clientes/comercios y ver sus fichas de control de forma visual para gestionar la base de clientes según el SOP-01.
```

### 📄 [✔ COMPLETADA] Panel de Alta de Comercio y Ficha de Onboarding
- **Rol:** Frontend
- **Componente/Ruta:** `FormularioAltaClienteAdmin` (src/app/(admin)/admin/clientes/nuevo/page.tsx)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se extendió la Server Action crearCliente para configurar el limite_sku y módulos iniciales al dar de alta comercios. Se diseñó el formulario /admin/clientes/nuevo y la vista de inicio del administrador en /admin.

**Archivos Modificados:**
- `src/services/admin/crearCliente.ts`
- `src/services/admin/crearCliente.test.ts`
- `src/services/admin/tipos.ts`
- `src/app/(admin)/admin/clientes/nuevo/page.tsx`
- `src/app/(admin)/admin/clientes/nuevo/FormularioAltaClienteAdmin.tsx`
- `src/app/(admin)/admin/page.tsx`

**Contratos y API signatures:**
- `export async function crearCliente(state, formData)`
- `export default async function NuevoClienteAdminPage()`
- `export default async function AdminDashboardPage()`


--- 

## 🎯 HU: UI de Activación de Módulos (Admin & Comerciante)
*Criterios de Aceptación/Descripción:*
```text
Como administrador de NODEXA quiero gestionar los módulos de cada comercio de forma visual, y como comerciante quiero gestionar mis suscripciones a los mismos.
```

### 📄 [✔ COMPLETADA] Gestión Visual de Módulos Contratados
- **Rol:** Frontend
- **Componente/Ruta:** `MarketplaceModulos` (src/app/(app)/configuracion/modulos/page.tsx)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementaron las vistas y Server Actions para administrar los módulos contratados (tenant_modules) del lado de admin_nodexa (actualizarModuloCliente) y comerciante (solicitarModulo). Se configuró un flujo de auditoría vía registrarDiff y se validaron las reglas con tests unitarios.

**Archivos Modificados:**
- `src/services/admin/actualizarModuloCliente.ts`
- `src/services/admin/actualizarModuloCliente.test.ts`
- `src/services/configuracion/solicitarModulo.ts`
- `src/services/configuracion/solicitarModulo.test.ts`
- `src/app/(app)/configuracion/modulos/page.tsx`
- `src/app/(app)/configuracion/modulos/MarketplaceModulos.tsx`
- `src/app/(admin)/admin/clientes/[clienteId]/modulos/page.tsx`
- `src/app/(admin)/admin/clientes/[clienteId]/modulos/PanelModulosAdmin.tsx`

**Contratos y API signatures:**
- `export async function actualizarModuloCliente(clienteId, modulo, activo)`
- `export async function solicitarModulo(modulo)`
- `export default async function ModulosConfiguracionPage()`
- `export default async function AdminModulosPage({ params })`


--- 

## 🎯 HU: UI de Reporte de Morosidad y General de Admin
*Criterios de Aceptación/Descripción:*
```text
Como administrador de NODEXA quiero ver los comercios en mora y suspender o reactivar su acceso de forma visual según el SOP-04.
```

### 📄 [✔ COMPLETADA] Panel de Control de Mora y Suspensiones
- **Rol:** Frontend
- **Componente/Ruta:** `ControlMorosidad` (src/app/(admin)/admin/morosidad/page.tsx)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementó el Panel de Control de Morosidad en /admin/morosidad exclusivo para admin_nodexa. Permite el cambio de estado_pago mediante la Server Action actualizarEstadoPago e integra un CTA para notificar la suspensión al comercio vía enlace de WhatsApp pregenerado.

**Archivos Modificados:**
- `src/app/(admin)/admin/morosidad/page.tsx`
- `src/app/(admin)/admin/morosidad/ControlMorosidad.tsx`

**Contratos y API signatures:**
- `export default async function MorosidadAdminPage()`
- `export function ControlMorosidad({ clientesIniciales })`


--- 

## 🎯 HU: UI de Datos del Comercio y Centro de Ayuda
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero ver y configurar mis datos básicos de comercio y acceder a micro-tips para entender el uso de la plataforma.
```

### 📄 [✔ COMPLETADA] Páginas de Configuración y Centro de Ayuda Educativa
- **Rol:** Frontend
- **Componente/Ruta:** `AyudaYConfiguracion` (src/app/(app)/configuracion/page.tsx)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementó el formulario de datos del comercio en /configuracion y el centro de ayuda en /ayuda. El centro de ayuda filtra FAQs y muestra micro-tips educativos dinámicos en base a los módulos contratados y activos del tenant.

**Archivos Modificados:**
- `src/services/configuracion/actualizarDatosComercio.ts`
- `src/services/configuracion/actualizarDatosComercio.test.ts`
- `src/app/(app)/configuracion/page.tsx`
- `src/app/(app)/configuracion/FormularioConfiguracion.tsx`
- `src/app/(app)/ayuda/page.tsx`
- `src/app/(app)/ayuda/CentroAyuda.tsx`

**Contratos y API signatures:**
- `export async function actualizarDatosComercio(nombreComercio, telefonoWhatsapp, logoUrl)`
- `export default async function ConfiguracionPage()`
- `export default async function AyudaPage()`


--- 

## 🎯 HU: Pruebas de Componentes y E2E de Vistas de Recuperación (Playwright)
*Criterios de Aceptación/Descripción:*
```text
Como equipo de desarrollo quiero escribir pruebas unitarias de componentes y flujos de Playwright para las nuevas vistas creadas, garantizando el 80% de cobertura mínima de calidad.
```

### 📄 [✔ COMPLETADA] Suite de Pruebas de Interfaces de Recuperación
- **Rol:** QA
- **Componente/Ruta:** `auditoria-frontend-especs` (e2e/flujos-criticos/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementó la suite completa de pruebas Playwright E2E para el bloqueo de tenant_modules, edición de producto, movimientos de stock, ventas al fiado y abonos en cuenta corriente.

**Archivos Modificados:**
- `e2e/flujos-criticos/auditoria-frontend-especs.spec.ts`


--- 

