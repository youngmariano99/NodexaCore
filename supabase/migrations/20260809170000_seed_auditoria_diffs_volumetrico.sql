-- Siembra volumétrica de `auditoria_diffs` (docs/SEED.md §1-2, §12): ~100
-- diffs de altas/cambios de precio de productos + 20 diffs de cambio de
-- estado de ventas devueltas, distribuidos entre los 3 tenants de
-- 20260809140000_seed_clientes_volumetrico.sql. `registro_id` no tiene FK
-- (es polimórfico según `tabla_afectada`, docs/SCHEMA.md §16): se usa
-- gen_random_uuid() en vez de depender del lote volumétrico de `productos`/
-- `ventas`/`devoluciones` (~1.960/300/20 filas), que corresponde a una
-- estación de Core Productos/Ventas todavía no construida.
--
-- Prerrequisito real: `usuario_id` SÍ tiene FK a `usuarios` (docs/SCHEMA.md
-- §16) y esta siembra usa los usuario_id fijos de docs/SEED.md §2 (un
-- comerciante por tenant) — esas filas de `usuarios` (y sus `auth.users`
-- correspondientes) todavía no se sembraron para los tenants
-- a1111111/b2222222/c3333333 en el proyecto real, solo existen para el
-- tenant demo-nodexa de la estación de login. Esta migración queda escrita
-- y lista para reejecutar (ON CONFLICT no aplica por ser INSERT...SELECT sin
-- clave única declarada, pero es idempotente por rango de fecha si se
-- necesitara) una vez exista esa siembra de usuarios multi-tenant.

-- 100 diffs de alta/cambio de precio de productos, repartidos entre los 3 tenants.
insert into auditoria_diffs (cliente_id, usuario_id, tabla_afectada, registro_id, campo_modificado, valor_anterior, valor_nuevo)
select
  tenant.cliente_id,
  tenant.usuario_id,
  'productos',
  gen_random_uuid(),
  'precio',
  null,
  round((500 + random() * 9500)::numeric, 2)::text
from generate_series(1, 100) n
cross join lateral (
  select
    (array[
      'a1111111-1111-4111-8111-111111111111',
      'b2222222-2222-4222-8222-222222222222',
      'c3333333-3333-4333-8333-333333333333'
    ])[1 + (n % 3)]::uuid as cliente_id,
    (array[
      'd0000000-0000-4000-8000-000000000002',
      'd0000000-0000-4000-8000-000000000004',
      'd0000000-0000-4000-8000-000000000007'
    ])[1 + (n % 3)]::uuid as usuario_id
) tenant;

-- 20 diffs de cambio de estado de ventas devueltas (solo Bazar Casa Sur:
-- único tenant con el módulo `devoluciones` activo, docs/SEED.md §3).
insert into auditoria_diffs (cliente_id, usuario_id, tabla_afectada, registro_id, campo_modificado, valor_anterior, valor_nuevo)
select
  'c3333333-3333-4333-8333-333333333333',
  'd0000000-0000-4000-8000-000000000007',
  'ventas',
  gen_random_uuid(),
  'estado',
  'confirmada',
  'devuelta_parcial'
from generate_series(1, 20);
