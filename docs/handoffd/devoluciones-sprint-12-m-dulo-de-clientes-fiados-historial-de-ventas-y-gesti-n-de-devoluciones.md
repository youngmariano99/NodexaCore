# Handoffs y Entregables del Sprint - Sprint 12: Módulo de Clientes (Fiados), Historial de Ventas y Gestión de Devoluciones

**Objetivo:** Habilitar la gestión y cobro a clientes registrados (Fiado) y toda la interfaz para consultar ventas y registrar notas de crédito por devoluciones.
**Capacidad:** 30 Ptos | **Duración:** 2 Semanas
**Estado del Sprint:** ACTIVO

--- 

## 🎯 HU: UI de Listado y Registro de Clientes (Fiados)
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero acceder a la sección de clientes para ver mi cartera de clientes fiados y dar de alta nuevos clientes de forma visual.
```

### 📄 [✔ COMPLETADA] Listado General y Formulario de Alta de Clientes
- **Rol:** Frontend
- **Componente/Ruta:** `ListadoClientesFinales` (src/app/(app)/clientes/page.tsx)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementó la vista general de clientes y el modal FormularioCrearClienteFinal de alta en /clientes. Valida duplicidad telefónica con el código NX-FIA-005 en cliente y actualiza el listado en tiempo real al guardar.

**Archivos Modificados:**
- `src/app/(app)/clientes/page.tsx`
- `src/app/(app)/clientes/FormularioCrearClienteFinal.tsx`

**Contratos y API signatures:**
- `export default async function ClientesPage({ searchParams })`
- `export function FormularioCrearClienteFinal()`


--- 

## 🎯 HU: Selector de Clientes en el Mostrador y Pago Integrado
*Criterios de Aceptación/Descripción:*
```text
Como cajero quiero seleccionar un cliente registrado en el mostrador para imputar el cobro a su cuenta corriente como fiado de forma directa.
```

### 📄 [✔ COMPLETADA] Integración de Cuentas Corrientes en el Panel de Ventas
- **Rol:** Frontend
- **Componente/Ruta:** `SelectorClienteMostrador` (src/app/(app)/mostrador/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se integró el SelectorClienteMostrador en el panel del Mostrador. El ID del cliente seleccionado se envía como hidden input a través de ConfirmarCobro hacia la Server Action confirmarVenta. El saldo deudor del cliente se incrementa de forma segura mediante la llamada transaccional al RPC en la base de datos.

**Archivos Modificados:**
- `src/hooks/useBuscarClientesFinales.ts`
- `src/app/(app)/mostrador/SelectorClienteMostrador.tsx`
- `src/app/(app)/mostrador/BuscadorProductos.tsx`
- `src/app/(app)/mostrador/ConfirmarCobro.tsx`

**Contratos y API signatures:**
- `export function useBuscarClientesFinales(termino)`
- `export function SelectorClienteMostrador({ clienteSeleccionado, onSeleccionarCliente })`
- `export function ConfirmarCobro(props)`


--- 

## 🎯 HU: Registro de Pagos de Cuenta Corriente
*Criterios de Aceptación/Descripción:*
```text
Como comerciante o empleado quiero registrar un pago parcial o total de la deuda de un cliente en su ficha para deducir su saldo deudor.
```

### 📄 [✔ COMPLETADA] Formulario de Cobro en Ficha de Cuenta Corriente
- **Rol:** Frontend
- **Componente/Ruta:** `FormularioPagoCuentaCorriente` (src/app/(app)/clientes/[clienteFinalId]/page.tsx)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementó el modal FormularioPagoCuentaCorriente en la ficha de cuenta corriente. Valida en cliente y servidor que el cobro no supere el saldo deudor actual (código NX-FIA-003) y reduce el saldo en tiempo real al actualizar la UI de manera reactiva tras cada pago exitoso.

**Archivos Modificados:**
- `src/app/(app)/clientes/[clienteFinalId]/page.tsx`
- `src/app/(app)/clientes/[clienteFinalId]/FormularioPagoCuentaCorriente.tsx`

**Contratos y API signatures:**
- `export function FormularioPagoCuentaCorriente({ clienteFinalId, saldoDeudor })`


--- 

## 🎯 HU: UI de Historial y Detalle de Ventas
*Criterios de Aceptación/Descripción:*
```text
Como comerciante o empleado del comercio quiero ver el historial de ventas concretadas y consultar su desglose de productos para tener control de caja e iniciar devoluciones.
```

### 📄 [✔ COMPLETADA] Desarrollo del Historial de Ventas y Vista de Detalle
- **Rol:** Frontend
- **Componente/Ruta:** `HistorialVentas` (src/app/(app)/ventas/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementó el historial de ventas paginado en /ventas y el desglose de venta en /ventas/[ventaId] con protección RLS BOLA, carga persistida de ítems y redirección a /devoluciones/nueva si el módulo correspondiente se encuentra activo.

**Archivos Modificados:**
- `src/app/(app)/ventas/page.tsx`
- `src/app/(app)/ventas/[ventaId]/page.tsx`

**Contratos y API signatures:**
- `export default async function HistorialVentasPage({ searchParams })`
- `export default async function DetalleVentaPage({ params })`


--- 

## 🎯 HU: UI de Listado y Registro de Devoluciones
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero registrar devoluciones de productos y emitir notas de crédito para mantener el stock y la facturación cuadrados.
```

### 📄 [✔ COMPLETADA] Interfaz para Registrar Devolución de Ventas
- **Rol:** Frontend
- **Componente/Ruta:** `FormularioDevolucion` (src/app/(app)/devoluciones/nueva/page.tsx)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementó el flujo completo de devoluciones en /devoluciones/nueva y el listado histórico en /devoluciones. Se agregaron validaciones de cantidades en cliente con código NX-DEV-002 y se integraron las notas de crédito de la base de datos.

**Archivos Modificados:**
- `src/app/(app)/devoluciones/nueva/page.tsx`
- `src/app/(app)/devoluciones/nueva/FormularioDevolucion.tsx`
- `src/app/(app)/devoluciones/page.tsx`

**Contratos y API signatures:**
- `export default async function NuevaDevolucionPage({ searchParams })`
- `export function FormularioDevolucion({ ventaId, itemsVenta })`
- `export default async function DevolucionesPage({ searchParams })`


--- 

