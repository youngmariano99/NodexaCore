-- Siembra volumétrica de `movimientos_stock` (docs/SEED.md §1-5): 1 entrada
-- inicial por cada producto ya sembrado, igualando `saldo_resultante` al
-- `stock_actual` definido en la siembra de productos
-- (20260809180000_seed_productos_volumetrico.sql). Usa el comerciante de
-- cada tenant (docs/SEED.md §2, ya sembrado en
-- 20260809165000_seed_usuarios_comerciantes_multi_tenant.sql) como
-- `usuario_id` del movimiento.
--
-- Excluye productos con `stock_actual = 0` (16 de los 1.960 sembrados,
-- generados por el `random()` de la siembra volumétrica): `movimientos_stock`
-- tiene `CHECK (cantidad > 0)`, así que una "entrada" de 0 unidades violaría
-- la restricción — y no tendría sentido de negocio, un producto que nunca
-- tuvo stock no tiene un movimiento de entrada que registrar. El total real
-- de esta siembra es 1.944 filas, no 1.960, por esta razón documentada.

insert into movimientos_stock (cliente_id, producto_id, usuario_id, tipo, cantidad, saldo_resultante)
select
  p.cliente_id,
  p.producto_id,
  case p.cliente_id
    when 'a1111111-1111-4111-8111-111111111111' then 'd0000000-0000-4000-8000-000000000002'::uuid
    when 'b2222222-2222-4222-8222-222222222222' then 'd0000000-0000-4000-8000-000000000004'::uuid
    else 'd0000000-0000-4000-8000-000000000007'::uuid
  end,
  'entrada',
  p.stock_actual,
  p.stock_actual
from productos p
where p.eliminado_en is null
  and p.stock_actual > 0
  and not exists (
    select 1 from movimientos_stock ms where ms.producto_id = p.producto_id
  );
