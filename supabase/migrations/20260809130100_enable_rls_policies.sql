-- ============================================================
-- enable_rls_policies
-- Habilita RLS y aplica el patrón de aislamiento multi-tenant (docs/ROLES.md
-- §3.2 a §3.7) sobre las tablas de negocio creadas en
-- crear_tablas_negocio.sql. clientes, usuarios y tenant_modules ya tienen su
-- RLS particular desde init_enums_y_tablas_core.sql y no se tocan acá: sus
-- reglas de escritura están deliberadamente restringidas por rol (admin_nodexa
-- para clientes/tenant_modules, comerciante para usuarios), no siguen el
-- patrón genérico de tabla operativa por tenant.
-- Reejecutable: enable row level security es idempotente; drop policy if
-- exists antes de cada create policy.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Funciones helper de autorización (docs/ROLES.md §3.2). Ya existen desde
-- init_enums_y_tablas_core.sql; se redeclaran acá (create or replace = no-op
-- si no cambiaron) para que esta migración sea autocontenida, tal como pide
-- el checklist de la actividad.
-- ------------------------------------------------------------
create or replace function auth_cliente_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select (auth.jwt() ->> 'cliente_id')::uuid
$$;

create or replace function auth_rol()
returns rol_usuario
language sql
stable
set search_path = ''
as $$
  select (auth.jwt() ->> 'rol')::public.rol_usuario
$$;

create or replace function es_admin_nodexa()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.auth_rol() = 'admin_nodexa'
$$;

-- ------------------------------------------------------------
-- 1. productos — patrón general (docs/ROLES.md §3.3) + regla especial de
-- §3.4 (empleado no ejecuta baja lógica) + lectura pública de §3.5.
-- ------------------------------------------------------------
alter table productos enable row level security;

drop policy if exists productos_select_tenant on productos;
create policy productos_select_tenant on productos
  for select using (
    cliente_id = auth_cliente_id()
    or es_admin_nodexa()
  );

drop policy if exists productos_lectura_publica on productos;
create policy productos_lectura_publica on productos
  for select using (
    publicado = true
    and eliminado_en is null
  );

drop policy if exists productos_insert_tenant on productos;
create policy productos_insert_tenant on productos
  for insert with check (cliente_id = auth_cliente_id());

drop policy if exists productos_update_tenant on productos;
create policy productos_update_tenant on productos
  for update using (cliente_id = auth_cliente_id())
  with check (
    cliente_id = auth_cliente_id()
    and (
      auth_rol() = 'comerciante'
      or (auth_rol() = 'empleado' and eliminado_en is null)
    )
  );

-- ------------------------------------------------------------
-- 2. clientes_finales — patrón general + regla especial de docs/ROLES.md
-- §3.4 (empleado no modifica saldo_deudor directamente, solo vía
-- movimientos_cuenta_corriente: UPDATE exclusivo de comerciante).
-- ------------------------------------------------------------
alter table clientes_finales enable row level security;

drop policy if exists clientes_finales_select_tenant on clientes_finales;
create policy clientes_finales_select_tenant on clientes_finales
  for select using (
    cliente_id = auth_cliente_id()
    or es_admin_nodexa()
  );

drop policy if exists clientes_finales_insert_tenant on clientes_finales;
create policy clientes_finales_insert_tenant on clientes_finales
  for insert with check (cliente_id = auth_cliente_id());

drop policy if exists clientes_finales_update_tenant on clientes_finales;
create policy clientes_finales_update_tenant on clientes_finales
  for update using (cliente_id = auth_cliente_id())
  with check (
    cliente_id = auth_cliente_id()
    and auth_rol() = 'comerciante'
  );

-- ------------------------------------------------------------
-- 3. ventas — patrón general (docs/ROLES.md §3.3). La restricción de
-- "empleado no autoriza devoluciones" es de negocio (Server Action), no de
-- RLS, según nota de matriz de docs/ROLES.md §2.
-- ------------------------------------------------------------
alter table ventas enable row level security;

drop policy if exists ventas_select_tenant on ventas;
create policy ventas_select_tenant on ventas
  for select using (
    cliente_id = auth_cliente_id()
    or es_admin_nodexa()
  );

