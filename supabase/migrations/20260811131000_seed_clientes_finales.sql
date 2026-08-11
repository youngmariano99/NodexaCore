-- ------------------------------------------------------------
-- Siembra de CLIENTES_FINALES (docs/SEED.md §2 y §6: 25 filas, solo en
-- tenants con módulo `fiados` activo — Almacén Don Pedro y Bazar Casa Sur).
-- Idempotente vía ON CONFLICT sobre idx_clientesfinales_telefono_unico
-- (migración anterior), mismo criterio de re-ejecución segura que el resto
-- de las siembras de docs/SEED.md §1.
-- ------------------------------------------------------------
insert into clientes_finales (cliente_final_id, cliente_id, nombre, telefono, saldo_deudor)
select
  gen_random_uuid(),
  'a1111111-1111-4111-8111-111111111111',
  'Cliente Fiado A' || n,
  '+549292100' || lpad(n::text, 3, '0'),
  0
from generate_series(1, 15) n
on conflict (cliente_id, telefono) where telefono is not null and eliminado_en is null do nothing;

insert into clientes_finales (cliente_final_id, cliente_id, nombre, telefono, saldo_deudor)
select
  gen_random_uuid(),
  'c3333333-3333-4333-8333-333333333333',
  'Cliente Fiado C' || n,
  '+549292300' || lpad(n::text, 3, '0'),
  0
from generate_series(1, 10) n
on conflict (cliente_id, telefono) where telefono is not null and eliminado_en is null do nothing;
