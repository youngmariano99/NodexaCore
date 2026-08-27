-- ============================================================
-- SEED.sql — NODEXA CORE
-- Motor: PostgreSQL (Supabase)
-- Descripción: Script de siembra de datos de prueba completo,
-- atómico (transaccional) y con opción de limpieza total previa.
-- ============================================================

DO $$
BEGIN

  -- ------------------------------------------------------------
  -- 0. LIMPIEZA ATÓMICA DE DATOS PREVIOS (REINICIO A CERO)
  -- ------------------------------------------------------------
  TRUNCATE TABLE
    auditoria_diffs,
    cargas_ia,
    notas_credito,
    devolucion_items,
    devoluciones,
    imputaciones_comprobantes,
    movimientos_cuenta_corriente,
    cuentas_corrientes,
    pedido_items,
    pedidos_web,
    repartidores,
    venta_items,
    ventas,
    movimientos_stock,
    productos,
    proveedores,
    marcas,
    clientes_finales,
    configuracion_bot_whatsapp,
    ajustes_facturacion,
    tenant_modules,
    usuarios,
    clientes
  CASCADE;

  -- ------------------------------------------------------------
  -- 1. CLIENTES (Tenants Representativos)
  -- ------------------------------------------------------------
  INSERT INTO clientes (
    cliente_id, nombre_comercio, slug, estado_pago, limite_sku,
    cuota_mensual_ia, ia_consultas_usadas, ia_periodo_actual,
    logo_url, color_primario, dominio_personalizado, telefono_whatsapp
  ) VALUES
    ('a0000000-0000-4000-8000-000000000000', 'Nodexa Demo Store', 'demo-nodexa', true, 1000,
     40, 5, date_trunc('month', now()), NULL, '#10B981', NULL, '+5492920000000'),
    ('a1111111-1111-4111-8111-111111111111', 'Almacén Don Pedro', 'almacen-don-pedro', true, 1000,
     40, 0, date_trunc('month', now()), NULL, '#3B82F6', NULL, '+5492920000001'),
    ('b2222222-2222-4222-8222-222222222222', 'Ferretería El Tornillo', 'ferreteria-el-tornillo', true, 1000,
     40, 34, date_trunc('month', now()), NULL, '#F59E0B', NULL, '+5492920000002'),
    ('c3333333-3333-4333-8333-333333333333', 'Bazar Casa Sur', 'bazar-casa-sur', true, 2000,
     40, 12, date_trunc('month', now()), NULL, '#8B5CF6', 'bazarcasasur.com.ar', '+5492920000003');

  -- ------------------------------------------------------------
  -- 2. USUARIOS (Soporte Global, Comerciantes y Empleados)
  -- ------------------------------------------------------------
  INSERT INTO usuarios (usuario_id, auth_user_id, cliente_id, rol, nombre, email) VALUES
    ('d0000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-a00000000001', NULL, 'admin_nodexa', 'Soporte NODEXA Global', 'admin.demo@nodexa.app'),
    
    ('d0000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-a00000000010', 'a0000000-0000-4000-8000-000000000000', 'comerciante', 'Comerciante Demo', 'comerciante.demo@nodexa.app'),
    ('d0000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-a000000000011', 'a0000000-0000-4000-8000-000000000000', 'empleado', 'Empleado Mostrador Demo', 'empleado.demo@nodexa.app'),

    ('d0000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-a00000000002', 'a1111111-1111-4111-8111-111111111111', 'comerciante', 'Pedro Gómez', 'pedro@almacendonpedro.com'),
    ('d0000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-a00000000003', 'a1111111-1111-4111-8111-111111111111', 'empleado', 'Lucía Fernández', 'lucia@almacendonpedro.com'),

    ('d0000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-a00000000004', 'b2222222-2222-4222-8222-222222222222', 'comerciante', 'Marta Silva', 'marta@ferreteriaeltornillo.com'),
    ('d0000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-a00000000005', 'b2222222-2222-4222-8222-222222222222', 'empleado', 'Diego Ríos', 'diego@ferreteriaeltornillo.com'),

    ('d0000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-a00000000007', 'c3333333-3333-4333-8333-333333333333', 'comerciante', 'Andrés Bazán', 'andres@bazarcasasur.com'),
    ('d0000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-a00000000008', 'c3333333-3333-4333-8333-333333333333', 'empleado', 'Sol Medina', 'sol@bazarcasasur.com');

  -- ------------------------------------------------------------
  -- 3. MÓDULOS DE TENANT (Activación Modular Diferenciada)
  -- ------------------------------------------------------------
  INSERT INTO tenant_modules (cliente_id, modulo, activo) VALUES
    -- Tenant Demo: todos los módulos activos
    ('a0000000-0000-4000-8000-000000000000', 'fiados', true),
    ('a0000000-0000-4000-8000-000000000000', 'catalogo_web', true),
    ('a0000000-0000-4000-8000-000000000000', 'comandas', true),
    ('a0000000-0000-4000-8000-000000000000', 'deliverys', true),
    ('a0000000-0000-4000-8000-000000000000', 'devoluciones', true),
    ('a0000000-0000-4000-8000-000000000000', 'carga_ia', true),
    ('a0000000-0000-4000-8000-000000000000', 'bot_whatsapp', true),

    -- Tenant A (Almacén Don Pedro): solo fiados + comandas
    ('a1111111-1111-4111-8111-111111111111', 'fiados', true),
    ('a1111111-1111-4111-8111-111111111111', 'comandas', true),

    -- Tenant B (Ferretería El Tornillo): catálogo web + carga IA + bot + deliverys
    ('b2222222-2222-4222-8222-222222222222', 'catalogo_web', true),
    ('b2222222-2222-4222-8222-222222222222', 'carga_ia', true),
    ('b2222222-2222-4222-8222-222222222222', 'bot_whatsapp', true),
    ('b2222222-2222-4222-8222-222222222222', 'deliverys', true),

    -- Tenant C (Bazar Casa Sur): catálogo web + fiados + devoluciones + bot + comandas + deliverys
    ('c3333333-3333-4333-8333-333333333333', 'catalogo_web', true),
    ('c3333333-3333-4333-8333-333333333333', 'fiados', true),
    ('c3333333-3333-4333-8333-333333333333', 'devoluciones', true),
    ('c3333333-3333-4333-8333-333333333333', 'comandas', true),
    ('c3333333-3333-4333-8333-333333333333', 'deliverys', true),
    ('c3333333-3333-4333-8333-333333333333', 'bot_whatsapp', true);

  -- ------------------------------------------------------------
  -- 4. MARCAS Y PROVEEDORES
  -- ------------------------------------------------------------
  INSERT INTO marcas (marca_id, cliente_id, nombre, descripcion) VALUES
    ('m0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000000', 'Nodexa Select', 'Marca propia demo'),
    ('m0000000-0000-4000-8000-000000000002', 'b2222222-2222-4222-8222-222222222222', 'Stanley Tools', 'Herramientas de alta calidad'),
    ('m0000000-0000-4000-8000-000000000003', 'c3333333-3333-4333-8333-333333333333', 'Luminarc', 'Artículos de bazar y vajilla');

  INSERT INTO proveedores (proveedor_id, cliente_id, razon_social, cuit_cuil, contacto_nombre, telefono, email) VALUES
    ('p0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000000', 'Distribuidora Central S.A.', '30-71122334-9', 'Carlos Distribuidor', '+5492920111222', 'proveedor@distribuidoracentral.com'),
    ('p0000000-0000-4000-8000-000000000002', 'b2222222-2222-4222-8222-222222222222', 'Ferretera Industrial SRL', '30-88990011-4', 'Esteban Ferretero', '+5492920333444', 'ventas@ferreteraindustrial.com');

  -- ------------------------------------------------------------
  -- 5. REPARTIDORES (Delivery / Plan Premium+)
  -- ------------------------------------------------------------
  INSERT INTO repartidores (repartidor_id, cliente_id, nombre, telefono, activo, pin_acceso_hash) VALUES
    ('r0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000000', 'Juan Perez (Repartidor 1)', '+5492920999001', true, '1234'),
    ('r0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000000', 'Marcos Moto (Repartidor 2)', '+5492920999002', true, '5678'),
    ('r0000000-0000-4000-8000-000000000003', 'c3333333-3333-4333-8333-333333333333', 'Carlos Delivery Casa Sur', '+5492920999003', true, '1234');

  -- ------------------------------------------------------------
  -- 6. PRODUCTOS (Población Masiva para Paginación)
  -- ------------------------------------------------------------
  -- Tenant Demo (a000...): 20 productos representativos
  INSERT INTO productos (producto_id, cliente_id, sku, nombre, descripcion, categoria, precio, stock_actual, publicado, origen_alta)
  SELECT
    gen_random_uuid(),
    'a0000000-0000-4000-8000-000000000000',
    'DEMO-' || LPAD(n::text, 4, '0'),
    'Producto Demo ' || n,
    'Descripción del producto de prueba ' || n,
    (ARRAY['Almacén','Bebidas','Kiosco','Limpieza'])[1 + (n % 4)],
    ROUND((100 + random() * 4900)::numeric, 2),
    (15 + (n % 50)),
    true,
    'manual'
  FROM generate_series(1, 20) n;

  -- Tenant Don Pedro (a111...): 50 productos
  INSERT INTO productos (cliente_id, sku, nombre, descripcion, categoria, precio, stock_actual, publicado, origen_alta)
  SELECT
    'a1111111-1111-4111-8111-111111111111',
    'DP-' || LPAD(n::text, 5, '0'),
    'Producto Almacén ' || n,
    'Paquete o envase familiar x' || n,
    (ARRAY['Almacén','Bebidas','Limpieza','Kiosco'])[1 + (n % 4)],
    ROUND((500 + random() * 9500)::numeric, 2),
    (10 + (n % 90)),
    (n % 3 = 0),
    'manual'
  FROM generate_series(1, 50) n;

  -- Tenant Ferretería El Tornillo (b222...): 910 productos (91% de 1000 -> Aviso Preventivo)
  INSERT INTO productos (cliente_id, sku, nombre, descripcion, categoria, precio, stock_actual, publicado, origen_alta)
  SELECT
    'b2222222-2222-4222-8222-222222222222',
    'FT-' || LPAD(n::text, 5, '0'),
    'Producto Ferretería ' || n,
    'Tornillo autorroscante o accesorio x' || n,
    (ARRAY['Tornillería','Herramientas','Pinturas','Electricidad'])[1 + (n % 4)],
    ROUND((200 + random() * 14800)::numeric, 2),
    (5 + (n % 200)),
    (n % 2 = 0),
    CASE WHEN n % 5 = 0 THEN 'ia_vision' WHEN n % 7 = 0 THEN 'excel' ELSE 'manual' END
  FROM generate_series(1, 910) n;

  -- Tenant Bazar Casa Sur (c333...): 1000 productos (100% de 1000 -> Tope alcanzado)
  INSERT INTO productos (cliente_id, sku, nombre, descripcion, categoria, precio, stock_actual, publicado, origen_alta)
  SELECT
    'c3333333-3333-4333-8333-333333333333',
    'CS-' || LPAD(n::text, 5, '0'),
    'Producto Bazar ' || n,
    'Set de hogar o regalería línea ' || n,
    (ARRAY['Bazar','Hogar','Regalería','Cocina'])[1 + (n % 4)],
    ROUND((300 + random() * 19700)::numeric, 2),
    (0 + (n % 60)),
    (n % 2 = 0),
    CASE WHEN n % 9 = 0 THEN 'excel' ELSE 'manual' END
  FROM generate_series(1, 1000) n;

  -- ------------------------------------------------------------
  -- 7. MOVIMIENTOS DE STOCK INICIALES
  -- ------------------------------------------------------------
  INSERT INTO movimientos_stock (cliente_id, producto_id, usuario_id, tipo, cantidad, saldo_resultante)
  SELECT
    p.cliente_id,
    p.producto_id,
    CASE p.cliente_id
      WHEN 'a0000000-0000-4000-8000-000000000000' THEN 'd0000000-0000-4000-8000-000000000010'::uuid
      WHEN 'a1111111-1111-4111-8111-111111111111' THEN 'd0000000-0000-4000-8000-000000000002'::uuid
      WHEN 'b2222222-2222-4222-8222-222222222222' THEN 'd0000000-0000-4000-8000-000000000004'::uuid
      ELSE 'd0000000-0000-4000-8000-000000000007'::uuid
    END,
    'entrada',
    p.stock_actual,
    p.stock_actual
  FROM productos p;

  -- ------------------------------------------------------------
  -- 8. CLIENTES FINALES Y CUENTAS CORRIENTES (Fiados)
  -- ------------------------------------------------------------
  INSERT INTO clientes_finales (cliente_final_id, cliente_id, nombre, telefono, cuit_cuil, email, limite_credito, saldo_deudor, estado) VALUES
    ('c0f00000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000000', 'Juan Carlos Deudor (Demo)', '+5492920111001', '20-30111222-7', 'juancarlos@gmail.com', 50000, 15000, 'activo'),
    ('c0f00000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000000', 'María Al Límite (Demo)', '+5492920111002', '27-32444555-3', 'maria@gmail.com', 20000, 20000, 'activo'),
    ('c0f00000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000000', 'Roberto Suspendido (Demo)', '+5492920111003', '20-25888999-4', 'roberto@gmail.com', 10000, 12000, 'suspendido'),
    
    ('c0f11111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 'Aníbal Vecino Don Pedro', '+5492920222001', NULL, NULL, 30000, 8500, 'activo'),
    ('c0f33333-3333-4333-8333-333333333333', 'c3333333-3333-4333-8333-333333333333', 'Clara Cliente Casa Sur', '+5492920333001', NULL, NULL, 40000, 0, 'activo');

  -- Cabeceras de Cuentas Corrientes
  INSERT INTO cuentas_corrientes (cuenta_cc_id, cliente_id, cliente_final_id, saldo_actual, limite_credito, estado)
  SELECT
    gen_random_uuid(),
    cf.cliente_id,
    cf.cliente_final_id,
    cf.saldo_deudor,
    cf.limite_credito,
    cf.estado
  FROM clientes_finales cf;

  -- ------------------------------------------------------------
  -- 9. VENTAS, MOVIMIENTOS CC E IMPUTACIONES
  -- ------------------------------------------------------------
  DO $$
  DECLARE
    v_venta_id uuid;
    v_producto RECORD;
    v_cliente_id uuid;
    v_usuario_id uuid;
    v_cliente_final_id uuid;
    v_total numeric(12,2);
    v_cantidad int;
    v_subtotal numeric(12,2);
    v_i int;
    v_mov_debito_id uuid;
    v_mov_credito_id uuid;
  BEGIN
    FOR v_i IN 1..150 LOOP
      IF v_i % 4 = 0 THEN
        v_cliente_id := 'a0000000-0000-4000-8000-000000000000';
        v_usuario_id := 'd0000000-0000-4000-8000-000000000010'::uuid;
      ELSIF v_i % 4 = 1 THEN
        v_cliente_id := 'a1111111-1111-4111-8111-111111111111';
        v_usuario_id := 'd0000000-0000-4000-8000-000000000002'::uuid;
      ELSIF v_i % 4 = 2 THEN
        v_cliente_id := 'b2222222-2222-4222-8222-222222222222';
        v_usuario_id := 'd0000000-0000-4000-8000-000000000004'::uuid;
      ELSE
        v_cliente_id := 'c3333333-3333-4333-8333-333333333333';
        v_usuario_id := 'd0000000-0000-4000-8000-000000000007'::uuid;
      END IF;

      v_cliente_final_id := NULL;
      IF v_i % 5 = 0 AND v_cliente_id = 'a0000000-0000-4000-8000-000000000000' THEN
        v_cliente_final_id := 'c0f00000-0000-4000-8000-000000000001';
      END IF;

      v_venta_id := gen_random_uuid();
      INSERT INTO ventas (venta_id, cliente_id, usuario_id, cliente_final_id, total, estado, idempotency_key)
      VALUES (v_venta_id, v_cliente_id, v_usuario_id, v_cliente_final_id, 0, 'confirmada', 'seed-vta-' || v_i);

      v_total := 0;
      FOR v_producto IN
        SELECT producto_id, precio FROM productos
        WHERE cliente_id = v_cliente_id
        ORDER BY random() LIMIT 2
      LOOP
        v_cantidad := 1 + (v_i % 3);
        v_subtotal := ROUND(v_producto.precio * v_cantidad, 2);
        v_total := v_total + v_subtotal;

        INSERT INTO venta_items (venta_id, producto_id, cantidad, precio_unitario, subtotal)
        VALUES (v_venta_id, v_producto.producto_id, v_cantidad, v_producto.precio, v_subtotal);

        INSERT INTO movimientos_stock (cliente_id, producto_id, usuario_id, tipo, cantidad, saldo_resultante, referencia_venta_id)
        SELECT v_cliente_id, v_producto.producto_id, v_usuario_id, 'salida', v_cantidad,
               GREATEST(p.stock_actual - v_cantidad, 0), v_venta_id
        FROM productos p WHERE p.producto_id = v_producto.producto_id;

        UPDATE productos SET stock_actual = GREATEST(stock_actual - v_cantidad, 0)
        WHERE producto_id = v_producto.producto_id;
      END LOOP;

      UPDATE ventas SET total = v_total WHERE venta_id = v_venta_id;

      -- Registrar movimiento de cargo si fue a fiado
      IF v_cliente_final_id IS NOT NULL THEN
        v_mov_debito_id := gen_random_uuid();
        INSERT INTO movimientos_cuenta_corriente (
          movimiento_cc_id, cliente_id, cliente_final_id, tipo, monto, monto_pendiente,
          estado_imputacion, comprobante_tipo, numero_comprobante, usuario_id
        ) VALUES (
          v_mov_debito_id, v_cliente_id, v_cliente_final_id, 'cargo', v_total, v_total,
          'pendiente', 'factura', 'FAC-' || LPAD(v_i::text, 6, '0'), v_usuario_id
        );
      END IF;
    END LOOP;

    -- Simular un pago parcial con imputación contable
    v_mov_debito_id := (SELECT movimiento_cc_id FROM movimientos_cuenta_corriente WHERE tipo = 'cargo' LIMIT 1);
    IF v_mov_debito_id IS NOT NULL THEN
      v_mov_credito_id := gen_random_uuid();
      INSERT INTO movimientos_cuenta_corriente (
        movimiento_cc_id, cliente_id, cliente_final_id, tipo, monto, monto_pendiente,
        estado_imputacion, comprobante_tipo, numero_comprobante, metodo_pago, usuario_id
      ) VALUES (
        v_mov_credito_id, 'a0000000-0000-4000-8000-000000000000', 'c0f00000-0000-4000-8000-000000000001',
        'pago', 5000, 0, 'total', 'recibo_cobro', 'REC-000001', 'transferencia', 'd0000000-0000-4000-8000-000000000010'
      );

      INSERT INTO imputaciones_comprobantes (cliente_id, movimiento_credito_id, movimiento_debito_id, monto_imputado)
      VALUES ('a0000000-0000-4000-8000-000000000000', v_mov_credito_id, v_mov_debito_id, 5000);

      UPDATE movimientos_cuenta_corriente
      SET monto_pendiente = GREATEST(monto_pendiente - 5000, 0), estado_imputacion = 'parcial'
      WHERE movimiento_cc_id = v_mov_debito_id;
    END IF;
  END $$;

  -- ------------------------------------------------------------
  -- 10. PEDIDOS WEB (TABLERO KANBAN DE COMANDAS Y DELIVERYS)
  -- ------------------------------------------------------------
  INSERT INTO pedidos_web (
    pedido_id, cliente_id, codigo_seguimiento, estado, cliente_nombre,
    cliente_telefono, direccion_envio, metodo_envio, costo_envio,
    metodo_pago, total, notas, repartidor_id
  ) VALUES
    ('p0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000000', 'PED-1001', 'pendiente', 'Laura Gómez', '+5492920112233', 'Mitre 450', 'delivery', 1500, 'efectivo', 8500, 'Sin cebolla por favor', NULL),
    ('p0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000000', 'PED-1002', 'en_preparacion', 'Esteban Quito', '+5492920445566', 'Rivadavia 120', 'delivery', 1500, 'mercado_pago', 12000, 'Timbre 2B', NULL),
    ('p0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000000', 'PED-1003', 'listo', 'Patricia Paz', '+5492920778899', 'Av. San Martín 890', 'delivery', 1500, 'transferencia', 6400, NULL, 'r0000000-0000-4000-8000-000000000001'),
    ('p0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000000', 'PED-1004', 'en_camino', 'Mariano López', '+5492920119988', 'Belgrano 340', 'delivery', 1500, 'efectivo', 9800, 'Llevar cambio de $10000', 'r0000000-0000-4000-8000-000000000001'),
    ('p0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000000', 'PED-1005', 'entregado', 'Gonzalo Ruiz', '+5492920223344', 'Retira en local', 'takeaway', 0, 'efectivo', 4500, NULL, NULL);

  -- Ítems de pedidos web
  INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
  SELECT
    pw.pedido_id,
    p.producto_id,
    2,
    p.precio,
    (p.precio * 2)
  FROM pedidos_web pw
  JOIN productos p ON p.cliente_id = pw.cliente_id
  LIMIT 10;

  -- ------------------------------------------------------------
  -- 11. DEVOLUCIONES Y NOTAS DE CRÉDITO
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
      LIMIT 5
    LOOP
      v_n := v_n + 1;
      v_devolucion_id := gen_random_uuid();
      v_monto_total := 0;

      INSERT INTO devoluciones (devolucion_id, cliente_id, venta_id, usuario_id, motivo, estado, monto_total)
      VALUES (v_devolucion_id, 'c3333333-3333-4333-8333-333333333333', v_venta.venta_id,
              'd0000000-0000-4000-8000-000000000007', 'Falla de empaque o producto defectuoso', 'procesada', 0);

      FOR v_item IN
        SELECT venta_item_id, producto_id, cantidad, subtotal FROM venta_items
        WHERE venta_id = v_venta.venta_id LIMIT 1
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
      VALUES (v_devolucion_id, 'c3333333-3333-4333-8333-333333333333', v_monto_total, 'NC-C-' || LPAD(v_n::text, 6, '0'));
    END LOOP;
  END $$;

  -- ------------------------------------------------------------
  -- 12. CARGAS IA Y CONFIGURACIÓN BOT WHATSAPP
  -- ------------------------------------------------------------
  INSERT INTO cargas_ia (cliente_id, usuario_id, producto_id, imagen_url, resultado_extraido)
  SELECT
    'b2222222-2222-4222-8222-222222222222',
    'd0000000-0000-4000-8000-000000000005',
    (SELECT producto_id FROM productos WHERE cliente_id = 'b2222222-2222-4222-8222-222222222222' LIMIT 1),
    'https://cdn.nodexa.app/seed/etiqueta-' || n || '.webp',
    jsonb_build_object('nombre', 'Producto detectado ' || n, 'precio', ROUND((500 + random() * 5000)::numeric, 2), 'categoria', 'Herramientas')
  FROM generate_series(1, 34) n;

  INSERT INTO configuracion_bot_whatsapp (cliente_id, activo, mensaje_horarios, mensaje_ubicacion, mensaje_catalogo)
  VALUES
    ('a0000000-0000-4000-8000-000000000000', true,
     'Atendemos de lunes a sábado de 8 a 21 hs.',
     'Estamos en Av. Principal 100, Coronel Pringles.',
     'Mirá nuestro catálogo en https://demo-nodexa.nodexa.app'),
    ('b2222222-2222-4222-8222-222222222222', true,
     'Atendemos de lunes a sábado de 8 a 20 hs.',
     'Estamos en Av. San Martín 450, Coronel Pringles.',
     'Mirá nuestro catálogo en https://ferreteriaeltornillo.nodexa.app'),
    ('c3333333-3333-4333-8333-333333333333', true,
     'Abrimos de martes a domingo de 10 a 19 hs.',
     'Nos encontrás en Belgrano 120, Coronel Pringles.',
     'Catálogo web: https://bazarcasasur.com.ar');

  -- ------------------------------------------------------------
  -- 13. AUDITORÍA DIFFS (Trazabilidad de cambios)
  -- ------------------------------------------------------------
  INSERT INTO auditoria_diffs (cliente_id, usuario_id, tabla_afectada, registro_id, campo_modificado, valor_anterior, valor_nuevo)
  SELECT
    p.cliente_id,
    'd0000000-0000-4000-8000-000000000010'::uuid,
    'productos',
    p.producto_id,
    'precio',
    NULL,
    p.precio::text
  FROM productos p
  LIMIT 50;

  RAISE NOTICE 'Seed ejecutado exitosamente con limpieza total e inserciones atómicas complejas.';

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error al ejecutar el seed atómico: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END $$;
