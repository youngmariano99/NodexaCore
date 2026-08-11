-- RPC de consumo atómico de cuota mensual de Carga con IA (docs/BACKLOG.md
-- "Route Handler de procesamiento de imagen con OpenAI Vision", NX-IA-002).
--
-- `clientes` no tiene ninguna política RLS de UPDATE para `comerciante`
-- ni `empleado` — solo `clientes_update_admin`, exclusiva de `admin_nodexa`
-- (mismo hallazgo ya documentado en
-- 20260810160000_fn_actualizar_identidad_visual_rpc.sql). `security
-- invoker` haría que el UPDATE de acá abajo afecte 0 filas bajo esa RLS —
-- se probó en vivo contra el proyecto real y confirmó el bloqueo—, así que
-- esta función es `security definer`, mismo patrón que
-- `fn_actualizar_identidad_visual`: corre con el privilegio del dueño de la
-- función (no sujeto a la RLS de comerciante/empleado), y el `UPDATE`
-- interno menciona literalmente `ia_consultas_usadas`/`ia_periodo_actual` y
-- ninguna otra columna — no hay forma de que toque `estado_pago` o
-- `limite_sku` aunque quisiera. El chequeo de rol (`auth_rol()`) reemplaza
-- acá la autorización que normalmente daría la RLS ausente.
--
-- El chequeo "¿queda cuota?" y el incremento viven en la misma sentencia
-- UPDATE, no en un SELECT previo desde la Route Handler: dos subidas de
-- foto concurrentes del mismo comercio nunca pueden reservar ambas el
-- último cupo contra un `ia_consultas_usadas` desactualizado (Postgres
-- serializa el UPDATE por fila, mismo criterio que
-- fn_registrar_movimiento_stock).
--
-- El reset mensual (`ia_periodo_actual`, docs/SCHEMA.md §2) se resuelve acá
-- mismo: si el período guardado quedó atrás del mes calendario actual, el
-- consumo arranca de nuevo en 1 en vez de sumar sobre un contador vencido.
--
-- No recibe `cliente_id` como parámetro: siempre opera sobre
-- `auth_cliente_id()` de la sesión que invoca, así que un comerciante/
-- empleado de otro tenant no tiene forma de apuntar a otro comercio.
create or replace function public.fn_registrar_consumo_ia()
returns clientes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente_id uuid;
  v_periodo_actual date := date_trunc('month', now())::date;
  v_cliente clientes;
begin
  if auth_rol() not in ('comerciante', 'empleado') then
    raise exception 'No tenés permiso para usar la Carga con IA de este comercio.' using errcode = 'P0001';
  end if;

  v_cliente_id := auth_cliente_id();

  if v_cliente_id is null then
    raise exception 'No se encontró el comercio del usuario solicitante.' using errcode = 'P0002';
  end if;

  update clientes
  set ia_consultas_usadas = case
        when ia_periodo_actual < v_periodo_actual then 1
        else ia_consultas_usadas + 1
      end,
      ia_periodo_actual = v_periodo_actual
  where cliente_id = v_cliente_id
    and eliminado_en is null
    and (ia_periodo_actual < v_periodo_actual or ia_consultas_usadas < cuota_mensual_ia)
  returning * into v_cliente;

  if not found then
    if exists (select 1 from clientes where cliente_id = v_cliente_id and eliminado_en is null) then
      raise exception 'Ya usaste todas tus cargas por IA de este mes.' using errcode = 'NX005';
    else
      raise exception 'Comercio no encontrado.' using errcode = 'P0002';
    end if;
  end if;

  return v_cliente;
end;
$$;

-- Mismo criterio que la migración de restricción de
-- fn_actualizar_identidad_visual (20260810161000): reducir la superficie de
-- privilegios expuesta en vez de confiar únicamente en el chequeo de rol
-- interno de la función.
revoke execute on function public.fn_registrar_consumo_ia() from public;
revoke execute on function public.fn_registrar_consumo_ia() from anon;
grant execute on function public.fn_registrar_consumo_ia() to authenticated;
