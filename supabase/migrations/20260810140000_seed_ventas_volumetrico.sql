-- Siembra volumétrica de ventas (docs/SEED.md §2: "ventas: 300, distribuidas
-- en los 3 tenants, suficientes para probar paginación de historial";
-- docs/SEED.md §3, sección 7 "VENTAS + VENTA_ITEMS"). Corre como bloque
-- `DO $$` en vez de un `INSERT ... SELECT` plano porque cada venta necesita
-- resolver su propio total agregado (suma de sus `venta_items`, con cantidad
-- variable por venta) y su propio movimiento de stock por línea — no es una
-- fila derivable con una sola expresión set-based.
--
-- `idempotency_key = 'seed-venta-' || v_i` es única por diseño (300 valores
-- literales distintos), cumpliendo el mismo `UNIQUE (idempotency_key)` que
-- valida `fn_confirmar_venta` en producción — el seed no bypasea esa regla,
-- la ejercita con datos reales.
--
-- `clientes_finales` todavía no tiene siembra propia (estación futura de
-- Fiados): la rama de "venta a cuenta corriente" de abajo consulta esa tabla
-- pero, al estar vacía hoy, simplemente no encuentra filas y cada venta
-- queda con `cliente_final_id = NULL` — se deja el bloque tal como está
-- documentado en docs/SEED.md para que no haya que tocar esta migración
-- cuando Fiados se siembre más adelante.
--
-- A diferencia del script original de docs/SEED.md §3 (que asume 4
-- `empleados` ya sembrados en los tenants A/B/C), el `usuario_id` acá se fija
-- al `comerciante` de cada tenant: verificado contra el proyecto real antes
-- de escribir esta migración, los únicos usuarios que existen hoy para esos
-- 3 tenants son los 3 comerciantes (`seed_usuarios_comerciantes_multi_tenant`,
-- estación de auditoría asíncrona) — los empleados de esos tenants nunca se
-- sembraron (a diferencia de demo-nodexa, que sí tiene 3). Usar un `usuario_id`
-- de empleado inexistente rompería el `FOREIGN KEY` de `ventas.usuario_id`.
DO $$
DECLARE
  v_venta_id uuid;
  v_producto RECORD;
  v_cliente_id uuid;
  v_usuario_id uuid;
  v_cliente_final_id uuid;
  v_total numeric(12,2);
  v_cantidad_items int;
  v_i int;
  v_subtotal numeric(12,2);
  v_cantidad int;
BEGIN
  -- Idempotencia de la migración: si ya se sembraron las 300 ventas
  -- ('seed-venta-1'..'seed-venta-300'), no se reejecuta el bloque completo.
  IF EXISTS (SELECT 1 FROM ventas WHERE idempotency_key = 'seed-venta-1') THEN
    RETURN;
  END IF;

  FOR v_i IN 1..300 LOOP
    -- Distribuir ventas entre los 3 tenants (100 cada uno aprox.). El
    -- `usuario_id` es siempre el comerciante del tenant: son los únicos
    -- usuarios realmente sembrados hoy para A/B/C (ver nota arriba).
    IF v_i % 3 = 0 THEN
      v_cliente_id := 'a1111111-1111-4111-8111-111111111111';
      v_usuario_id := 'd0000000-0000-4000-8000-000000000002'::uuid;
    ELSIF v_i % 3 = 1 THEN
      v_cliente_id := 'b2222222-2222-4222-8222-222222222222';
      v_usuario_id := 'd0000000-0000-4000-8000-000000000004'::uuid;
    ELSE
      v_cliente_id := 'c3333333-3333-4333-8333-333333333333';
      v_usuario_id := 'd0000000-0000-4000-8000-000000000007'::uuid;
    END IF;

    -- 1 de cada 6 ventas va a cuenta corriente (si el tenant tiene fiados
    -- Y ya hay clientes_finales sembrados; hoy no los hay, así que esto es
    -- un no-op vigente hasta que se siembre esa tabla).
    v_cliente_final_id := NULL;
    IF v_i % 6 = 0 AND v_cliente_id IN ('a1111111-1111-4111-8111-111111111111','c3333333-3333-4333-8333-333333333333') THEN
      SELECT cliente_final_id INTO v_cliente_final_id
      FROM clientes_finales
      WHERE cliente_id = v_cliente_id
      ORDER BY random() LIMIT 1;
    END IF;

    v_total := 0;
    v_venta_id := gen_random_uuid();

    INSERT INTO ventas (venta_id, cliente_id, usuario_id, cliente_final_id, total, estado, idempotency_key)
    VALUES (v_venta_id, v_cliente_id, v_usuario_id, v_cliente_final_id, 0, 'confirmada', 'seed-venta-' || v_i);

    v_cantidad_items := 1 + (v_i % 3);
    FOR v_producto IN
      SELECT producto_id, precio FROM productos
      WHERE cliente_id = v_cliente_id AND eliminado_en IS NULL
      ORDER BY random() LIMIT v_cantidad_items
    LOOP
      v_cantidad := 1 + (v_i % 4);
      v_subtotal := ROUND(v_producto.precio * v_cantidad, 2);
      v_total := v_total + v_subtotal;

      INSERT INTO venta_items (venta_id, producto_id, cantidad, precio_unitario, subtotal)
      VALUES (v_venta_id, v_producto.producto_id, v_cantidad, v_producto.precio, v_subtotal);

      INSERT INTO movimientos_stock (cliente_id, producto_id, usuario_id, tipo, cantidad, saldo_resultante, referencia_venta_id)
      SELECT v_cliente_id, v_producto.producto_id, v_usuario_id, 'salida', v_cantidad,
             GREATEST(p.stock_actual - v_cantidad, 0), v_venta_id
      FROM productos p WHERE p.producto_id = v_producto.producto_id;

      UPDATE productos SET stock_actual = GREATEST(stock_actual - v_cantidad, 0), actualizado_en = now()
      WHERE producto_id = v_producto.producto_id;
    END LOOP;

    UPDATE ventas SET total = v_total WHERE venta_id = v_venta_id;

    -- Movimiento de cuenta corriente si la venta fue a fiado (no-op hoy,
    -- ver nota arriba: clientes_finales todavía no tiene siembra propia).
    IF v_cliente_final_id IS NOT NULL THEN
      INSERT INTO movimientos_cuenta_corriente (cliente_final_id, venta_id, tipo, monto, usuario_id)
      VALUES (v_cliente_final_id, v_venta_id, 'cargo', v_total, v_usuario_id);

      UPDATE clientes_finales SET saldo_deudor = saldo_deudor + v_total WHERE cliente_final_id = v_cliente_final_id;
    END IF;
  END LOOP;
END $$;
