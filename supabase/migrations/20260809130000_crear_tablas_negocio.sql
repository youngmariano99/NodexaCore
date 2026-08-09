-- ============================================================
-- crear_tablas_negocio
-- Tablas de negocio de docs/SCHEMA.md §5-16, creadas en orden de dependencia
-- de FKs. Prerrequisito de enable_rls_policies.sql: no se puede habilitar RLS
-- ni crear políticas sobre tablas que todavía no existen (solo clientes,
-- usuarios y tenant_modules fueron creadas en init_enums_y_tablas_core.sql).
-- Reejecutable: create table if not exists + create index if not exists.
-- ============================================================

-- ------------------------------------------------------------
-- 1. productos — docs/SCHEMA.md §5
-- ------------------------------------------------------------
create table if not exists productos (
  producto_id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (cliente_id),
  sku text not null,
  nombre text not null,
  descripcion text,
  categoria text,
  precio numeric(12,2) not null check (precio >= 0),
  stock_actual integer not null default 0 check (stock_actual >= 0),
  imagen_url text,
  publicado boolean not null default false,
  origen_alta origen_alta_producto not null default 'manual',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  eliminado_en timestamptz,
  constraint uq_productos_cliente_sku unique (cliente_id, sku)
);

create index if not exists idx_productos_cliente_publicado
  on productos (cliente_id, publicado) where eliminado_en is null;
create index if not exists idx_productos_cliente_activos
  on productos (cliente_id) where eliminado_en is null;

-- ------------------------------------------------------------
-- 2. clientes_finales (Módulo Fiados) — docs/SCHEMA.md §9
-- ------------------------------------------------------------
create table if not exists clientes_finales (
  cliente_final_id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (cliente_id),
  nombre text not null,
  telefono text,
  saldo_deudor numeric(12,2) not null default 0,
  creado_en timestamptz not null default now(),
  eliminado_en timestamptz
);

create index if not exists idx_clientesfinales_cliente
  on clientes_finales (cliente_id) where eliminado_en is null;

-- ------------------------------------------------------------
-- 3. ventas — docs/SCHEMA.md §7
-- ------------------------------------------------------------
create table if not exists ventas (
  venta_id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (cliente_id),
  usuario_id uuid not null references usuarios (usuario_id),
  cliente_final_id uuid references clientes_finales (cliente_final_id),
  total numeric(12,2) not null check (total >= 0),
  estado estado_venta not null default 'confirmada',
  idempotency_key text not null unique,
  creado_en timestamptz not null default now(),
  eliminado_en timestamptz
);

create index if not exists idx_ventas_cliente_fecha on ventas (cliente_id, creado_en desc);
create index if not exists idx_ventas_cliente_final on ventas (cliente_final_id);

-- ------------------------------------------------------------
-- 4. venta_items — docs/SCHEMA.md §8 (append-only, sin cliente_id propio)
-- ------------------------------------------------------------
create table if not exists venta_items (
  venta_item_id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references ventas (venta_id),
  producto_id uuid not null references productos (producto_id),
  cantidad integer not null check (cantidad > 0),
  precio_unitario numeric(12,2) not null check (precio_unitario >= 0),
  subtotal numeric(12,2) not null check (subtotal >= 0)
);

create index if not exists idx_ventaitems_venta on venta_items (venta_id);
create index if not exists idx_ventaitems_producto on venta_items (producto_id);

-- ------------------------------------------------------------
-- 5. devoluciones (Módulo Devoluciones) — docs/SCHEMA.md §11
-- ------------------------------------------------------------
create table if not exists devoluciones (
  devolucion_id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (cliente_id),
  venta_id uuid not null references ventas (venta_id),
  usuario_id uuid not null references usuarios (usuario_id),
  motivo text not null,
  estado estado_devolucion not null default 'registrada',
  monto_total numeric(12,2) not null check (monto_total >= 0),
  creado_en timestamptz not null default now()
);

create index if not exists idx_devoluciones_venta on devoluciones (venta_id);
create index if not exists idx_devoluciones_cliente on devoluciones (cliente_id, creado_en desc);

-- ------------------------------------------------------------
-- 6. movimientos_stock — docs/SCHEMA.md §6 (append-only)
-- ------------------------------------------------------------
create table if not exists movimientos_stock (
  movimiento_id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (cliente_id),
  producto_id uuid not null references productos (producto_id),
  usuario_id uuid not null references usuarios (usuario_id),
  tipo tipo_movimiento_stock not null,
  cantidad integer not null check (cantidad > 0),
  saldo_resultante integer not null check (saldo_resultante >= 0),
  referencia_venta_id uuid references ventas (venta_id),
  referencia_devolucion_id uuid references devoluciones (devolucion_id),
  creado_en timestamptz not null default now()
);

