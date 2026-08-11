-- ------------------------------------------------------------
-- ajustes_facturacion (docs/SCHEMA.md §17): registra los montos que se
-- suman al PRÓXIMO período de facturación de un comercio por ampliaciones
-- de limite_sku (esquema escalonado decreciente) o recargas de cuota de IA
-- (monto fijo). Tabla append-only: un ajuste ya emitido nunca se edita ni
-- se borra, mismo criterio que auditoria_diffs/movimientos_stock — sin
-- política de UPDATE/DELETE, Postgres deniega por defecto.
-- ------------------------------------------------------------
create table if not exists ajustes_facturacion (
  ajuste_facturacion_id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (cliente_id),
  concepto text not null check (concepto in ('pack_sku', 'recarga_ia')),
  monto numeric(12,2) not null check (monto >= 0),
  periodo_facturado date not null,
  creado_en timestamptz not null default now()
);

create index if not exists idx_ajustesfacturacion_cliente_periodo
  on ajustes_facturacion (cliente_id, periodo_facturado);

alter table ajustes_facturacion enable row level security;

-- Lectura: comerciante/empleado ven únicamente su tenant; admin_nodexa
-- lectura global de soporte (docs/ROLES.md §3.3, patrón genérico).
drop policy if exists ajustes_facturacion_select_tenant on ajustes_facturacion;
create policy ajustes_facturacion_select_tenant on ajustes_facturacion
  for select using (
    cliente_id = auth_cliente_id()
    or es_admin_nodexa()
  );

-- Escritura exclusiva de admin_nodexa (docs/ROLES.md §3.6): un comercio
-- nunca genera sus propios cargos de facturación, a diferencia del patrón
-- genérico de INSERT por tenant usado en el resto de las tablas de negocio.
drop policy if exists ajustes_facturacion_insert_admin on ajustes_facturacion;
create policy ajustes_facturacion_insert_admin on ajustes_facturacion
  for insert with check (es_admin_nodexa());
