# Handoffs y Entregables del Sprint - Sprint 20: Trazabilidad, Logística y Sanitización

**Objetivo:** Completar la información de costos de inventario, adaptar pedidos web para ruteo avanzado, e implementar sanitización robusta en Backend.
**Capacidad:** 24 Ptos | **Duración:** 2 Semanas
**Estado del Sprint:** PLANIFICADO

--- 

## 🎯 HU: Costos y Códigos de Barras en Catálogo
*Criterios de Aceptación/Descripción:*
```text
Como encargado de inventario quiero registrar el costo promedio y códigos universales en los productos para calcular la rentabilidad real y operar con escáneres.
```

### 📄 [✔ COMPLETADA] Extender esquema de productos para costos
- **Rol:** BD
- **Componente/Ruta:** `migracion_costos_inventario.sql` (supabase/migrations)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se creó la migración DDL que extiende la entidad productos con las columnas de costo (costo_promedio, ultimo_costo) y codigo_barras junto con su respectivo índice parcial filtrado por tenant. Asimismo, se agregó costo_unitario a movimientos_stock para persistir el costo histórico unitario al momento de asentar entradas y salidas de stock. Se actualizó SCHEMA.md.

**Archivos Modificados:**
- `supabase/migrations/20260831040000_migracion_costos_inventario.sql`
- `docs/SCHEMA.md`

**Contratos y API signatures:**
- `productos (costo_promedio, ultimo_costo, codigo_barras)`
- `movimientos_stock (costo_unitario)`
- `idx_productos_codigo_barras`


--- 

## 🎯 HU: Saneamiento Automático de Datos Contables
*Criterios de Aceptación/Descripción:*
```text
Como administrador de base de datos quiero que el backend sanitice automáticamente teléfonos, CUITs, y montos financieros antes de procesarlos para evitar la corrupción de datos.
```

### 📄 [✔ COMPLETADA] Implementar transformadores Zod en Server Actions
- **Rol:** Backend
- **Componente/Ruta:** `Varios Server Actions` (src/services/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementó una suite modular de transformadores y esquemas Zod en src/lib/validaciones/transformadores.ts para el saneamiento automático de importes contables y teléfonos. Se integró en los Server Actions de Productos, Ventas, Cuentas Corrientes, Clientes Finales y Configuración de Comercio, previniendo errores de conversión de moneda local argentina (puntos de miles y comas decimales) y normalizando números telefónicos.

**Archivos Modificados:**
- `src/lib/validaciones/transformadores.ts`
- `src/lib/validaciones/transformadores.test.ts`
- `src/services/productos/crearProducto.ts`
- `src/services/productos/actualizarProducto.ts`
- `src/services/ventas/confirmarVenta.ts`
- `src/services/fiados/registrarPagoCuentaCorriente.ts`
- `src/services/fiados/crearClienteFinal.ts`
- `src/services/admin/crearCliente.ts`
- `src/services/configuracion/actualizarDatosComercio.ts`

**Contratos y API signatures:**
- `transformarNumeroLocal(valor: unknown): number`
- `transformarTelefono(valor: unknown): string | null`
- `zMonedaNoNegativa(mensajeObligatorio?: string, mensajeNoNegativo?: string)`
- `zMonedaPositiva(mensajeObligatorio?: string, mensajePositivo?: string)`
- `zTelefonoOpcional()`
- `zTelefonoObligatorio(mensajeObligatorio?: string)`


--- 

## 🎯 HU: Validación de Geolocalización en Pedidos Web
*Criterios de Aceptación/Descripción:*
```text
Como encargado de logística quiero que los pedidos web con envío registren obligatoriamente coordenadas para integrarse con mapas.
```

### 📄 [✔ COMPLETADA] Actualizar trigger validador de comandas
- **Rol:** BD
- **Componente/Ruta:** `actualizar_trigger_comandas.sql` (supabase/migrations)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se actualizó la función trigger fn_validar_pedido_web() para validar y exigir que todo pedido web con opcion_entrega = 'envio' contenga obligatoriamente coordenadas 'latitud' y 'longitud' dentro del objeto JSONB datos_cliente. Se actualizaron las interfaces TypeScript en deliverysRepository, el seed de base de datos con coordenadas para entregas a domicilio, el botón de navegación 'Cómo llegar' en la vista del repartidor móvil, y la documentación en SCHEMA.md.

**Archivos Modificados:**
- `supabase/migrations/20260831030000_actualizar_trigger_comandas.sql`
- `supabase/seed.sql`
- `src/repositories/deliverysRepository.ts`
- `src/app/(publico)/delivery/[repartidorId]/VistaMovilDelivery.tsx`
- `docs/SCHEMA.md`

**Contratos y API signatures:**
- `fn_validar_pedido_web()`
- `PedidoDeliveryEntity.datos_cliente (latitud?: number | string, longitud?: number | string)`


--- 

