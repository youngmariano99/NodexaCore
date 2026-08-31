-- Migración: Configuración de Métodos de Pago y Desglose en Ventas
-- Ticket: Métodos de Pago y Promociones en Mostrador y Configuración

-- 1. Agregar columna configuracion_metodos_pago a la tabla clientes
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS configuracion_metodos_pago jsonb NOT NULL DEFAULT '[
    {"metodoPago":"efectivo","etiqueta":"Efectivo","tipoAjuste":"ninguno","porcentaje":0,"activo":true},
    {"metodoPago":"transferencia","etiqueta":"Transferencia","tipoAjuste":"ninguno","porcentaje":0,"activo":true},
    {"metodoPago":"debito","etiqueta":"Débito","tipoAjuste":"ninguno","porcentaje":0,"activo":true},
    {"metodoPago":"credito","etiqueta":"Crédito","tipoAjuste":"recargo","porcentaje":10,"activo":true},
    {"metodoPago":"cuenta_corriente","etiqueta":"Cta. Cte.","tipoAjuste":"ninguno","porcentaje":0,"activo":true}
  ]'::jsonb;

-- 2. Función RPC para actualizar métodos de pago sin exponer columnas administrativas a UPDATE directo (docs/ROLES.md)
CREATE OR REPLACE FUNCTION public.fn_actualizar_metodos_pago(
  p_configuracion jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id uuid;
BEGIN
  IF auth_rol() IS DISTINCT FROM 'comerciante' THEN
    RAISE EXCEPTION 'No tenés permiso para modificar los métodos de pago de este comercio.' USING errcode = 'P0001';
  END IF;

  v_cliente_id := auth_cliente_id();

  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el comercio del usuario solicitante.' USING errcode = 'P0002';
  END IF;

  UPDATE clientes
  SET configuracion_metodos_pago = p_configuracion
  WHERE cliente_id = v_cliente_id
    AND eliminado_en IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el comercio del usuario solicitante.' USING errcode = 'P0002';
  END IF;

  RETURN p_configuracion;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_actualizar_metodos_pago(jsonb) TO authenticated;

-- 3. Trazabilidad de recargos / descuentos en la tabla ventas
ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS porcentaje_ajuste numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monto_ajuste numeric(12,2) NOT NULL DEFAULT 0;

-- 3. Extender fn_confirmar_venta para soportar metodo_pago y ajustes comerciales
CREATE OR REPLACE FUNCTION public.fn_confirmar_venta(
  p_idempotency_key text,
  p_cliente_final_id uuid,
  p_items jsonb,
  p_metodo_pago text DEFAULT 'efectivo',
  p_porcentaje_ajuste numeric DEFAULT 0,
  p_monto_ajuste numeric DEFAULT 0
)
RETURNS ventas
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_cliente_id uuid;
  v_usuario_id uuid;
  v_subtotal_bruto numeric(12,2);
  v_total numeric(12,2);
  v_cantidad_pedidos integer;
  v_cantidad_resueltos integer;
  v_venta ventas;
  v_item record;
  v_nuevo_stock integer;
  v_metodo_pago text;
BEGIN
  v_cliente_id := auth_cliente_id();

  SELECT usuario_id INTO v_usuario_id
  FROM usuarios
  WHERE auth_user_id = auth.uid()
    AND eliminado_en IS NULL;

  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el usuario solicitante.' USING errcode = 'P0001';
  END IF;

  SELECT count(*) INTO v_cantidad_pedidos
  FROM jsonb_array_elements(p_items);

  SELECT count(*), coalesce(sum(round(p.precio * (elem->>'cantidad')::integer, 2)), 0)
  INTO v_cantidad_resueltos, v_subtotal_bruto
  FROM jsonb_array_elements(p_items) AS elem
  JOIN productos p
    ON p.producto_id = (elem->>'producto_id')::uuid
   AND p.cliente_id = v_cliente_id
   AND p.eliminado_en IS NULL;

  IF v_cantidad_resueltos <> v_cantidad_pedidos THEN
    RAISE EXCEPTION 'Uno o más productos no pertenecen a este comercio.' USING errcode = 'P0002';
  END IF;

  -- Calcular total final aplicando el monto de ajuste (recargo positivo o descuento negativo)
  v_total := round(v_subtotal_bruto + coalesce(p_monto_ajuste, 0), 2);
  IF v_total < 0 THEN
    v_total := 0;
  END IF;

  v_metodo_pago := coalesce(nullif(trim(p_metodo_pago), ''), 'efectivo');

  BEGIN
    INSERT INTO ventas (
      cliente_id, usuario_id, cliente_final_id, total, estado, idempotency_key,
      metodo_pago, porcentaje_ajuste, monto_ajuste
    )
    VALUES (
      v_cliente_id, v_usuario_id, p_cliente_final_id, v_total, 'confirmada', p_idempotency_key,
      v_metodo_pago, coalesce(p_porcentaje_ajuste, 0), coalesce(p_monto_ajuste, 0)
    )
    RETURNING * INTO v_venta;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Esta venta ya fue registrada.' USING errcode = 'NX002';
  END;

  INSERT INTO venta_items (venta_id, producto_id, cantidad, precio_unitario, subtotal)
  SELECT
    v_venta.venta_id,
    p.producto_id,
    (elem->>'cantidad')::integer,
    p.precio,
    round(p.precio * (elem->>'cantidad')::integer, 2)
  FROM jsonb_array_elements(p_items) AS elem
  JOIN productos p
    ON p.producto_id = (elem->>'producto_id')::uuid
   AND p.cliente_id = v_cliente_id
   AND p.eliminado_en IS NULL;

  FOR v_item IN
    SELECT
      (elem->>'producto_id')::uuid AS producto_id,
      (elem->>'cantidad')::integer AS cantidad
    FROM jsonb_array_elements(p_items) AS elem
  LOOP
    UPDATE productos
    SET stock_actual = stock_actual - v_item.cantidad,
        actualizado_en = now()
    WHERE producto_id = v_item.producto_id
      AND cliente_id = v_cliente_id
      AND eliminado_en IS NULL
      AND stock_actual >= v_item.cantidad
    RETURNING stock_actual INTO v_nuevo_stock;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No hay stock suficiente de este producto para completar la venta.' USING errcode = 'NX001';
    END IF;

    INSERT INTO movimientos_stock (
      cliente_id, producto_id, usuario_id, tipo, cantidad, saldo_resultante, referencia_venta_id
    )
    VALUES (
      v_cliente_id, v_item.producto_id, v_usuario_id, 'salida', v_item.cantidad, v_nuevo_stock, v_venta.venta_id
    );
  END LOOP;

  -- Venta a cuenta corriente
  IF p_cliente_final_id IS NOT NULL THEN
    PERFORM public.fn_incrementar_saldo_deudor(p_cliente_final_id, v_total);

    INSERT INTO movimientos_cuenta_corriente (cliente_final_id, venta_id, tipo, monto, usuario_id)
    VALUES (p_cliente_final_id, v_venta.venta_id, 'cargo', v_total, v_usuario_id);
  END IF;

  RETURN v_venta;
END;
$$;
