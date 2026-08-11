-- Registro de pagos parciales o totales (docs/BACKLOG.md "Server Action
-- registrarPagoCuentaCorriente"). Igual que `fn_incrementar_saldo_deudor`
-- (supabase/migrations/20260811140000_fn_confirmar_venta_cargo_cuenta_corriente.sql),
-- `clientes_finales_update_tenant` exige `auth_rol() = 'comerciante'` en su
-- `WITH CHECK` (docs/ROLES.md §3.4), lo que bloquearía con RLS crudo un
-- pago registrado por un `empleado` — docs/ROLES.md §2 fila
-- `movimientos_cuenta_corriente` habilita explícitamente `C (solo
-- registrar pagos)` para `empleado`. Por eso toda la función corre
-- `SECURITY DEFINER`, resolviendo `cliente_id`/`usuario_id` internamente
-- (nunca de un parámetro) — mismo criterio zero-trust que el resto de los
-- RPC del repo.
--
-- Paso 2 del checklist ("validar monto <= saldo_deudor") vive en la misma
-- cláusula `WHERE` del `UPDATE` que descuenta el saldo — no en una lectura
-- previa — así el chequeo y el descuento son una única sentencia atómica:
-- dos pagos concurrentes sobre el mismo cliente final nunca pueden dejar
-- `saldo_deudor` negativo, porque el segundo `UPDATE` re-evalúa
-- `saldo_deudor >= p_monto` contra el valor ya comprometido por el primero
-- (mismo patrón ya usado en `fn_registrar_movimiento_stock` para
-- `stock_actual`).
--
-- Cuando el `UPDATE` no afecta ninguna fila, una lectura de diagnóstico
-- posterior (que ya no puede reabrir la ventana de carrera, porque la
-- mutación ya falló) distingue "el cliente final no pertenece a este
-- comercio" (`P0002`, mismo criterio de no filtrar existencia de recursos
-- ajenos que `verificarPertenenciaTenant`) de "el monto supera la deuda
-- actual" (`NX003` custom, análogo a `NX004` de `fn_registrar_movimiento_stock`).
create or replace function public.fn_registrar_pago_cuenta_corriente(
  p_cliente_final_id uuid,
  p_monto numeric(12,2)
)
returns movimientos_cuenta_corriente
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente_id uuid;
  v_usuario_id uuid;
  v_nuevo_saldo numeric(12,2);
  v_movimiento movimientos_cuenta_corriente;
begin
  v_cliente_id := auth_cliente_id();

  select usuario_id into v_usuario_id
  from usuarios
  where auth_user_id = auth.uid()
    and eliminado_en is null;

  if v_usuario_id is null then
    raise exception 'No se encontró el usuario solicitante.' using errcode = 'P0001';
  end if;

  update clientes_finales
  set saldo_deudor = saldo_deudor - p_monto
  where cliente_final_id = p_cliente_final_id
    and cliente_id = v_cliente_id
    and eliminado_en is null
    and saldo_deudor >= p_monto
  returning saldo_deudor into v_nuevo_saldo;

  if not found then
    if exists (
      select 1 from clientes_finales
      where cliente_final_id = p_cliente_final_id
        and cliente_id = v_cliente_id
        and eliminado_en is null
    ) then
      raise exception 'El monto del pago no puede ser mayor a la deuda actual del cliente.' using errcode = 'NX003';
    else
      raise exception 'No encontramos este cliente en tu comercio.' using errcode = 'P0002';
    end if;
  end if;

  -- Paso 3: `venta_id` siempre `NULL` acá — un pago manual nunca referencia
  -- una venta (docs/SCHEMA.md §10: "`NULL` si es un pago manual"), a
  -- diferencia del cargo automático de `fn_confirmar_venta`, que sí lo
  -- setea. Este es precisamente el campo que distingue ambos orígenes.
  insert into movimientos_cuenta_corriente (cliente_final_id, venta_id, tipo, monto, usuario_id)
  values (p_cliente_final_id, null, 'pago', p_monto, v_usuario_id)
  returning * into v_movimiento;

  return v_movimiento;
end;
$$;

revoke all on function public.fn_registrar_pago_cuenta_corriente(uuid, numeric) from public;
revoke execute on function public.fn_registrar_pago_cuenta_corriente(uuid, numeric) from anon;
grant execute on function public.fn_registrar_pago_cuenta_corriente(uuid, numeric) to authenticated;
