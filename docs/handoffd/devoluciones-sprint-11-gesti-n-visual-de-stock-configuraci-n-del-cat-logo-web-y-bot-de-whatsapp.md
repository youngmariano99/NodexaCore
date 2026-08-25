# Handoffs y Entregables del Sprint - Sprint 11: Gestión Visual de Stock, Configuración del Catálogo Web y Bot de WhatsApp

**Objetivo:** Desarrollar la gestión visual de movimientos de stock y habilitar los paneles de administración del bot y de la vidriera pública para los comerciantes.
**Capacidad:** 30 Ptos | **Duración:** 2 Semanas
**Estado del Sprint:** ACTIVO

--- 

## 🎯 HU: UI de Registro de Movimientos de Stock
*Criterios de Aceptación/Descripción:*
```text
Como comerciante o empleado del comercio quiero abrir un modal desde la sección de stock para registrar entradas o salidas manuales de productos para ajustar el inventario.
```

### 📄 [✔ COMPLETADA] Modal de Carga de Movimientos de Stock
- **Rol:** Frontend
- **Componente/Ruta:** `ModalMovimientoStock` (src/app/(app)/stock/movimientos-stock.tsx)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se incorporó el botón y el modal ModalMovimientoStock para registrar entradas y salidas de stock. Se implementó un selector autocompletable con debounce del buscador de productos y se conectaron los envíos a las Server Actions de stock correspondientes. Se agregaron validaciones Fail-Fast en cliente y se invalidan las queries del historial de movimientos mediante la función invalidarMovimientosStock al finalizar con éxito.

**Archivos Modificados:**
- `src/app/(app)/stock/movimientos-stock.tsx`

**Contratos y API signatures:**
- `export function MovimientosStock()`


--- 

## 🎯 HU: Suscripción en Tiempo Real para Stock en UI (Realtime)
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero que el stock disponible de los productos se actualice en tiempo real en mi pantalla de mostrador y listados para evitar inconsistencias de inventario.
```

### 📄 [✔ COMPLETADA] Integración de Supabase Realtime para Productos y Stock
- **Rol:** Frontend
- **Componente/Ruta:** `useProductosPaginados / useBuscarProductos` (src/hooks/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementó la suscripción en tiempo real de Supabase Postgres Changes para stock/productos en los hooks del catálogo y mostrador. Se configuró el bypass de rate limiting mediante la variable DISABLE_RATE_LIMITER en la config de flujos-criticos de Playwright para evitar rate limits falsos positivos en el ambiente de testing.

**Archivos Modificados:**
- `src/hooks/useProductosPaginados.ts`
- `src/hooks/useBuscarProductos.ts`
- `src/lib/rate-limit/authLimiter.ts`
- `playwright.flujos-criticos.config.ts`


--- 

## 🎯 HU: UI de Publicación de Vidriera
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero configurar qué productos expongo en la vidriera pública mediante interruptores rápidos para controlar las ventas en línea.
```

### 📄 [✔ COMPLETADA] Pantalla de Publicación y Toggles del Catálogo Web
- **Rol:** Frontend
- **Componente/Ruta:** `ConfiguracionVidriera` (src/app/(app)/catalogo-web/page.tsx)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se creó la página /catalogo-web de publicación de vidriera. Muestra un listado de productos con switches para alternar su visibilidad en el catálogo online público, llamando a alternarPublicacionProducto. Realiza validación de integridad local (nombre, precio > 0, imagen) lanzando el código NX-WEB-002 si el producto es inválido para publicación.

**Archivos Modificados:**
- `src/app/(app)/catalogo-web/page.tsx`
- `src/repositories/productosRepository.ts`

**Contratos y API signatures:**
- `export default function ConfiguracionVidrieraPage()`


--- 

## 🎯 HU: UI de Configuración del Bot de WhatsApp
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero configurar los mensajes predefinidos de horarios, ubicación y catálogo de mi bot para automatizar respuestas a clientes finales.
```

### 📄 [✔ COMPLETADA] Formulario de Configuración del Bot Estático
- **Rol:** Frontend
- **Componente/Ruta:** `ConfiguracionBot` (src/app/(app)/whatsapp-bot/page.tsx)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se creó la página y formulario del bot en /whatsapp-bot. Soporta el estado del bot, campos de texto, derivación y se conecta con la Server Action actualizarConfiguracionBot. Se agregó soporte para permite_derivar_whatsapp en la Server Action y validación Fail-Fast en cliente con código NX-BOT-002.

**Archivos Modificados:**
- `src/app/(app)/whatsapp-bot/page.tsx`
- `src/app/(app)/whatsapp-bot/FormularioConfiguracionBot.tsx`
- `src/services/botWhatsapp/actualizarConfiguracionBot.ts`

**Contratos y API signatures:**
- `export default function WhatsappBotPage()`
- `export function FormularioConfiguracionBot({ configInicial }: FormularioConfiguracionBotProps)`


--- 

