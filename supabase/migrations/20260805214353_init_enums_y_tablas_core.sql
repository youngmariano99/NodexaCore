-- ============================================================
-- init_enums_y_tablas_core
-- Tipos ENUM base + tablas clientes, usuarios, tenant_modules
-- Fuente: docs/SCHEMA.md (§1, §2, §3, §4, §18) y docs/ROLES.md (§2, §3.2, §3.3, §3.6)
-- Reejecutable: guardas idempotentes (pg_type, IF NOT EXISTS, DROP POLICY IF EXISTS)
-- ============================================================

-- ------------------------------------------------------------
-- 0. Extensiones
-- ------------------------------------------------------------
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. Tipos Enumerados (docs/SCHEMA.md §1)
-- ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'rol_usuario') then
    create type rol_usuario as enum ('admin_nodexa', 'comerciante', 'empleado');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'modulo_nodexa') then
    create type modulo_nodexa as enum ('catalogo_web', 'carga_ia', 'fiados', 'devoluciones', 'bot_whatsapp');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_movimiento_stock') then
    create type tipo_movimiento_stock as enum ('entrada', 'salida');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'estado_venta') then
    create type estado_venta as enum ('confirmada', 'devuelta_parcial', 'devuelta_total');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_movimiento_cuenta') then
    create type tipo_movimiento_cuenta as enum ('cargo', 'pago');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'estado_devolucion') then
    create type estado_devolucion as enum ('registrada', 'procesada');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'origen_alta_producto') then
    create type origen_alta_producto as enum ('manual', 'excel', 'ia_vision');
  end if;
end $$;

-- ------------------------------------------------------------
-- 2. Funciones Helper de Autorización (docs/ROLES.md §3.2)
-- Requeridas por las políticas RLS definidas más abajo.
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
-- 3. Tabla: clientes (Tenant / Comercio) — docs/SCHEMA.md §2
-- ------------------------------------------------------------
create table if not exists clientes (
  cliente_id uuid primary key default gen_random_uuid(),
  nombre_comercio text not null,
  slug text not null unique,
  estado_pago boolean not null default true,
  limite_sku integer not null default 1000 check (limite_sku > 0),
  cuota_mensual_ia integer not null default 40,
  ia_consultas_usadas integer not null default 0 check (ia_consultas_usadas >= 0),
  ia_periodo_actual date not null default date_trunc('month', now()),
  logo_url text,
  color_primario text,
  dominio_personalizado text unique,
  telefono_whatsapp text not null,
  creado_en timestamptz not null default now(),
  eliminado_en timestamptz
);

create index if not exists idx_clientes_slug on clientes (slug);
create index if not exists idx_clientes_estado_pago on clientes (estado_pago);

-- ------------------------------------------------------------
-- 4. Tabla: usuarios — docs/SCHEMA.md §3
-- Extiende auth.users 1:1 vía auth_user_id.
-- ------------------------------------------------------------
create table if not exists usuarios (
  usuario_id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id),
  cliente_id uuid references clientes (cliente_id),
  rol rol_usuario not null,
  nombre text not null,
  email text not null unique,
  creado_en timestamptz not null default now(),
  eliminado_en timestamptz,
  constraint chk_usuarios_rol_cliente check (
    (rol = 'admin_nodexa' and cliente_id is null)
    or (rol != 'admin_nodexa' and cliente_id is not null)
  )
);

create index if not exists idx_usuarios_cliente_id on usuarios (cliente_id);

-- ------------------------------------------------------------
-- 5. Tabla: tenant_modules (Feature Flags) — docs/SCHEMA.md §4
-- ------------------------------------------------------------
create table if not exists tenant_modules (
  tenant_module_id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (cliente_id),
  modulo modulo_nodexa not null,
  activo boolean not null default true,
  activado_en timestamptz not null default now(),
  desactivado_en timestamptz,
  constraint uq_tenant_modules_cliente_modulo unique (cliente_id, modulo)
);

create index if not exists idx_tenant_modules_cliente on tenant_modules (cliente_id, modulo);

-- ------------------------------------------------------------
-- 6. RLS: clientes — docs/ROLES.md §3.6
-- Sin política INSERT: el alta comercial la ejecuta service_role
-- desde procesos administrativos (docs/ROLES.md §3.9), nunca el cliente.
-- ------------------------------------------------------------
alter table clientes enable row level security;

drop policy if exists clientes_select on clientes;
create policy clientes_select on clientes
  for select using (
    cliente_id = auth_cliente_id()
    or es_admin_nodexa()
  );

drop policy if exists clientes_update_admin on clientes;
create policy clientes_update_admin on clientes
  for update using (es_admin_nodexa())
  with check (es_admin_nodexa());

-- ------------------------------------------------------------
-- 7. RLS: usuarios — patrón derivado de la matriz de permisos
-- (docs/ROLES.md §2, fila "usuarios"): admin_nodexa lee todo (soporte),
-- comerciante gestiona su propio tenant, empleado solo lee su propia fila.
-- ------------------------------------------------------------
alter table usuarios enable row level security;

drop policy if exists usuarios_select on usuarios;
create policy usuarios_select on usuarios
  for select using (
    es_admin_nodexa()
    or (cliente_id = auth_cliente_id() and auth_rol() = 'comerciante')
    or auth_user_id = auth.uid()
  );

drop policy if exists usuarios_insert_comerciante on usuarios;
create policy usuarios_insert_comerciante on usuarios
  for insert with check (
    cliente_id = auth_cliente_id()
    and auth_rol() = 'comerciante'
  );

drop policy if exists usuarios_update_comerciante on usuarios;
create policy usuarios_update_comerciante on usuarios
  for update using (
    cliente_id = auth_cliente_id()
    and auth_rol() = 'comerciante'
  )
  with check (
    cliente_id = auth_cliente_id()
    and auth_rol() = 'comerciante'
  );

-- ------------------------------------------------------------
-- 8. RLS: tenant_modules — docs/ROLES.md §2 (fila "tenant_modules":
-- admin_nodexa C·L·M, comerciante y empleado solo L). No se aplica acá
-- el patrón genérico de escritura por tenant de §3.3: la activación de
-- módulos es una operación comercial exclusiva de admin_nodexa.
-- ------------------------------------------------------------
alter table tenant_modules enable row level security;

drop policy if exists tenant_modules_select_tenant on tenant_modules;
create policy tenant_modules_select_tenant on tenant_modules
  for select using (
    cliente_id = auth_cliente_id()
    or es_admin_nodexa()
  );

drop policy if exists tenant_modules_insert_admin on tenant_modules;
create policy tenant_modules_insert_admin on tenant_modules
  for insert with check (es_admin_nodexa());

drop policy if exists tenant_modules_update_admin on tenant_modules;
create policy tenant_modules_update_admin on tenant_modules
  for update using (es_admin_nodexa())
  with check (es_admin_nodexa());

-- ------------------------------------------------------------
-- 9. Siembra mínima de humo (no reemplaza el lote volumétrico de
-- docs/SEED.md, que se aplicará en una estación posterior):
-- valida que las migraciones permiten operaciones CRUD básicas.
-- ------------------------------------------------------------
insert into clientes (nombre_comercio, slug, telefono_whatsapp)
values ('Demo Nodexa', 'demo-nodexa', '+5492920000000')
on conflict (slug) do nothing;