drop policy if exists ventas_insert_tenant on ventas;
create policy ventas_insert_tenant on ventas
  for insert with check (cliente_id = auth_cliente_id());

drop policy if exists ventas_update_tenant on ventas;
create policy ventas_update_tenant on ventas
  for update using (cliente_id = auth_cliente_id())
  with check (cliente_id = auth_cliente_id());

-- ------------------------------------------------------------
-- 4. venta_items — append-only (docs/SCHEMA.md §8/§18: sin UPDATE). No tiene
-- columna cliente_id propia: el aislamiento se resuelve vía subconsulta a
-- ventas (dueña de la fila referenciada).
-- ------------------------------------------------------------
alter table venta_items enable row level security;

drop policy if exists venta_items_select_tenant on venta_items;
create policy venta_items_select_tenant on venta_items
  for select using (
    es_admin_nodexa()
    or exists (
      select 1 from ventas
      where ventas.venta_id = venta_items.venta_id
        and ventas.cliente_id = auth_cliente_id()
    )
  );

drop policy if exists venta_items_insert_tenant on venta_items;
create policy venta_items_insert_tenant on venta_items
  for insert with check (
    exists (
      select 1 from ventas
      where ventas.venta_id = venta_items.venta_id
        and ventas.cliente_id = auth_cliente_id()
    )
  );

-- ------------------------------------------------------------
-- 5. devoluciones — patrón general.
-- ------------------------------------------------------------
alter table devoluciones enable row level security;

drop policy if exists devoluciones_select_tenant on devoluciones;
create policy devoluciones_select_tenant on devoluciones
  for select using (
    cliente_id = auth_cliente_id()
    or es_admin_nodexa()
  );

drop policy if exists devoluciones_insert_tenant on devoluciones;
create policy devoluciones_insert_tenant on devoluciones
  for insert with check (cliente_id = auth_cliente_id());

drop policy if exists devoluciones_update_tenant on devoluciones;
create policy devoluciones_update_tenant on devoluciones
  for update using (cliente_id = auth_cliente_id())
  with check (cliente_id = auth_cliente_id());

-- ------------------------------------------------------------
-- 6. movimientos_stock — append-only (docs/ROLES.md §3.7: sin UPDATE).
-- ------------------------------------------------------------
alter table movimientos_stock enable row level security;

drop policy if exists movimientos_stock_select_tenant on movimientos_stock;
create policy movimientos_stock_select_tenant on movimientos_stock
  for select using (
    cliente_id = auth_cliente_id()
    or es_admin_nodexa()
  );

drop policy if exists movimientos_stock_insert_tenant on movimientos_stock;
create policy movimientos_stock_insert_tenant on movimientos_stock
  for insert with check (cliente_id = auth_cliente_id());

-- ------------------------------------------------------------
-- 7. devolucion_items — append-only, sin columna cliente_id propia:
-- aislamiento vía subconsulta a devoluciones (mismo patrón que venta_items).
-- ------------------------------------------------------------
alter table devolucion_items enable row level security;

drop policy if exists devolucion_items_select_tenant on devolucion_items;
create policy devolucion_items_select_tenant on devolucion_items
  for select using (
    es_admin_nodexa()
    or exists (
      select 1 from devoluciones
      where devoluciones.devolucion_id = devolucion_items.devolucion_id
        and devoluciones.cliente_id = auth_cliente_id()
    )
  );

drop policy if exists devolucion_items_insert_tenant on devolucion_items;
create policy devolucion_items_insert_tenant on devolucion_items
  for insert with check (
    exists (
      select 1 from devoluciones
      where devoluciones.devolucion_id = devolucion_items.devolucion_id
        and devoluciones.cliente_id = auth_cliente_id()
    )
  );

-- ------------------------------------------------------------
-- 8. notas_credito — patrón general. Sin UPDATE: una nota de crédito emitida
-- no se modifica (SCHEMA.md §13 no define ningún caso de edición posterior).
-- ------------------------------------------------------------
alter table notas_credito enable row level security;

drop policy if exists notas_credito_select_tenant on notas_credito;
create policy notas_credito_select_tenant on notas_credito
  for select using (
    cliente_id = auth_cliente_id()
    or es_admin_nodexa()
  );

