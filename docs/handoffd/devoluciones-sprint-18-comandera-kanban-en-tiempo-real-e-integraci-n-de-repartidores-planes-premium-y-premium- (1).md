# Handoffs y Entregables del Sprint - Sprint 18: Comandera Kanban en Tiempo Real e Integración de Repartidores (Planes Premium y Premium+)

**Objetivo:** Desarrollar la comanda web en tiempo real con tablero Kanban, mensajería rápida de cambio de estados y el módulo de deliverys (repartidores externos con acceso móvil y límites de hasta 2 cuentas).
**Capacidad:** 20 Ptos | **Duración:** 2 Semanas
**Estado del Sprint:** COMPLETADO

--- 

## 🎯 HU: Tablero de Comandas y Gestión de Pedidos en Tiempo Real
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero visualizar los pedidos en un tablero Kanban y arrastrarlos entre columnas (Pendiente, En Cocina, En Camino, Entregado) para controlar el flujo operativo en tiempo real.
```

### 📄 [✔ COMPLETADA] Base de Datos y Canales en Tiempo Real (Realtime)
- **Rol:** BD
- **Componente/Ruta:** `Tabla pedidos, items y suscripción realtime` (supabase/migrations/20260824030000_crear_comandas.sql)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se creó la migración 20260824030000_crear_comandas.sql definiendo las tablas pedidos_web y pedido_items con la columna metodo_pago para registrar el método seleccionado por el cliente, junto con el trigger de validación de JSONB datos_cliente y las políticas RLS multi-tenant. Se configuró la réplica completa y publicación en Supabase Realtime para la tabla pedidos_web, permitiendo la actualización automática del tablero Kanban sin recargar la pantalla. Se documentó el modelo en SCHEMA.md.

**Archivos Modificados:**
- `supabase/migrations/20260824030000_crear_comandas.sql`
- `docs/SCHEMA.md`

**Contratos y API signatures:**
- `TABLA pedidos_web (pedido_id, cliente_id, datos_cliente, metodo_pago, opcion_entrega, estado, subtotal, costo_envio, monto_ajuste, total, repartidor_id, creado_en)`
- `TABLA pedido_items (item_id, pedido_id, producto_id, variante_id, nombre, cantidad, precio_unitario, subtotal)`
- `PUBLICACIÓN supabase_realtime ADD TABLE pedidos_web`


### 📄 [✔ COMPLETADA] Tablero Kanban de Comandas
- **Rol:** Frontend
- **Componente/Ruta:** `TableroComandasKanban` (src/app/(app)/ventas/comandas/TableroComandasKanban.tsx)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementó la interfaz del Tablero Kanban de Comandas TableroComandasKanban.tsx organizada en 5 columnas de estado ('pendiente', 'en_preparacion', 'despachado', 'completado', 'cancelado'). Se incorporó la funcionalidad Drag & Drop HTML5 nativa para mover tarjetas y actualizar la base de datos de forma reactiva, junto con botones de acción rápida para abrir una ventana flotante de WhatsApp con mensajes de notificación formateados según el estado del pedido dirigidos al teléfono del cliente. Se validaron lint, build y pruebas unitarias en verde, registrando la PR #96 en GitHub.

**Archivos Modificados:**
- `src/app/(app)/ventas/comandas/TableroComandasKanban.tsx`
- `src/app/(app)/ventas/comandas/page.tsx`
- `src/app/(app)/ventas/comandas/TableroComandasKanban.test.tsx`

**Contratos y API signatures:**
- `TableroComandasKanban({ pedidosIniciales, nombreComercio, onCambiarEstadoPedido }: TableroComandasKanbanProps): JSX.Element`
- `PedidoKanban: { pedidoId: string, clienteId: string, datosCliente: { nombre: string, telefono: string, direccion?: string, notas?: string }, metodoPago: string, opcionEntrega: 'envio' | 'retiro', estado: EstadoPedidoKanban, subtotal: number, costoEnvio: number, montoAjuste: number, total: number, creadoEn: string, items: ItemPedidoKanban[] }`


--- 

## 🎯 HU: Gestión de Deliverys y Repartos (Plan Premium +)
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero crear hasta 2 cuentas de repartidor y asignarles pedidos directamente desde mi panel para que reciban la hoja de reparto en su celular.
```

### 📄 [✔ COMPLETADA] Cuentas de Delivery y Hoja de Reparto Móvil
- **Rol:** Backend
- **Componente/Ruta:** `DeliverysRepository / VistaMovilDelivery` (src/repositories/deliverysRepository.ts / src/app/(publico)/delivery/[repartidorId]/page.tsx)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementó el módulo de Cuentas de Delivery y Hoja de Reparto Móvil. Incluye la migración SQL 20260824040000_crear_repartidores.sql para la tabla repartidores, el repositorio deliverysRepository.ts y el servicio crearRepartidor.ts que valida estrictamente el cupo máximo de 2 repartidores activos retornando el código de error NX-DELIV-001. Se creó la interfaz móvil pública /delivery/[repartidorId] protegida con PIN de 4 dígitos con mapa directo en Google Maps y botón 'Marcar como Entregado', y se añadió el selector de asignación de repartidores en las tarjetas del Kanban de Comandas. Todo validado con pruebas unitarias en verde, build exitoso y PR #97 creada en GitHub.

**Archivos Modificados:**
- `supabase/migrations/20260824040000_crear_repartidores.sql`
- `src/repositories/deliverysRepository.ts`
- `src/services/deliverys/crearRepartidor.ts`
- `src/services/deliverys/crearRepartidor.test.ts`
- `src/app/(publico)/delivery/[repartidorId]/page.tsx`
- `src/app/(publico)/delivery/[repartidorId]/VistaMovilDelivery.tsx`
- `src/app/(app)/ventas/comandas/TableroComandasKanban.tsx`
- `docs/ERRORS.md`
- `docs/SCHEMA.md`

**Contratos y API signatures:**
- `crearRepartidor(supabase: SupabaseClient, clienteId: string, input: CrearRepartidorInput): Promise<ResultadoCrearRepartidor>`
- `contarRepartidoresActivos(supabase: SupabaseClient, clienteId: string): Promise<number>`
- `obtenerRepartidoresActivos(supabase: SupabaseClient, clienteId: string): Promise<RepartidorEntity[]>`
- `obtenerRepartidorPorId(supabase: SupabaseClient, repartidorId: string): Promise<RepartidorEntity | null>`
- `obtenerPedidosAsignadosARepartidor(supabase: SupabaseClient, repartidorId: string): Promise<PedidoDeliveryEntity[]>`
- `asignarRepartidorAPedido(supabase: SupabaseClient, pedidoId: string, repartidorId: string | null): Promise<void>`
- `VistaMovilDelivery({ repartidor, pedidosIniciales, onMarcarEntregado }: VistaMovilDeliveryProps): JSX.Element`


--- 

