# Handoffs y Entregables del Sprint - Sprint 8: Bot de WhatsApp, Facturación y Portabilidad de Datos

**Objetivo:** Entregar el Bot Estático de WhatsApp, la gestión de morosidad/límites contratados y la exportación de datos del comerciante.
**Capacidad:** 30 Ptos | **Duración:** 2 Semanas
**Estado del Sprint:** ACTIVO

--- 

## 🎯 HU: Configuración de mensajes automáticos del bot
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero configurar respuestas automáticas de horarios, ubicación y catálogo para que mis clientes reciban información básica aunque no pueda atender en el momento.
```

### 📄 [✔ COMPLETADA] Server Action actualizarConfiguracionBot
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `actualizarConfiguracionBot` (src/services/botWhatsapp/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Server Action actualizarConfiguracionBot con upsert por cliente_id sobre configuracion_bot_whatsapp, DTO Zod bifurcado a NX-BOT-002 al activar sin mensajes, gate de módulo bot_whatsapp (NX-BOT-001), y una migración nueva que cierra un gap real de RLS (empleado no debía tener acceso de escritura a esta tabla según docs/ROLES.md §2, pero la política heredada del patrón genérico no lo restringía).

**Archivos Modificados:**
- `src/services/botWhatsapp/actualizarConfiguracionBot.ts`
- `src/services/botWhatsapp/actualizarConfiguracionBot.test.ts`
- `src/services/botWhatsapp/tipos.ts`
- `src/lib/errores/catalogo.ts`
- `supabase/migrations/20260811190000_restringir_rol_configuracion_bot_whatsapp.sql`
- `supabase/migrations/20260811191000_seed_configuracion_bot_whatsapp.sql`

**Contratos y API signatures:**
- `actualizarConfiguracionBot(estadoPrevio: EstadoActualizarConfiguracionBot, formData: FormData): Promise<EstadoActualizarConfiguracionBot> — src/services/botWhatsapp/actualizarConfiguracionBot.ts`
- `EstadoActualizarConfiguracionBot { error: string | null; exito: boolean }, ESTADO_ACTUALIZAR_CONFIGURACION_BOT_INICIAL — src/services/botWhatsapp/tipos.ts`
- `CATALOGO_ERRORES['NX-BOT-001'], ['NX-BOT-002']`
- `SQL policies configuracion_bot_whatsapp_insert_tenant / configuracion_bot_whatsapp_update_tenant — ahora restringidas a auth_rol() = 'comerciante', NO aplicadas aún contra el proyecto real`
- `Migración seed_configuracion_bot_whatsapp: 2 filas (Ferretería El Tornillo, Bazar Casa Sur) — NO aplicada aún contra el proyecto real`


--- 

## 🎯 HU: Respuesta automática al cliente final
*Criterios de Aceptación/Descripción:*
```text
Como cliente final quiero recibir una respuesta automática al escribir al WhatsApp del comercio para obtener información inmediata sin esperar a que un humano esté disponible.
```

### 📄 [✔ COMPLETADA] Webhook de recepción de mensajes de WhatsApp
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `webhookWhatsapp` (app/api/webhooks/whatsapp/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se reemplazó el webhook entrante de WhatsApp por un FAQ en la vidriera pública (preguntas predefinidas por el comerciante, respuesta in-app, fallback opcional a wa.me), decisión tomada junto al usuario tras detectar que el ticket original asumía un proveedor de WhatsApp Business que no existe en el proyecto. Se agregó lectura pública acotada vía RLS y una columna nueva para el toggle de derivación a WhatsApp; verificado end-to-end en navegador real contra el proyecto Supabase real.

**Archivos Modificados:**
- `src/app/(publico)/c/[clienteSlug]/page.tsx`
- `src/components/catalogoWeb/BotFaqCatalogo.tsx`
- `src/lib/dominio/botWhatsapp/armarPreguntasBot.ts`
- `src/lib/dominio/botWhatsapp/armarPreguntasBot.test.ts`
- `src/repositories/configuracionBotRepository.ts`
- `src/repositories/configuracionBotRepository.test.ts`
- `src/lib/errores/catalogo.ts`
- `supabase/migrations/20260812100000_configuracion_bot_whatsapp_derivar_whatsapp.sql`
- `supabase/migrations/20260812101000_lectura_publica_bot_whatsapp.sql`
- `docs/SCHEMA.md`
- `docs/ROLES.md`
- `docs/SITEMAP.md`
- `docs/ERRORS.md`
- `.claude/launch.json`

**Contratos y API signatures:**
- `armarPreguntasBot(mensajes: MensajesConfiguracionBot): PreguntaBot[] — src/lib/dominio/botWhatsapp/armarPreguntasBot.ts`
- `obtenerConfiguracionBotPublica(supabase, clienteId): Promise<FilaConfiguracionBotPublica | null> — src/repositories/configuracionBotRepository.ts`
- `<BotFaqCatalogo clienteId nombreComercio numeroWhatsapp preguntas permiteDerivarWhatsapp /> — src/components/catalogoWeb/BotFaqCatalogo.tsx`
- `configuracion_bot_whatsapp.permite_derivar_whatsapp boolean NOT NULL DEFAULT true — nueva columna, aplicada contra el proyecto real`
- `SQL policies configuracion_bot_whatsapp_lectura_publica / tenant_modules_lectura_publica_bot — aplicadas contra el proyecto real`
- `CATALOGO_ERRORES['NX-BOT-003'] (resignificado: fallo interno no bloqueante, ya no 'webhook')`


--- 

## 🎯 HU: Actualización del estado de pago del comercio
*Criterios de Aceptación/Descripción:*
```text
Como administrador NODEXA quiero actualizar el estado_pago de un comercio según el flujo de morosidad para suspender o reactivar el acceso de forma controlada.
```

### 📄 [✔ COMPLETADA] Server Action actualizarEstadoPago
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `actualizarEstadoPago` (src/services/admin/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Server Action de suspensión/reactivación de estado_pago restringida a admin_nodexa, con auditoría y notificación wa.me. Se cerró un gap real de seguridad (el panel no bloqueaba comercios suspendidos) extendiendo el JWT hook existente, y se corrigió un código de error faltante en el catálogo detectado durante la verificación en vivo.

**Archivos Modificados:**
- `src/services/admin/actualizarEstadoPago.ts`
- `src/services/admin/actualizarEstadoPago.test.ts`
- `src/lib/dominio/facturacion/construirNotificacionEstadoPago.ts`
- `src/lib/dominio/facturacion/construirNotificacionEstadoPago.test.ts`
- `src/lib/errores/catalogo.ts`
- `src/proxy.ts`
- `src/lib/auth/decodificar-jwt.ts`
- `src/services/autenticacion/tipos.ts`
- `supabase/migrations/20260812110000_custom_access_token_hook_estado_pago.sql`

**Contratos y API signatures:**
- `actualizarEstadoPago(clienteId: string, nuevoEstadoPago: boolean): Promise<ResultadoRepositorio<{ estadoPago: boolean; notificacion: { mensaje: string; enlaceWhatsapp: string } }>> — src/services/admin/actualizarEstadoPago.ts`
- `construirNotificacionEstadoPago(nombreComercio, telefonoWhatsapp, nuevoEstadoPago): { mensaje, enlaceWhatsapp } — src/lib/dominio/facturacion/construirNotificacionEstadoPago.ts`
- `ClaimsSesion ahora incluye estado_pago: boolean | null — src/services/autenticacion/tipos.ts`
- `custom_access_token_hook ahora inyecta el claim estado_pago para comerciante/empleado — aplicado contra el proyecto real`
- `src/proxy.ts redirige a /login?error=NX-ADM-002 cuando claims.estado_pago === false (rol distinto de admin_nodexa)`
- `CATALOGO_ERRORES['NX-ADM-002'] (faltaba en el código, ya existía en docs/ERRORS.md)`


--- 

## 🎯 HU: Visualización de uso actual frente a límites contratados
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero ver en mi panel el uso actual de SKU y de cuota de IA frente a mis límites contratados para entender mi consumo en todo momento.
```