drop policy if exists notas_credito_insert_tenant on notas_credito;
create policy notas_credito_insert_tenant on notas_credito
  for insert with check (cliente_id = auth_cliente_id());

-- ------------------------------------------------------------
-- 9. movimientos_cuenta_corriente — append-only, sin columna cliente_id
-- propia: aislamiento vía subconsulta a clientes_finales.
-- ------------------------------------------------------------
alter table movimientos_cuenta_corriente enable row level security;

drop policy if exists movimientos_cuenta_corriente_select_tenant on movimientos_cuenta_corriente;
create policy movimientos_cuenta_corriente_select_tenant on movimientos_cuenta_corriente
  for select using (
    es_admin_nodexa()
    or exists (
      select 1 from clientes_finales
      where clientes_finales.cliente_final_id = movimientos_cuenta_corriente.cliente_final_id
        and clientes_finales.cliente_id = auth_cliente_id()
    )
  );

drop policy if exists movimientos_cuenta_corriente_insert_tenant on movimientos_cuenta_corriente;
create policy movimientos_cuenta_corriente_insert_tenant on movimientos_cuenta_corriente
  for insert with check (
    exists (
      select 1 from clientes_finales
      where clientes_finales.cliente_final_id = movimientos_cuenta_corriente.cliente_final_id
        and clientes_finales.cliente_id = auth_cliente_id()
    )
  );

-- ------------------------------------------------------------
-- 10. cargas_ia — patrón general.
-- ------------------------------------------------------------
alter table cargas_ia enable row level security;

drop policy if exists cargas_ia_select_tenant on cargas_ia;
create policy cargas_ia_select_tenant on cargas_ia
  for select using (
    cliente_id = auth_cliente_id()
    or es_admin_nodexa()
  );

drop policy if exists cargas_ia_insert_tenant on cargas_ia;
create policy cargas_ia_insert_tenant on cargas_ia
  for insert with check (cliente_id = auth_cliente_id());

drop policy if exists cargas_ia_update_tenant on cargas_ia;
create policy cargas_ia_update_tenant on cargas_ia
  for update using (cliente_id = auth_cliente_id())
  with check (cliente_id = auth_cliente_id());

-- ------------------------------------------------------------
-- 11. configuracion_bot_whatsapp — patrón general (PK = cliente_id). El
-- cliente_final (visitante del bot) no consulta esta tabla directamente
-- (docs/ROLES.md §2: respuesta automática servida server-side), por eso no
-- lleva una política de lectura pública como productos.
-- ------------------------------------------------------------
alter table configuracion_bot_whatsapp enable row level security;

drop policy if exists configuracion_bot_whatsapp_select_tenant on configuracion_bot_whatsapp;
create policy configuracion_bot_whatsapp_select_tenant on configuracion_bot_whatsapp
  for select using (
    cliente_id = auth_cliente_id()
    or es_admin_nodexa()
  );

drop policy if exists configuracion_bot_whatsapp_insert_tenant on configuracion_bot_whatsapp;
create policy configuracion_bot_whatsapp_insert_tenant on configuracion_bot_whatsapp
  for insert with check (cliente_id = auth_cliente_id());

drop policy if exists configuracion_bot_whatsapp_update_tenant on configuracion_bot_whatsapp;
create policy configuracion_bot_whatsapp_update_tenant on configuracion_bot_whatsapp
  for update using (cliente_id = auth_cliente_id())
  with check (cliente_id = auth_cliente_id());

-- ------------------------------------------------------------
-- 12. auditoria_diffs — append-only (docs/ROLES.md §3.7: sin UPDATE/DELETE,
-- cualquier intento es denegado por defecto al no existir política).
-- ------------------------------------------------------------
alter table auditoria_diffs enable row level security;

drop policy if exists auditoria_select on auditoria_diffs;
create policy auditoria_select on auditoria_diffs
  for select using (
    cliente_id = auth_cliente_id()
    or es_admin_nodexa()
  );

drop policy if exists auditoria_insert_sistema on auditoria_diffs;
create policy auditoria_insert_sistema on auditoria_diffs
  for insert with check (cliente_id = auth_cliente_id());
