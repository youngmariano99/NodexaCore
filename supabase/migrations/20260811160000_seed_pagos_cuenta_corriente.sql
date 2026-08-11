-- ------------------------------------------------------------
-- Siembra de pagos parciales/totales sobre movimientos_cuenta_corriente
-- (docs/SEED.md §2 y §8: 20 filas, sobre clientes finales con saldo deudor
-- pendiente). El lote volumétrico de ventas de Sprint 5
-- (supabase/migrations/20260810140000_seed_ventas_volumetrico.sql) es
-- anterior a la existencia del módulo Fiados: ninguna de esas 300 ventas
-- tiene `cliente_final_id`, así que los 25 `clientes_finales` sembrados
-- (docs/SEED.md §6) siguen todos en `saldo_deudor = 0` — no hay deuda real
-- de la cual pagar.
--
-- Para poder sembrar "pagos sobre saldo deudor pendiente" de forma
-- realista sin fabricar ventas/venta_items completos (fuera del alcance de
-- esta estación, que es sobre `registrarPagoCuentaCorriente`), se genera
-- primero un cargo inicial por cliente final vía un `movimiento_cc` con
-- `venta_id NULL` — mismo campo que ya distingue un pago manual de un
-- cargo por venta (docs/SCHEMA.md §10), interpretado acá como "saldo
-- migrado al alta del comercio en la plataforma", un escenario real de
-- onboarding con clientes que ya tenían cuenta corriente en otro sistema.
--
-- `movimientos_cuenta_corriente` no tiene una clave natural para un
-- `ON CONFLICT` (es append-only, docs/SCHEMA.md §10): la idempotencia de
-- re-ejecución se resuelve con un único guard al inicio — si ya existe
-- cualquier movimiento sembrado, todo el bloque se omite.
DO $$
DECLARE
  v_cf RECORD;
  v_cargo numeric(12,2);
  v_pago numeric(12,2);
  v_usuario_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM movimientos_cuenta_corriente) THEN
    RETURN;
  END IF;

  -- Paso previo: cargo inicial (saldo migrado) por cada cliente final.
  FOR v_cf IN SELECT cliente_final_id, cliente_id FROM clientes_finales LOOP
    v_usuario_id := CASE v_cf.cliente_id
      WHEN 'a1111111-1111-4111-8111-111111111111' THEN 'd0000000-0000-4000-8000-000000000002'::uuid
      ELSE 'd0000000-0000-4000-8000-000000000007'::uuid
    END;
    v_cargo := ROUND((500 + random() * 9500)::numeric, 2);

    INSERT INTO movimientos_cuenta_corriente (cliente_final_id, venta_id, tipo, monto, usuario_id)
    VALUES (v_cf.cliente_final_id, NULL, 'cargo', v_cargo, v_usuario_id);

    UPDATE clientes_finales SET saldo_deudor = v_cargo WHERE cliente_final_id = v_cf.cliente_final_id;
  END LOOP;

  -- Paso de esta estación: 20 pagos parciales/totales (docs/SEED.md §8,
  -- bloque DO literal) sobre los clientes finales recién endeudados.
  FOR v_cf IN SELECT cliente_final_id, cliente_id, saldo_deudor FROM clientes_finales WHERE saldo_deudor > 0 LIMIT 20 LOOP
    v_usuario_id := CASE v_cf.cliente_id
      WHEN 'a1111111-1111-4111-8111-111111111111' THEN 'd0000000-0000-4000-8000-000000000002'::uuid
      ELSE 'd0000000-0000-4000-8000-000000000007'::uuid
    END;
    v_pago := ROUND(v_cf.saldo_deudor * (0.3 + random() * 0.7)::numeric, 2);

    INSERT INTO movimientos_cuenta_corriente (cliente_final_id, venta_id, tipo, monto, usuario_id)
    VALUES (v_cf.cliente_final_id, NULL, 'pago', v_pago, v_usuario_id);

    UPDATE clientes_finales SET saldo_deudor = GREATEST(saldo_deudor - v_pago, 0)
    WHERE cliente_final_id = v_cf.cliente_final_id;
  END LOOP;
END $$;