### 📄 [✔ COMPLETADA] Widget de consumo en /configuracion/facturacion
- **Rol:** Frontend / UX Engineer
- **Componente/Ruta:** `WidgetConsumo` (app/(app)/configuracion/facturacion/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Widget de consumo (SKU + cuota IA) con barras de progreso, reutilizando el cálculo ya existente de sprints anteriores en vez de duplicarlo. Página nueva restringida a comerciante, distinta del gate comerciante+empleado ya usado en /dashboard y /productos/carga-ia. Verificado end-to-end contra el proyecto Supabase real.

**Archivos Modificados:**
- `src/app/(app)/configuracion/facturacion/page.tsx`
- `src/components/facturacion/WidgetConsumo.tsx`
- `src/repositories/productosRepository.ts`
- `src/repositories/productosRepository.test.ts`

**Contratos y API signatures:**
- `obtenerPorcentajeUsoSku(supabase, clienteId): Promise<ResultadoRepositorio<UsoSku>> — src/repositories/productosRepository.ts`
- `UsoSku { activos: number; limiteSku: number; porcentaje: number }`
- `<WidgetConsumo etiqueta usado limite porcentaje className? /> — src/components/facturacion/WidgetConsumo.tsx`
- `Ruta: /configuracion/facturacion (exclusiva de comerciante)`


--- 

## 🎯 HU: Actualización de facturación tras ampliación de límites
*Criterios de Aceptación/Descripción:*
```text
Como administrador NODEXA quiero que al confirmarse una ampliación de limite_sku o cuota de IA se actualice el próximo período de facturación para mantener el cobro correcto del comercio.
```

### 📄 [✔ COMPLETADA] Actualización del próximo período de facturación en ampliaciones
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `actualizarFacturacionRecurrente` (src/services/admin/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se creó la primera entidad de facturación real del proyecto (ajustes_facturacion) y se conectaron ampliarLimiteSku/ampliarCuotaIA (esta última nueva) a montos reales según un esquema escalonado decreciente confirmado explícitamente con el usuario. Verificado end-to-end vía SQL contra el proyecto Supabase real dentro de una transacción con ROLLBACK.

**Archivos Modificados:**
- `src/services/admin/actualizarFacturacionRecurrente.ts`
- `src/services/admin/actualizarFacturacionRecurrente.test.ts`
- `src/services/admin/ampliarCuotaIA.ts`
- `src/services/admin/ampliarCuotaIA.test.ts`
- `src/services/admin/ampliarLimiteSku.ts`
- `src/services/admin/ampliarLimiteSku.test.ts`
- `src/lib/dominio/facturacion/calcularCostoPackSku.ts`
- `src/lib/dominio/facturacion/calcularCostoPackSku.test.ts`
- `supabase/migrations/20260812120000_crear_ajustes_facturacion.sql`
- `docs/SCHEMA.md`
- `docs/ROLES.md`

**Contratos y API signatures:**
- `actualizarFacturacionRecurrente(supabase, datos: DatosAjusteFacturacion): Promise<ResultadoRepositorio<FilaAjusteFacturacion>> — src/services/admin/actualizarFacturacionRecurrente.ts`
- `ConceptoAjusteFacturacion = 'pack_sku' | 'recarga_ia'`
- `ampliarCuotaIA(clienteId: string): Promise<ResultadoRepositorio<{ cuotaMensualIa: number; ajusteFacturacion: { monto; periodoFacturado } }>> — src/services/admin/ampliarCuotaIA.ts`
- `ampliarLimiteSku ahora retorna también ajusteFacturacion: { monto; periodoFacturado } | null`
- `calcularCostoPackSku(numeroPack), calcularCostoPacksSkuAgregados(packsPrevios, packsAgregados) — src/lib/dominio/facturacion/calcularCostoPackSku.ts`
- `COSTO_PRIMER_PACK_SKU_ARS=5000, DECREMENTO_POR_PACK_SKU_ARS=1000, COSTO_MINIMO_PACK_SKU_ARS=2000, COSTO_RECARGA_IA_ARS=3000, CUOTA_IA_POR_RECARGA=40`
- `Tabla ajustes_facturacion (docs/SCHEMA.md §17) — aplicada contra el proyecto real`


--- 

## 🎯 HU: Exportación de catálogo en CSV/JSON
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero exportar mi catálogo de productos en formato CSV o JSON para tener un respaldo propio de mi información.
```

### 📄 [✔ COMPLETADA] Route Handler de exportación de productos
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `exportarProductos` (app/api/export/productos/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Route Handler de exportación de catálogo restringido a comerciante, con paginación interna reutilizando obtenerProductosPaginados y serialización CSV con escapado RFC 4180. Verificado end-to-end contra el proyecto Supabase real con el catálogo de 910 productos de Ferretería El Tornillo.

**Archivos Modificados:**
- `src/app/api/export/productos/route.ts`
- `src/app/api/export/productos/route.test.ts`
- `src/lib/exportacion/serializarProductosCsv.ts`
- `src/lib/exportacion/serializarProductosCsv.test.ts`
- `src/repositories/productosRepository.ts`
- `src/repositories/productosRepository.test.ts`
- `docs/SITEMAP.md`

**Contratos y API signatures:**
- `GET /api/export/productos?formato=csv|json — src/app/api/export/productos/route.ts (401/403/400/500 normalizados + 200 CSV o JSON)`
- `obtenerTodosLosProductosActivos(supabase, clienteId): Promise<ResultadoRepositorio<FilaProductoListado[]>> — src/repositories/productosRepository.ts`
- `serializarProductosCsv(productos: FilaProductoListado[]): string — src/lib/exportacion/serializarProductosCsv.ts`


--- 

## 🎯 HU: Exportación de transacciones en CSV/JSON
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero exportar mis ventas y movimientos en formato CSV o JSON para poder analizarlos con mis propias herramientas.
```

### 📄 [✔ COMPLETADA] Route Handler de exportación de ventas y movimientos
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `exportarVentas` (app/api/export/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Route Handler de exportación de ventas/venta_items restringido a comerciante, con serializador CSV genérico compartido con la exportación de productos, paginación interna en bloques de 500, y defensa IDOR/BOLA explícita contra manipulación del parámetro clienteId. Verificado end-to-end contra el proyecto Supabase real con 100 ventas / 200 venta_items reales.

**Archivos Modificados:**
- `src/app/api/export/ventas/route.ts`
- `src/app/api/export/ventas/route.test.ts`
- `src/lib/exportacion/serializarCsv.ts`
- `src/lib/exportacion/serializarCsv.test.ts`
- `src/lib/exportacion/serializarVentasCsv.ts`
- `src/lib/exportacion/serializarVentasCsv.test.ts`
- `src/lib/exportacion/serializarProductosCsv.ts`
- `src/repositories/ventas.ts`
- `src/repositories/ventas.test.ts`
- `docs/SITEMAP.md`

**Contratos y API signatures:**
- `GET /api/export/ventas?formato=csv|json&clienteId? — src/app/api/export/ventas/route.ts (401/403/400/500 normalizados + 200 CSV o JSON)`
- `serializarCsv(encabezados: string[], filas: string[][]): string — src/lib/exportacion/serializarCsv.ts (genérico, sin conocer entidades de dominio)`
- `serializarVentasCsv(ventas: FilaVentaExport[], ventaItems: FilaVentaItemExport[]): string — src/lib/exportacion/serializarVentasCsv.ts`
- `obtenerVentasPaginadas / obtenerVentaItemsPaginados / obtenerTodasLasVentasActivas / obtenerTodosLosVentaItemsActivos — src/repositories/ventas.ts`
- `FilaVentaExport, FilaVentaItemExport, TAMANIO_PAGINA_EXPORTACION_VENTAS=500`


--- 

