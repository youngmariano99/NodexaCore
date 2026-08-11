-- Registro de devolución de venta (docs/BACKLOG.md "Server Action
-- registrarDevolucion"). `devoluciones` + `devolucion_items` (Paso 3),
-- la restauración de `productos.stock_actual` (`movimientos_stock` ya trae
-- `referencia_devolucion_id`, docs/SCHEMA.md §6, precisamente para este
-- caso — confirmado además por el bloque de siembra ya documentado en
-- docs/SEED.md §9) y la nota de crédito 1:1 (docs/ROLES.md §2, fila
-- `notas_credito`: "L generada por el sistema" — nunca la inserta el
-- usuario directo) se generan todas dentro de la misma transacción: son
-- consecuencias atómicas de un único evento de negocio, no pasos
-- independientes.
--
-- SECURITY INVOKER: ninguna política RLS de `devoluciones`,
-- `devolucion_items`, `notas_credito`, `movimientos_stock` ni `ventas`
-- distingue rol para estas operaciones (verificado contra
-- supabase/migrations/20260809130100_enable_rls_policies.sql antes de
-- escribir código) — a diferencia de `clientes_finales`, acá no hace falta
-- ningún `SECURITY DEFINER`. El único rol habilitado para ejecutar esta
-- Server Action es `comerciante` (docs/ROLES.md §1: "Único rol habilitado
-- para autorizar devoluciones"), pero eso es un chequeo de aplicación, no
-- de RLS.
create or replace function public.fn_registrar_devolucion(
  p_venta_id uuid,
  p_motivo text,
  p_items jsonb
)
returns devoluciones
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_cliente_id uuid;
  v_usuario_id uuid;
  v_venta ventas;
  v_devolucion devoluciones;
  v_monto_total numeric(12,2);
  v_cantidad_pedidos integer;
  v_cantidad_resueltos integer;
  v_item record;
  v_cantidad_vendida integer;
  v_cantidad_ya_devuelta integer;
  v_total_items_venta integer;
  v_total_devuelto_venta integer;
begin
  v_cliente_id := auth_cliente_id();

  select usuario_id into v_usuario_id
  from usuarios
  where auth_user_id = auth.uid()
    and eliminado_en is null;

  if v_usuario_id is null then
    raise exception 'No se encontró el usuario solicitante.' using errcode = 'P0001';
  end if;

  select * into v_venta from ventas where venta_id = p_venta_id and cliente_id = v_cliente_id;

  if not found then
    raise exception 'No encontramos esta venta en tu comercio.' using errcode = 'P0002';
  end if;

  if v_venta.estado = 'devuelta_total' then
    raise exception 'Esta venta ya fue devuelta por completo.' using errcode = 'NX007';
  end if;

  select count(*) into v_cantidad_pedidos
  from jsonb_array_elements(p_items);

  -- Cada ítem pedido debe pertenecer a esta venta — no se distingue "no
  -- existe" de "es de otra venta" (docs/ROLES.md §3.8).
  select count(*) into v_cantidad_resueltos
  from jsonb_array_elements(p_items) as elem
  join venta_items vi
    on vi.venta_item_id = (elem->>'venta_item_id')::uuid
   and vi.venta_id = p_venta_id;

  if v_cantidad_resueltos <> v_cantidad_pedidos then
    raise exception 'Uno o más ítems no pertenecen a esta venta.' using errcode = 'P0002';
  end if;

  -- Paso 1 (validación "contra lo vendido", NX-DEV-002): por ítem, la
  -- cantidad pedida no puede superar lo que queda disponible para devolver
  -- — vendido menos lo ya devuelto en devoluciones previas de ese mismo
  -- `venta_item_id` (no solo contra la cantidad vendida original, que
  -- permitiría exceder el total acumulando varias devoluciones parciales).
  for v_item in
    select (elem->>'venta_item_id')::uuid as venta_item_id, (elem->>'cantidad')::integer as cantidad
    from jsonb_array_elements(p_items) as elem
  loop
    if v_item.cantidad <= 0 then
      raise exception 'La cantidad a devolver debe ser mayor a cero.' using errcode = 'NX006';
    end if;

    select vi.cantidad into v_cantidad_vendida
    from venta_items vi
    where vi.venta_item_id = v_item.venta_item_id;

    select coalesce(sum(di.cantidad), 0) into v_cantidad_ya_devuelta
    from devolucion_items di
    where di.venta_item_id = v_item.venta_item_id;

    if v_item.cantidad > (v_cantidad_vendida - v_cantidad_ya_devuelta) then
      raise exception 'No podés devolver más unidades de las que se vendieron originalmente.' using errcode = 'NX006';
    end if;
  end loop;

  select coalesce(sum(vi.precio_unitario * (elem->>'cantidad')::integer), 0)
  into v_monto_total
  from jsonb_array_elements(p_items) as elem
  join venta_items vi
    on vi.venta_item_id = (elem->>'venta_item_id')::uuid;

  insert into devoluciones (cliente_id, venta_id, usuario_id, motivo, monto_total)
  values (v_cliente_id, p_venta_id, v_usuario_id, p_motivo, v_monto_total)
  returning * into v_devolucion;

  insert into devolucion_items (devolucion_id, venta_item_id, cantidad, monto)
  select
    v_devolucion.devolucion_id,
    (elem->>'venta_item_id')::uuid,
    (elem->>'cantidad')::integer,
    vi.precio_unitario * (elem->>'cantidad')::integer
  from jsonb_array_elements(p_items) as elem
  join venta_items vi
    on vi.venta_item_id = (elem->>'venta_item_id')::uuid;

  -- Restaura el stock devuelto (docs/SCHEMA.md §6 `referencia_devolucion_id`)
  -- con el mismo patrón atómico de lectura+escritura combinadas en el
  -- `UPDATE ... RETURNING` que ya usa `fn_registrar_movimiento_stock`.
  for v_item in
    select
      vi.producto_id as producto_id,
      (elem->>'cantidad')::integer as cantidad
    from jsonb_array_elements(p_items) as elem
    join venta_items vi
      on vi.venta_item_id = (elem->>'venta_item_id')::uuid
  loop
    declare
      v_nuevo_stock integer;
    begin
      update productos
      set stock_actual = stock_actual + v_item.cantidad,
          actualizado_en = now()
      where producto_id = v_item.producto_id
        and cliente_id = v_cliente_id
      returning stock_actual into v_nuevo_stock;

      insert into movimientos_stock (
        cliente_id, producto_id, usuario_id, tipo, cantidad, saldo_resultante, referencia_devolucion_id
      )
      values (
        v_cliente_id, v_item.producto_id, v_usuario_id, 'entrada', v_item.cantidad, v_nuevo_stock, v_devolucion.devolucion_id
      );
    end;
  end loop;

  -- Nota de crédito 1:1 (Paso 3, docs/SCHEMA.md §13: `devolucion_id UNIQUE`).
  -- `numero_comprobante` se deriva del `devolucion_id` recién generado
  -- (`UNIQUE` por transitividad de la PK), sin necesitar una secuencia
  -- separada ni una ventana de carrera. Cualquier fallo acá (ej. violación
  -- de unicidad, prácticamente imposible con esta derivación) se traduce a
  -- `NX-DEV-004` sin dejar una devolución huérfana sin nota de crédito.
  begin
    insert into notas_credito (devolucion_id, cliente_id, monto, numero_comprobante)
    values (v_devolucion.devolucion_id, v_cliente_id, v_monto_total, 'NC-' || replace(v_devolucion.devolucion_id::text, '-', ''));
  exception
    when others then
      raise exception 'No pudimos generar la nota de crédito.' using errcode = 'NX008';
  end;

  -- Paso 4: `devuelta_total` si la suma acumulada de unidades devueltas de
  -- TODA la venta (incluida esta devolución, ya insertada arriba) alcanza
  -- el total vendido; si no, `devuelta_parcial`.
  select coalesce(sum(vi.cantidad), 0) into v_total_items_venta
  from venta_items vi
  where vi.venta_id = p_venta_id;

  select coalesce(sum(di.cantidad), 0) into v_total_devuelto_venta
  from devolucion_items di
  join devoluciones d on d.devolucion_id = di.devolucion_id
  where d.venta_id = p_venta_id;

  update ventas
  set estado = (case when v_total_devuelto_venta >= v_total_items_venta then 'devuelta_total' else 'devuelta_parcial' end)::estado_venta
  where venta_id = p_venta_id;

  return v_devolucion;
end;
$$;
