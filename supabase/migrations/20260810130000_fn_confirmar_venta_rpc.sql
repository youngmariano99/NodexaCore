-- Confirmación de cobro con control de duplicados (docs/BACKLOG.md
-- "Server Action confirmarVenta con idempotency_key"). Inserta `ventas` +
-- `venta_items` en una única transacción: PL/pgSQL ejecuta toda la función
-- dentro de la transacción implícita del `CALL`/`SELECT`, así que si el
-- INSERT de `venta_items` fallara después de crear la `venta`, Postgres
-- revierte ambos — nunca queda una venta "fantasma" sin sus ítems.
--
-- Los precios NUNCA se toman del parámetro `p_items` tal cual: se resuelven
-- contra el `precio` real y vigente de `productos`, scopeado al tenant de la
-- sesión (`auth_cliente_id()`), igual que ya hace `POST
-- /api/ventas/previsualizar` (estación anterior) — un request manipulado con
-- precios falsos no puede alterar lo que efectivamente se persiste.
--
-- SECURITY INVOKER (no DEFINER): corre con los permisos de la sesión que
-- invoca, así que `ventas_insert_tenant`/`venta_items_insert_tenant` (ya
-- existentes, WITH CHECK cliente_id = auth_cliente_id()) siguen siendo la
-- autoridad real — el RPC no bypasea RLS.
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

  return v_venta;
end;
$$;
