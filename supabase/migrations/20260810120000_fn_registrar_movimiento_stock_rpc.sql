-- Reemplaza registrar_entrada_stock (20260810100000_registrar_entrada_stock_rpc.sql,
-- entrada-only) por una función RPC genérica para ambos tipos de movimiento
-- (docs/ROLES.md §2, fila "movimientos_stock": `C·L` para comerciante y
-- empleado), tal como pide esta actividad. Evita tener dos funciones
-- distintas con la misma lógica de atomicidad duplicada en la base.
--
-- El chequeo de saldo suficiente para `salida` (NX-PRD-004) vive en la
-- misma cláusula WHERE del UPDATE, no en un SELECT previo: así el UPDATE es
-- una única sentencia atómica que Postgres serializa por fila — dos
-- solicitudes de salida concurrentes sobre el mismo producto nunca pueden
-- descontar ambas contra el mismo `stock_actual` desactualizado, porque la
-- segunda re-evalúa la condición `stock_actual + v_delta >= 0` contra el
-- valor ya commiteado por la primera (comportamiento estándar de UPDATE en
-- Postgres bajo escritura concurrente, sin necesitar un lock manual
-- `FOR UPDATE` ni una columna de versión optimista aparte).
drop function if exists public.registrar_entrada_stock(uuid, integer);

create or replace function public.fn_registrar_movimiento_stock(
  p_producto_id uuid,
  p_tipo tipo_movimiento_stock,
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
  v_delta integer;
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

  v_delta := case when p_tipo = 'entrada' then p_cantidad else -p_cantidad end;

  update productos
  set stock_actual = stock_actual + v_delta,
      actualizado_en = now()
  where producto_id = p_producto_id
    and cliente_id = v_cliente_id
    and eliminado_en is null
    and stock_actual + v_delta >= 0
  returning stock_actual into v_nuevo_stock;

  if not found then
    -- El UPDATE atómico no distingue por qué no aplicó (producto ajeno vs.
    -- saldo insuficiente); esta lectura de diagnóstico corre DESPUÉS de que
    -- la mutación ya falló, así que no reabre ninguna ventana de carrera.
    if exists (
      select 1 from productos
      where producto_id = p_producto_id
        and cliente_id = v_cliente_id
        and eliminado_en is null
    ) then
      raise exception 'No podés dejar stock en negativo.' using errcode = 'NX004';
    else
      raise exception 'Producto no encontrado o no pertenece a este comercio.' using errcode = 'P0002';
    end if;
  end if;

  insert into movimientos_stock (cliente_id, producto_id, usuario_id, tipo, cantidad, saldo_resultante)
  values (v_cliente_id, p_producto_id, v_usuario_id, p_tipo, p_cantidad, v_nuevo_stock)
  returning * into v_movimiento;

  return v_movimiento;
end;
$$;
