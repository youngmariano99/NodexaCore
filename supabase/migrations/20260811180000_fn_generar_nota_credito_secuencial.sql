-- Generación de nota de crédito con número de comprobante secuencial
-- (docs/BACKLOG.md "Función RPC de generación de nota de crédito", Paso 2:
-- formato `NC-{cliente_id_corto}-{correlativo}`). Reemplaza (`CREATE OR
-- REPLACE`, misma firma) a `fn_registrar_devolucion` de
-- supabase/migrations/20260811170000_fn_registrar_devolucion_rpc.sql — esa
-- migración ya está aplicada contra el proyecto real y nunca se reescribe;
-- el único cambio de esta estación es cómo se arma `numero_comprobante`
-- (Paso 1: la inserción automática en `notas_credito` dentro de la misma
-- transacción de la devolución ya estaba resuelta en esa estación
-- anterior, se mantiene intacta acá).
--
-- El correlativo se obtiene de una secuencia real de Postgres
-- (`nextval`), no de un `COUNT(*) + 1` sobre `notas_credito`: un conteo
-- previo tiene ventana de carrera bajo dos devoluciones concurrentes (ambas
-- podrían leer el mismo conteo y generar el mismo número), mientras que
-- `nextval()` es atómico y libre de bloqueos por diseño del motor — mismo
-- criterio "nunca un SELECT previo para decidir un valor único" que ya usa
-- todo el resto del repo (`idempotency_key`, `idx_clientesfinales_telefono_unico`).
-- Es una única secuencia global (no una por tenant): el prefijo
-- `{cliente_id_corto}` ya desambigua visualmente de qué comercio es cada
-- comprobante, y un correlativo estrictamente creciente global sigue
-- siendo "secuencial" en el sentido literal del Paso 2 sin necesitar una
-- secuencia dedicada por `cliente_id` (que exigiría SQL dinámico para
-- crearlas al vuelo por cada alta de comercio, complejidad no pedida por
-- el checklist).
create sequence if not exists public.notas_credito_correlativo_seq;

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
  v_numero_comprobante text;
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

  -- Validación "contra lo vendido" (NX-DEV-002): por ítem, la cantidad
  -- pedida no puede superar lo que queda disponible para devolver —
  -- vendido menos lo ya devuelto en devoluciones previas de ese mismo
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

  -- Paso 4: la venta original nunca se altera ni se elimina más allá de
  -- `estado` — el resto de sus columnas (`total`, `idempotency_key`,
  -- `usuario_id`, etc.) quedan intactas, esta función nunca las toca.
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

  -- Nota de crédito 1:1 (Paso 1 y 3, docs/SCHEMA.md §13:
  -- `devolucion_id UNIQUE`, `numero_comprobante UNIQUE`). `nextval()` sobre
  -- `notas_credito_correlativo_seq` es atómico: dos devoluciones
  -- concurrentes nunca reciben el mismo correlativo, así que
  -- `numero_comprobante` nunca colisiona por diseño — el `UNIQUE` de la
  -- columna sigue siendo la última garantía, no la única. Cualquier fallo
  -- acá (ej. violación de unicidad, o de la FK/UNIQUE de `devolucion_id`
  -- ante una carrera improbable) se traduce a `NX-DEV-004` sin dejar la
  -- devolución ya insertada arriba en un estado a medio camino: el `raise`
  -- revierte TODA la transacción (venta, ítems, stock y devolución
  -- incluidos), nunca queda una devolución "huérfana" sin su nota de
  -- crédito.
  v_numero_comprobante := 'NC-' || upper(left(replace(v_cliente_id::text, '-', ''), 8)) || '-'
    || lpad(nextval('public.notas_credito_correlativo_seq')::text, 6, '0');

  begin
    insert into notas_credito (devolucion_id, cliente_id, monto, numero_comprobante)
    values (v_devolucion.devolucion_id, v_cliente_id, v_monto_total, v_numero_comprobante);
  exception
    when others then
      raise exception 'No pudimos generar la nota de crédito.' using errcode = 'NX008';
  end;

  -- `devuelta_total` si la suma acumulada de unidades devueltas de TODA la
  -- venta (incluida esta devolución, ya insertada arriba) alcanza el total
  -- vendido; si no, `devuelta_parcial`. Único campo de `ventas` que esta
  -- función modifica (Paso 4).
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
