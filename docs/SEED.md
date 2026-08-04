# SEED.md — NODEXA CORE

## 1. Estrategia del Lote de Datos de Prueba

- **Multi-tenant representativo:** se siembran 3 comercios (`clientes`) que cubren los escenarios operativos definidos en el SOP: un comercio pequeño recién dado de alta, un comercio en el umbral de aviso preventivo (90% del límite de SKU) y un comercio que ya superó el tope base y contrató un Pack de Catálogo Extendido.
- **Cobertura de roles:** se incluye 1 `admin_nodexa` (soporte global, `cliente_id = NULL`), y por cada tenant al menos 1 `comerciante` y 1 `empleado`, para validar la matriz de permisos de `ROLES.md`.
- **Cobertura de módulos:** los `tenant_modules` se activan de forma diferenciada entre tenants para probar que un módulo desactivado no rompe el Core (Pilar 1 — Modularidad).
- **Volumen para paginación real:** el catálogo de productos se siembra en cantidades que fuerzan paginación server-side (`LIMIT`/`OFFSET` o cursor) y disparan los umbrales de aviso (90%) y bloqueo (100%) descritos en SOP-03.
- **Cadena transaccional coherente:** las ventas generan `venta_items`, descuentan stock vía `movimientos_stock`, y un subconjunto deriva en `devoluciones` → `devolucion_items` → `notas_credito`, respetando que ninguna fila original se elimina físicamente.
- **Trazabilidad poblada:** cada mutación crítica sembrada genera su correspondiente fila en `auditoria_diffs`, validando el patrón de diffs asíncronos.
- **Idempotencia de siembra:** el script es re-ejecutable mediante `ON CONFLICT DO NOTHING` en las claves únicas (`slug`, `email`, `idempotency_key`, `numero_comprobante`), evitando duplicados en corridas repetidas de entorno local.

---

## 2. Volumen por Entidad

| Entidad | Volumen | Justificación |
| :--- | :--- | :--- |
| `clientes` | 3 | Escenarios: bajo uso, umbral 90%, sobre-límite con pack extendido |
| `usuarios` | 8 | 1 admin_nodexa + 3 comerciantes + 4 empleados (2 tenants con 2 empleados) |
| `tenant_modules` | 9 | Activación diferenciada de los 5 módulos entre los 3 tenants |
| `productos` | 1.960 | Tenant A: 50 · Tenant B: 910 (90% de 1.000) · Tenant C: 1.000 (fuerza pack +1.000) |
| `movimientos_stock` | ~2.400 | 1 entrada inicial por producto + salidas asociadas a ventas |
| `clientes_finales` | 25 | Solo en tenants con módulo `fiados` activo |
| `ventas` | 300 | Distribuidas en los 3 tenants, suficientes para probar paginación de historial |
| `venta_items` | ~650 | 1 a 3 ítems por venta |
| `movimientos_cuenta_corriente` | 60 | Cargos (por venta a cuenta) y pagos parciales/totales |
| `devoluciones` | 20 | Subconjunto de ventas confirmadas |
| `devolucion_items` | ~30 | 1 a 2 ítems por devolución |
| `notas_credito` | 20 | 1:1 con cada devolución |
| `cargas_ia` | 45 | Tenant con módulo `carga_ia` activo, cerca de la cuota de 40/mes |
| `configuracion_bot_whatsapp` | 2 | Solo tenants con módulo `bot_whatsapp` activo |
| `auditoria_diffs` | ~120 | Diffs de altas de producto, cambios de precio, pagos y devoluciones |

---

## 3. Script / Configuración de Siembra

