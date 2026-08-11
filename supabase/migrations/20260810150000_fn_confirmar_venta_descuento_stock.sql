-- Descuento automático de stock al confirmar venta (docs/BACKLOG.md "Función
-- RPC transaccional de venta con descuento de stock"). Reemplaza (`CREATE OR
-- REPLACE`, misma firma) a `fn_confirmar_venta` de
-- supabase/migrations/20260810130000_fn_confirmar_venta_rpc.sql — esa
-- migración ya está aplicada contra el proyecto real y nunca se reescribe;
-- esta es una migración nueva que reemplaza el cuerpo de la función.
--
-- Paso 2 del checklist ("bloqueo optimista sobre productos.stock_actual"):
-- el descuento de stock usa el mismo patrón ya establecido en
-- fn_registrar_movimiento_stock (supabase/migrations/20260810120000_...):
-- un único `UPDATE ... WHERE stock_actual >= cantidad` combina lectura y
-- escritura en una sola sentencia atómica por fila. Postgres serializa
-- automáticamente dos `UPDATE` concurrentes sobre la misma fila (la segunda
-- espera a que la primera confirme y recién ahí reevalúa su propio `WHERE`
-- contra el valor ya actualizado) — así que dos ventas simultáneas sobre el
-- mismo producto con stock límite nunca pueden descontar ambas si el stock
-- no alcanza para las dos. No hace falta `SELECT ... FOR UPDATE` explícito
-- ni una columna de versión optimista aparte.
create or replace function public.fn_confirmar_venta(
  p_idempotency_key text,
  p_cliente_final_id uuid,
  p_items jsonb
)
returns ventas
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_cliente_id uuid;
  v_usuario_id uuid;
  v_total numeric(12,2);
  v_cantidad_pedidos integer;
  v_cantidad_resueltos integer;
  v_venta ventas;
  v_item record;
  v_nuevo_stock integer;
begin
  v_cliente_id := auth_cliente_id();

  select usuario_id into v_usuario_id
  from usuarios
  where auth_user_id = auth.uid()
    and eliminado_en is null;

  if v_usuario_id is null then
    raise exception 'No se encontró el usuario solicitante.' using errcode = 'P0001';
  end if;

  select count(*) into v_cantidad_pedidos
  from jsonb_array_elements(p_items);

  -- Resuelve cada ítem contra el precio real del tenant. Un producto que no
  -- matchee (de otro comercio, o soft-eliminado) simplemente no aparece acá
  -- — no se distingue el motivo, mismo criterio que
  -- `verificarPertenenciaTenant` (docs/ROLES.md §3.8).
  select count(*), coalesce(sum(round(p.precio * (elem->>'cantidad')::integer, 2)), 0)
  into v_cantidad_resueltos, v_total
  from jsonb_array_elements(p_items) as elem
  join productos p
    on p.producto_id = (elem->>'producto_id')::uuid
   and p.cliente_id = v_cliente_id
   and p.eliminado_en is null;

  if v_cantidad_resueltos <> v_cantidad_pedidos then
    raise exception 'Uno o más productos no pertenecen a este comercio.' using errcode = 'P0002';
  end if;

  begin
    insert into ventas (cliente_id, usuario_id, cliente_final_id, total, estado, idempotency_key)
    values (v_cliente_id, v_usuario_id, p_cliente_final_id, v_total, 'confirmada', p_idempotency_key)
    returning * into v_venta;
  exception
    when unique_violation then
      raise exception 'Esta venta ya fue registrada.' using errcode = 'NX002';
  end;

  insert into venta_items (venta_id, producto_id, cantidad, precio_unitario, subtotal)
  select
    v_venta.venta_id,
    p.producto_id,
    (elem->>'cantidad')::integer,
    p.precio,
    round(p.precio * (elem->>'cantidad')::integer, 2)
  from jsonb_array_elements(p_items) as elem
  join productos p
    on p.producto_id = (elem->>'producto_id')::uuid
   and p.cliente_id = v_cliente_id
   and p.eliminado_en is null;

  -- Descuento de stock por ítem + su movimiento (Paso 1 y Paso 3). Si
  -- cualquier ítem no tiene stock suficiente, el `raise exception` acá
  -- adentro revierte TODA la transacción — incluida la `venta` y los
  -- `venta_items` ya insertados arriba en esta misma invocación — porque
  -- toda la función corre dentro de la transacción implícita del `SELECT`
  -- que la invoca (Criterio de Aceptación 2).
  for v_item in
    select
      (elem->>'producto_id')::uuid as producto_id,
      (elem->>'cantidad')::integer as cantidad
    from jsonb_array_elements(p_items) as elem
  loop
    update productos
    set stock_actual = stock_actual - v_item.cantidad,
        actualizado_en = now()
    where producto_id = v_item.producto_id
      and cliente_id = v_cliente_id
      and eliminado_en is null
      and stock_actual >= v_item.cantidad
    returning stock_actual into v_nuevo_stock;

    if not found then
      -- La existencia/pertenencia del producto ya se validó arriba
      -- (v_cantidad_resueltos = v_cantidad_pedidos): si el UPDATE no aplicó
      -- acá, la única causa posible es stock insuficiente.
      raise exception 'No hay stock suficiente de este producto para completar la venta.' using errcode = 'NX001';
    end if;

    insert into movimientos_stock (
      cliente_id, producto_id, usuario_id, tipo, cantidad, saldo_resultante, referencia_venta_id
    )
    values (
      v_cliente_id, v_item.producto_id, v_usuario_id, 'salida', v_item.cantidad, v_nuevo_stock, v_venta.venta_id
    );
  end loop;

  return v_venta;
end;
$$;
