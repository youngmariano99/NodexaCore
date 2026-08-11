-- ------------------------------------------------------------
-- Siembra de DEVOLUCIONES + DEVOLUCION_ITEMS + NOTAS_CREDITO (docs/SEED.md
-- §2 y §9, bloque DO literal): 20 devoluciones sobre ventas confirmadas del
-- único tenant con módulo `devoluciones` activo (Bazar Casa Sur).
--
-- Idempotencia de re-ejecución: `devoluciones`/`devolucion_items` no tienen
-- una clave natural para `ON CONFLICT` (devolucion_id se genera acá mismo);
-- se resuelve con un guard explícito al inicio, mismo criterio ya usado en
-- 20260811160000_seed_pagos_cuenta_corriente.sql para
-- movimientos_cuenta_corriente.
-- ------------------------------------------------------------
DO $$
DECLARE
  v_venta RECORD;
  v_item RECORD;
  v_devolucion_id uuid;
  v_monto_total numeric(12,2);
  v_n int := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM devoluciones WHERE cliente_id = 'c3333333-3333-4333-8333-333333333333') THEN
    RETURN;
  END IF;

  FOR v_venta IN
    SELECT venta_id FROM ventas
    WHERE cliente_id = 'c3333333-3333-4333-8333-333333333333' AND estado = 'confirmada'
    ORDER BY random() LIMIT 20
  LOOP
    v_n := v_n + 1;
    v_devolucion_id := gen_random_uuid();
    v_monto_total := 0;

    INSERT INTO devoluciones (devolucion_id, cliente_id, venta_id, usuario_id, motivo, estado, monto_total)
    VALUES (v_devolucion_id, 'c3333333-3333-4333-8333-333333333333', v_venta.venta_id,
            'd0000000-0000-4000-8000-000000000007', 'ej. Producto con falla de fábrica', 'procesada', 0);

    FOR v_item IN
      SELECT venta_item_id, producto_id, cantidad, subtotal FROM venta_items
      WHERE venta_id = v_venta.venta_id LIMIT 2
    LOOP
      INSERT INTO devolucion_items (devolucion_id, venta_item_id, cantidad, monto)
      VALUES (v_devolucion_id, v_item.venta_item_id, v_item.cantidad, v_item.subtotal);

      v_monto_total := v_monto_total + v_item.subtotal;

      INSERT INTO movimientos_stock (cliente_id, producto_id, usuario_id, tipo, cantidad, saldo_resultante, referencia_devolucion_id)
      SELECT 'c3333333-3333-4333-8333-333333333333', v_item.producto_id, 'd0000000-0000-4000-8000-000000000007',
             'entrada', v_item.cantidad, p.stock_actual + v_item.cantidad, v_devolucion_id
      FROM productos p WHERE p.producto_id = v_item.producto_id;

      UPDATE productos SET stock_actual = stock_actual + v_item.cantidad WHERE producto_id = v_item.producto_id;
    END LOOP;

    UPDATE devoluciones SET monto_total = v_monto_total WHERE devolucion_id = v_devolucion_id;
    UPDATE ventas SET estado = 'devuelta_parcial' WHERE venta_id = v_venta.venta_id;

    INSERT INTO notas_credito (devolucion_id, cliente_id, monto, numero_comprobante)
    VALUES (v_devolucion_id, 'c3333333-3333-4333-8333-333333333333', v_monto_total, 'NC-C-' || LPAD(v_n::text, 6, '0'))
    ON CONFLICT (numero_comprobante) DO NOTHING;
  END LOOP;
END $$;