create index if not exists idx_movstock_producto on movimientos_stock (producto_id, creado_en desc);
create index if not exists idx_movstock_cliente on movimientos_stock (cliente_id, creado_en desc);

-- ------------------------------------------------------------
-- 7. devolucion_items — docs/SCHEMA.md §12 (append-only, sin cliente_id propio)
-- ------------------------------------------------------------
create table if not exists devolucion_items (
  devolucion_item_id uuid primary key default gen_random_uuid(),
  devolucion_id uuid not null references devoluciones (devolucion_id),
  venta_item_id uuid not null references venta_items (venta_item_id),
  cantidad integer not null check (cantidad > 0),
  monto numeric(12,2) not null check (monto >= 0)
);

create index if not exists idx_devitems_devolucion on devolucion_items (devolucion_id);

-- ------------------------------------------------------------
-- 8. notas_credito — docs/SCHEMA.md §13
-- ------------------------------------------------------------
create table if not exists notas_credito (
  nota_credito_id uuid primary key default gen_random_uuid(),
  devolucion_id uuid not null unique references devoluciones (devolucion_id),
  cliente_id uuid not null references clientes (cliente_id),
  monto numeric(12,2) not null check (monto >= 0),
  numero_comprobante text not null unique,
  creado_en timestamptz not null default now()
);

create index if not exists idx_notascredito_cliente on notas_credito (cliente_id);

-- ------------------------------------------------------------
-- 9. movimientos_cuenta_corriente — docs/SCHEMA.md §10 (append-only,
-- sin cliente_id propio)
-- ------------------------------------------------------------
create table if not exists movimientos_cuenta_corriente (
  movimiento_cc_id uuid primary key default gen_random_uuid(),
  cliente_final_id uuid not null references clientes_finales (cliente_final_id),
  venta_id uuid references ventas (venta_id),
  tipo tipo_movimiento_cuenta not null,
  monto numeric(12,2) not null check (monto > 0),
  usuario_id uuid not null references usuarios (usuario_id),
  creado_en timestamptz not null default now()
);

create index if not exists idx_movcc_clientefinal
  on movimientos_cuenta_corriente (cliente_final_id, creado_en desc);

-- ------------------------------------------------------------
-- 10. cargas_ia (Módulo Carga con IA) — docs/SCHEMA.md §14
-- ------------------------------------------------------------
create table if not exists cargas_ia (
  carga_ia_id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (cliente_id),
  usuario_id uuid not null references usuarios (usuario_id),
  producto_id uuid references productos (producto_id),
  imagen_url text not null,
  resultado_extraido jsonb,
  creado_en timestamptz not null default now()
);

create index if not exists idx_cargasia_cliente_fecha on cargas_ia (cliente_id, creado_en desc);

-- ------------------------------------------------------------
-- 11. configuracion_bot_whatsapp (Módulo Bot Estático) — docs/SCHEMA.md §15
-- (PK = cliente_id: configuración 1:1 por tenant)
-- ------------------------------------------------------------
create table if not exists configuracion_bot_whatsapp (
  cliente_id uuid primary key references clientes (cliente_id),
  activo boolean not null default false,
  mensaje_horarios text,
  mensaje_ubicacion text,
  mensaje_catalogo text,
  actualizado_en timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 12. auditoria_diffs (Trazabilidad Transversal) — docs/SCHEMA.md §16.
-- Partición mensual sugerida por SCHEMA.md queda fuera de alcance de esta
-- estación (no bloquea las políticas RLS); a evaluar cuando el volumen lo
-- justifique.
-- ------------------------------------------------------------
create table if not exists auditoria_diffs (
  auditoria_id bigint primary key generated always as identity,
  cliente_id uuid not null references clientes (cliente_id),
  usuario_id uuid not null references usuarios (usuario_id),
  tabla_afectada text not null,
  registro_id uuid not null,
  campo_modificado text not null,
  valor_anterior text,
  valor_nuevo text,
  creado_en timestamptz not null default now()
);

create index if not exists idx_auditoria_cliente_tabla
  on auditoria_diffs (cliente_id, tabla_afectada, creado_en desc);
create index if not exists idx_auditoria_registro on auditoria_diffs (registro_id);
