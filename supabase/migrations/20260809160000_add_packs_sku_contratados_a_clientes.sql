-- Agrega el contador de packs de ampliación de SKU contratados a `clientes`
-- (docs/SCHEMA.md §2), usado por ampliarLimiteSku (src/services/admin/) para
-- que una estación futura de facturación pueda calcular
-- abono_base + packs_sku_contratados * precio_pack. No existe todavía una
-- entidad de planes/precios en el esquema, así que solo se persiste el
-- contador, no un monto.

alter table clientes
  add column if not exists packs_sku_contratados integer not null default 0;

alter table clientes
  drop constraint if exists chk_clientes_packs_sku_contratados_no_negativo;

alter table clientes
  add constraint chk_clientes_packs_sku_contratados_no_negativo check (packs_sku_contratados >= 0);

-- Backfill de la siembra volumétrica (docs/SEED.md §1): Bazar Casa Sur ya
-- tiene limite_sku=2000 (1000 base + 1 pack), no aplica a las stations con
-- limite_sku=1000 por defecto (0 packs, ya cubierto por el DEFAULT).
update clientes
set packs_sku_contratados = 1
where cliente_id = 'c3333333-3333-4333-8333-333333333333'
  and packs_sku_contratados = 0;