```sql
-- ============================================================
-- SEED.md — NODEXA CORE
-- Motor: PostgreSQL (Supabase) — Reejecutable (ON CONFLICT DO NOTHING)
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. CLIENTES (Tenants)
-- ------------------------------------------------------------
INSERT INTO clientes (
  cliente_id, nombre_comercio, slug, estado_pago, limite_sku,
  cuota_mensual_ia, ia_consultas_usadas, ia_periodo_actual,
  logo_url, color_primario, dominio_personalizado, telefono_whatsapp
) VALUES
  ('a1111111-1111-4111-8111-111111111111', 'Almacén Don Pedro', 'almacen-don-pedro', true, 1000,
   40, 0, date_trunc('month', now()), NULL, '#3B82F6', NULL, '+5492920000001'),
  ('b2222222-2222-4222-8222-222222222222', 'Ferretería El Tornillo', 'ferreteria-el-tornillo', true, 1000,
   40, 34, date_trunc('month', now()), NULL, '#3B82F6', NULL, '+5492920000002'),
  ('c3333333-3333-4333-8333-333333333333', 'Bazar Casa Sur', 'bazar-casa-sur', true, 2000,
   40, 12, date_trunc('month', now()), NULL, '#3B82F6', 'bazarcasasur.com.ar', '+5492920000003')
ON CONFLICT (cliente_id) DO NOTHING;

-- ------------------------------------------------------------
-- 2. USUARIOS
-- Nota: auth_user_id debe existir previamente en auth.users
-- (creado vía Supabase Auth Admin API antes de correr este seed).
-- ------------------------------------------------------------
INSERT INTO usuarios (usuario_id, auth_user_id, cliente_id, rol, nombre, email) VALUES
  ('d0000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-a00000000001', NULL, 'admin_nodexa', 'Soporte NODEXA', 'soporte@nodexa.app'),

  ('d0000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-a00000000002', 'a1111111-1111-4111-8111-111111111111', 'comerciante', 'Pedro Gómez', 'pedro@almacendonpedro.com'),
  ('d0000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-a00000000003', 'a1111111-1111-4111-8111-111111111111', 'empleado', 'Lucía Fernández', 'lucia@almacendonpedro.com'),

  ('d0000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-a00000000004', 'b2222222-2222-4222-8222-222222222222', 'comerciante', 'Marta Silva', 'marta@ferreteriaeltornillo.com'),
  ('d0000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-a00000000005', 'b2222222-2222-4222-8222-222222222222', 'empleado', 'Diego Ríos', 'diego@ferreteriaeltornillo.com'),
  ('d0000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-a00000000006', 'b2222222-2222-4222-8222-222222222222', 'empleado', 'Rocío Paz', 'rocio@ferreteriaeltornillo.com'),

  ('d0000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-a00000000007', 'c3333333-3333-4333-8333-333333333333', 'comerciante', 'Andrés Bazán', 'andres@bazarcasasur.com'),
  ('d0000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-a00000000008', 'c3333333-3333-4333-8333-333333333333', 'empleado', 'Sol Medina', 'sol@bazarcasasur.com')
ON CONFLICT (usuario_id) DO NOTHING;

-- ------------------------------------------------------------
-- 3. TENANT_MODULES
-- ------------------------------------------------------------
INSERT INTO tenant_modules (cliente_id, modulo, activo) VALUES
  -- Almacén Don Pedro: solo fiados
  ('a1111111-1111-4111-8111-111111111111', 'fiados', true),

  -- Ferretería El Tornillo: catálogo web + carga IA + bot
  ('b2222222-2222-4222-8222-222222222222', 'catalogo_web', true),
  ('b2222222-2222-4222-8222-222222222222', 'carga_ia', true),
  ('b2222222-2222-4222-8222-222222222222', 'bot_whatsapp', true),

  -- Bazar Casa Sur: catálogo web + fiados + devoluciones + bot
  ('c3333333-3333-4333-8333-333333333333', 'catalogo_web', true),
  ('c3333333-3333-4333-8333-333333333333', 'fiados', true),
  ('c3333333-3333-4333-8333-333333333333', 'devoluciones', true),
  ('c3333333-3333-4333-8333-333333333333', 'bot_whatsapp', true),
  ('c3333333-3333-4333-8333-333333333333', 'carga_ia', false)  -- desactivado a propósito (prueba Pilar 1)
ON CONFLICT (cliente_id, modulo) DO NOTHING;

-- ------------------------------------------------------------
-- 4. PRODUCTOS (bulk)
-- Tenant A (Don Pedro): 50 productos — uso bajo
-- Tenant B (El Tornillo): 910 productos — 91% del límite (dispara aviso 90%)
-- Tenant C (Casa Sur): 1.000 productos — en el tope exacto (dispara bloqueo 100%)
-- ------------------------------------------------------------
INSERT INTO productos (cliente_id, sku, nombre, descripcion, categoria, precio, stock_actual, publicado, origen_alta)
SELECT
  'a1111111-1111-4111-8111-111111111111',
  'DP-' || LPAD(n::text, 5, '0'),
  'Producto Almacén ' || n,
  'ej. Yerba mate 1kg, paquete x' || n,
  (ARRAY['Almacén','Bebidas','Limpieza','Kiosco'])[1 + (n % 4)],
  ROUND((500 + random() * 9500)::numeric, 2),
  (10 + (n % 90)),
  (n % 3 = 0),
  'manual'
FROM generate_series(1, 50) n
ON CONFLICT (cliente_id, sku) DO NOTHING;

INSERT INTO productos (cliente_id, sku, nombre, descripcion, categoria, precio, stock_actual, publicado, origen_alta)
SELECT
  'b2222222-2222-4222-8222-222222222222',
  'FT-' || LPAD(n::text, 5, '0'),
  'Producto Ferretería ' || n,
  'ej. Tornillo autorroscante 3/4", caja x' || n,
  (ARRAY['Tornillería','Herramientas','Pinturas','Electricidad'])[1 + (n % 4)],
  ROUND((200 + random() * 14800)::numeric, 2),
  (5 + (n % 200)),
  (n % 2 = 0),
  CASE WHEN n % 5 = 0 THEN 'ia_vision' WHEN n % 7 = 0 THEN 'excel' ELSE 'manual' END
FROM generate_series(1, 910) n
ON CONFLICT (cliente_id, sku) DO NOTHING;

INSERT INTO productos (cliente_id, sku, nombre, descripcion, categoria, precio, stock_actual, publicado, origen_alta)
SELECT
  'c3333333-3333-4333-8333-333333333333',
  'CS-' || LPAD(n::text, 5, '0'),
  'Producto Bazar ' || n,
  'ej. Set de vasos x6, línea ' || n,
  (ARRAY['Bazar','Hogar','Regalería','Cocina'])[1 + (n % 4)],
  ROUND((300 + random() * 19700)::numeric, 2),
  (0 + (n % 60)),
  (n % 2 = 0),
  CASE WHEN n % 9 = 0 THEN 'excel' ELSE 'manual' END
FROM generate_series(1, 1000) n
ON CONFLICT (cliente_id, sku) DO NOTHING;

-- ------------------------------------------------------------
-- 5. MOVIMIENTOS_STOCK (entrada inicial por producto)
-- ------------------------------------------------------------
INSERT INTO movimientos_stock (cliente_id, producto_id, usuario_id, tipo, cantidad, saldo_resultante)
SELECT
  p.cliente_id,
  p.producto_id,
  CASE p.cliente_id
    WHEN 'a1111111-1111-4111-8111-111111111111' THEN 'd0000000-0000-4000-8000-000000000002'::uuid
    WHEN 'b2222222-2222-4222-8222-222222222222' THEN 'd0000000-0000-4000-8000-000000000004'::uuid
    ELSE 'd0000000-0000-4000-8000-000000000007'::uuid
  END,
  'entrada',
  p.stock_actual,
  p.stock_actual
FROM productos p
WHERE p.eliminado_en IS NULL;

-- ------------------------------------------------------------
-- 6. CLIENTES_FINALES (Módulo Fiados — solo tenants A y C)
-- ------------------------------------------------------------
INSERT INTO clientes_finales (cliente_final_id, cliente_id, nombre, telefono, saldo_deudor)
SELECT
  gen_random_uuid(),
  'a1111111-1111-4111-8111-111111111111',
  'Cliente Fiado A' || n,
  '+549292100' || LPAD(n::text, 3, '0'),
  0
FROM generate_series(1, 15) n;

INSERT INTO clientes_finales (cliente_final_id, cliente_id, nombre, telefono, saldo_deudor)
SELECT
  gen_random_uuid(),
  'c3333333-3333-4333-8333-333333333333',
  'Cliente Fiado C' || n,
  '+549292300' || LPAD(n::text, 3, '0'),
  0
FROM generate_series(1, 10) n;

-- ------------------------------------------------------------
-- 7. VENTAS + VENTA_ITEMS (con idempotency_key única)
-- ------------------------------------------------------------
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
  FOR v_i IN 1..300 LOOP
    -- Distribuir ventas entre los 3 tenants (100 cada uno aprox.)
    IF v_i % 3 = 0 THEN
      v_cliente_id := 'a1111111-1111-4111-8111-111111111111';
      v_usuario_id := (ARRAY['d0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000003'])[1 + (v_i % 2)]::uuid;
    ELSIF v_i % 3 = 1 THEN
      v_cliente_id := 'b2222222-2222-4222-8222-222222222222';
      v_usuario_id := (ARRAY['d0000000-0000-4000-8000-000000000004','d0000000-0000-4000-8000-000000000005','d0000000-0000-4000-8000-000000000006'])[1 + (v_i % 3)]::uuid;
    ELSE
      v_cliente_id := 'c3333333-3333-4333-8333-333333333333';
      v_usuario_id := (ARRAY['d0000000-0000-4000-8000-000000000007','d0000000-0000-4000-8000-000000000008'])[1 + (v_i % 2)]::uuid;
    END IF;

    -- 1 de cada 6 ventas va a cuenta corriente (si el tenant tiene fiados)
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

    -- Movimiento de cuenta corriente si la venta fue a fiado
    IF v_cliente_final_id IS NOT NULL THEN
      INSERT INTO movimientos_cuenta_corriente (cliente_final_id, venta_id, tipo, monto, usuario_id)
      VALUES (v_cliente_final_id, v_venta_id, 'cargo', v_total, v_usuario_id);

      UPDATE clientes_finales SET saldo_deudor = saldo_deudor + v_total WHERE cliente_final_id = v_cliente_final_id;
    END IF;
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 8. PAGOS DE CUENTA CORRIENTE (parciales y totales)
-- ------------------------------------------------------------
DO $$
DECLARE
  v_cf RECORD;
  v_pago numeric(12,2);
  v_usuario_id uuid;
BEGIN
  FOR v_cf IN SELECT cliente_final_id, cliente_id, saldo_deudor FROM clientes_finales WHERE saldo_deudor > 0 LIMIT 20 LOOP
    v_usuario_id := CASE v_cf.cliente_id
      WHEN 'a1111111-1111-4111-8111-111111111111' THEN 'd0000000-0000-4000-8000-000000000002'::uuid
      ELSE 'd0000000-0000-4000-8000-000000000007'::uuid
    END;
    v_pago := ROUND(v_cf.saldo_deudor * (0.3 + random() * 0.7), 2);

    INSERT INTO movimientos_cuenta_corriente (cliente_final_id, venta_id, tipo, monto, usuario_id)
    VALUES (v_cf.cliente_final_id, NULL, 'pago', v_pago, v_usuario_id);

    UPDATE clientes_finales SET saldo_deudor = GREATEST(saldo_deudor - v_pago, 0)
    WHERE cliente_final_id = v_cf.cliente_final_id;
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 9. DEVOLUCIONES + DEVOLUCION_ITEMS + NOTAS_CREDITO
-- Solo tenant C (único con módulo 'devoluciones' activo)
-- ------------------------------------------------------------
DO $$
DECLARE
  v_venta RECORD;
  v_item RECORD;
  v_devolucion_id uuid;
  v_monto_total numeric(12,2);
  v_n int := 0;
BEGIN
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

-- ------------------------------------------------------------
-- 10. CARGAS_IA (solo tenant B, módulo carga_ia activo)
-- ------------------------------------------------------------
INSERT INTO cargas_ia (cliente_id, usuario_id, producto_id, imagen_url, resultado_extraido)
SELECT
  'b2222222-2222-4222-8222-222222222222',
  'd0000000-0000-4000-8000-000000000005',
  (SELECT producto_id FROM productos WHERE cliente_id = 'b2222222-2222-4222-8222-222222222222' ORDER BY random() LIMIT 1),
  'https://cdn.nodexa.app/seed/etiqueta-' || n || '.webp',
  jsonb_build_object('nombre', 'Producto detectado ' || n, 'precio', ROUND((500 + random() * 5000)::numeric, 2), 'categoria', 'Herramientas')
FROM generate_series(1, 34) n;

-- ------------------------------------------------------------
-- 11. CONFIGURACION_BOT_WHATSAPP (tenants B y C)
-- ------------------------------------------------------------
INSERT INTO configuracion_bot_whatsapp (cliente_id, activo, mensaje_horarios, mensaje_ubicacion, mensaje_catalogo)
VALUES
  ('b2222222-2222-4222-8222-222222222222', true,
   'ej. Atendemos de lunes a sábado de 8 a 20 hs.',
   'ej. Estamos en Av. San Martín 450, Coronel Pringles.',
   'ej. Mirá nuestro catálogo completo acá: https://ferreteriaeltornillo.nodexa.app'),
  ('c3333333-3333-4333-8333-333333333333', true,
   'ej. Abrimos de martes a domingo de 10 a 19 hs.',
   'ej. Nos encontrás en Belgrano 120, Coronel Pringles.',
   'ej. Todo nuestro bazar, a un clic: https://bazarcasasur.com.ar')
ON CONFLICT (cliente_id) DO NOTHING;

-- ------------------------------------------------------------
-- 12. AUDITORIA_DIFFS (altas y cambios representativos)
-- ------------------------------------------------------------
INSERT INTO auditoria_diffs (cliente_id, usuario_id, tabla_afectada, registro_id, campo_modificado, valor_anterior, valor_nuevo)
SELECT
  p.cliente_id,
  CASE p.cliente_id
    WHEN 'a1111111-1111-4111-8111-111111111111' THEN 'd0000000-0000-4000-8000-000000000002'::uuid
    WHEN 'b2222222-2222-4222-8222-222222222222' THEN 'd0000000-0000-4000-8000-000000000004'::uuid
    ELSE 'd0000000-0000-4000-8000-000000000007'::uuid
  END,
  'productos',
  p.producto_id,
  'precio',
  NULL,
  p.precio::text
FROM productos p
ORDER BY random()
LIMIT 100;

INSERT INTO auditoria_diffs (cliente_id, usuario_id, tabla_afectada, registro_id, campo_modificado, valor_anterior, valor_nuevo)
SELECT
  d.cliente_id,
  d.usuario_id,
  'ventas',
  d.venta_id,
  'estado',
  'confirmada',
  'devuelta_parcial'
FROM devoluciones d;

COMMIT;
```