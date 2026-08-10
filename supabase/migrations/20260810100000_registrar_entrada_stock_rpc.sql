-- Función RPC que calcula `saldo_resultante` y registra la entrada de stock
-- de forma atómica (docs/CLAUDE.md §4 "robustez": "Idempotencia y
-- Anti-Race Conditions con concurrencia optimista"). Un UPDATE ... RETURNING
-- sobre `productos.stock_actual` es una operación atómica de una sola fila
-- en Postgres: dos llamadas concurrentes a esta función para el mismo
-- producto se serializan (la segunda espera el lock de fila de la primera),
-- eliminando la ventana de carrera que existiría si la app leyera
-- `stock_actual`, sumara en memoria y recién después hiciera el UPDATE.
--
-- SECURITY INVOKER (default): corre con los permisos de la sesión que
-- invoca el RPC, así que las políticas RLS ya existentes siguen siendo la
-- autoridad — `productos_update_tenant` (comerciante o empleado con
-- `eliminado_en IS NULL`) y `movimientos_stock_insert_tenant`
-- (`cliente_id = auth_cliente_id()`) se aplican igual que en cualquier
-- UPDATE/INSERT normal desde el cliente de sesión. `cliente_id` y
-- `usuario_id` se derivan del JWT/sesión adentro de la función (nunca se
-- reciben como parámetro): un producto de otro tenant no matchea el WHERE y
-- la función falla con NO_DATA_FOUND (P0002) sin exponer si el producto
-- existe en otro comercio.
create or replace function public.registrar_entrada_stock(
  p_producto_id uuid,
  p_cantidad integer
)
returns movimientos_stock
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_cliente_id uuid;
  v_usuario_id uuid;
  v_nuevo_stock integer;
  v_movimiento movimientos_stock;
begin
  if p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor a cero.' using errcode = 'P0001';
  end if;

  v_cliente_id := auth_cliente_id();

  select usuario_id into v_usuario_id
  from usuarios
  where auth_user_id = auth.uid()
    and eliminado_en is null;

  if v_usuario_id is null then
    raise exception 'No se encontró el usuario solicitante.' using errcode = 'P0001';
  end if;

  update productos
  set stock_actual = stock_actual + p_cantidad,
      actualizado_en = now()
  where producto_id = p_producto_id
    and cliente_id = v_cliente_id
    and eliminado_en is null
  returning stock_actual into v_nuevo_stock;

  if not found then
    raise exception 'Producto no encontrado o no pertenece a este comercio.' using errcode = 'P0002';
  end if;

  insert into movimientos_stock (cliente_id, producto_id, usuario_id, tipo, cantidad, saldo_resultante)
  values (v_cliente_id, p_producto_id, v_usuario_id, 'entrada', p_cantidad, v_nuevo_stock)
  returning * into v_movimiento;

  return v_movimiento;
end;
$$;
