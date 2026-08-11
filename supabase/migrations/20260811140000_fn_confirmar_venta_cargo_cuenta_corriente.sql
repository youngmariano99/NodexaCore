-- Venta asociada a cuenta corriente (docs/BACKLOG.md "Extensión de
-- fn_confirmar_venta para cargo a cuenta corriente"). Reemplaza (`CREATE OR
-- REPLACE`, misma firma) a `fn_confirmar_venta` de
-- supabase/migrations/20260810150000_fn_confirmar_venta_descuento_stock.sql
-- — esa migración ya está aplicada contra el proyecto real y nunca se
-- reescribe; esta es una migración nueva que reemplaza el cuerpo de la
-- función una vez más.
--
-- Paso 1 del checklist ("extender fn_confirmar_venta para aceptar
-- cliente_final_id opcional") ya estaba resuelto desde la migración
-- original (20260810130000_fn_confirmar_venta_rpc.sql): `p_cliente_final_id
-- uuid` siempre fue nullable y ya se persiste en `ventas.cliente_final_id`.
-- Lo que faltaba era el efecto real de "venta a cuenta corriente" (Pasos
-- 2-3): generar el movimiento de cargo y actualizar el saldo deudor.
--
-- El incremento de `clientes_finales.saldo_deudor` se aísla en la función
-- `fn_incrementar_saldo_deudor` (SECURITY DEFINER, ver más abajo) en vez de
-- un `UPDATE` directo acá: `clientes_finales_update_tenant`
-- (docs/ROLES.md §3.4) exige `auth_rol() = 'comerciante'` en su `WITH
-- CHECK`, así que una venta fiada cobrada por un `empleado` (mostrador,
-- rol habilitado para `ventas` — docs/ROLES.md §2) rompería con un
-- permission-denied crudo de RLS si el `UPDATE` corriera con el invoker.
-- docs/ROLES.md §3.4 ya documenta esta intención literalmente: "el empleado
-- no modifica saldo_deudor directamente, solo mediante
-- movimientos_cuenta_corriente" — este es exactamente ese mecanismo
-- mediado. El resto de la función sigue SECURITY INVOKER: RLS sigue siendo
-- la autoridad real para todo lo demás (productos, ventas, venta_items,
-- movimientos_stock, y el propio INSERT en movimientos_cuenta_corriente,
-- cuya política de INSERT no distingue rol).
create or replace function public.fn_incrementar_saldo_deudor(
  p_cliente_final_id uuid,
  p_monto numeric(12,2)
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Combina la verificación de pertenencia de tenant y el incremento en una
  -- única sentencia atómica (mismo criterio que `fn_registrar_movimiento_stock`):
  -- `auth_cliente_id()` se resuelve del JWT de la sesión invocadora, nunca
  -- de un parámetro, para que esta función no pueda usarse para acreditar
  -- deuda en el tenant de otro comercio aunque se invoque el RPC de forma
  -- directa. El texto estático del UPDATE solo puede tocar `saldo_deudor`
  -- (nunca `nombre`/`telefono`), igual que `fn_actualizar_identidad_visual`
  -- solo puede tocar `logo_url`/`color_primario`.
  update clientes_finales
  set saldo_deudor = saldo_deudor + p_monto
  where cliente_final_id = p_cliente_final_id
    and cliente_id = auth_cliente_id()
    and eliminado_en is null;

  if not found then
    raise exception 'Este cliente final no pertenece a este comercio.' using errcode = 'P0002';
  end if;
end;
$$;

-- `REVOKE ALL FROM PUBLIC` no alcanza: Supabase otorga `EXECUTE` a `anon`/
-- `authenticated` como grants explícitos por rol al crear la función (no
-- vía el pseudo-rol PUBLIC), confirmado con `get_advisors` tras aplicar
-- esta migración contra el proyecto real (WARN `anon_security_definer_
-- function_executable` hasta agregar el `REVOKE ... FROM anon` explícito).
revoke all on function public.fn_incrementar_saldo_deudor(uuid, numeric) from public;
revoke execute on function public.fn_incrementar_saldo_deudor(uuid, numeric) from anon;
grant execute on function public.fn_incrementar_saldo_deudor(uuid, numeric) to authenticated;

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

  -- Descuento de stock por ítem + su movimiento. Si cualquier ítem no tiene
  -- stock suficiente, el `raise exception` acá adentro revierte TODA la
  -- transacción — incluida la `venta` y los `venta_items` ya insertados
  -- arriba en esta misma invocación — porque toda la función corre dentro
  -- de la transacción implícita del `SELECT` que la invoca (Criterio de
  -- Aceptación "atomicidad" de esta estación y de la anterior).
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
      raise exception 'No hay stock suficiente de este producto para completar la venta.' using errcode = 'NX001';
    end if;

    insert into movimientos_stock (
      cliente_id, producto_id, usuario_id, tipo, cantidad, saldo_resultante, referencia_venta_id
    )
    values (
      v_cliente_id, v_item.producto_id, v_usuario_id, 'salida', v_item.cantidad, v_nuevo_stock, v_venta.venta_id
    );
  end loop;

  -- Venta a cuenta corriente (Pasos 2-3 de esta estación). Solo corre si la
  -- venta trae `cliente_final_id` (Criterio de Aceptación "venta de
  -- contado": sin él, no se toca `movimientos_cuenta_corriente` ni
  -- `clientes_finales` en absoluto). El incremento y la verificación de
  -- pertenencia de tenant del cliente final son atómicos dentro de
  -- `fn_incrementar_saldo_deudor` (arriba); si esa función falla (cliente
  -- final de otro tenant o inexistente), el `raise` se propaga y revierte
  -- TODA la transacción — venta, ítems y movimientos de stock ya
  -- insertados incluidos (Paso 4 / Criterio de Aceptación "atomicidad").
  if p_cliente_final_id is not null then
    perform public.fn_incrementar_saldo_deudor(p_cliente_final_id, v_total);

    insert into movimientos_cuenta_corriente (cliente_final_id, venta_id, tipo, monto, usuario_id)
    values (p_cliente_final_id, v_venta.venta_id, 'cargo', v_total, v_usuario_id);
  end if;

  return v_venta;
end;
$$;
