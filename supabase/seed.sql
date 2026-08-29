-- ============================================================
-- SEED.sql — NODEXA CORE
-- Motor: PostgreSQL (Supabase)
-- Descripción: Script de siembra de datos de prueba completo,
-- atómico (transaccional) y con opción de limpieza total previa.
-- ============================================================

DO $$
DECLARE
  -- Variables para simulación de ventas y movimientos CC
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

  -- Variables para simulación de devoluciones y notas de crédito
  v_venta RECORD;
  v_item RECORD;
  v_devolucion_id uuid;
  v_monto_total numeric(12,2);
  v_n int := 0;
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
  -- 2. USUARIOS (Utilizando auth_user_id previamente creados en auth.users)
  -- ------------------------------------------------------------
  INSERT INTO usuarios (usuario_id, auth_user_id, cliente_id, rol, nombre, email) VALUES
    ('d0000000-0000-4000-8000-000000000001', 'a1a1a1a1-0000-4000-8000-000000000001', NULL, 'admin_nodexa', 'Soporte Nodexa', 'admin.demo@nodexa.app'),
    ('d0000000-0000-4000-8000-000000000010', 'a1a1a1a1-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000000', 'comerciante', 'Demo Owner', 'comerciante.demo@nodexa.app'),
    ('d0000000-0000-4000-8000-000000000003', 'a1a1a1a1-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000000', 'empleado', 'Empleado Demo', 'empleado.demo@nodexa.app'),
    ('d0000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-a00000000002', 'a1111111-1111-4111-8111-111111111111', 'comerciante', 'Pedro Almacenero', 'pedro@almacendonpedro.com'),
    ('d0000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-a00000000004', 'b2222222-2222-4222-8222-222222222222', 'comerciante', 'Roberto Ferretero', 'marta@ferreteriaeltornillo.com'),
    ('d0000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-a00000000007', 'c3333333-3333-4333-8333-333333333333', 'comerciante', 'Andrés Bazares', 'andres@bazarcasasur.com'),
    ('d0000000-0000-4000-8000-000000000008', 'a1a1a1a1-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000000', 'empleado', 'Empleado Demo Dos', 'empleado2.demo@nodexa.app'),
    ('d0000000-0000-4000-8000-000000000009', 'a1a1a1a1-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000000', 'empleado', 'Empleado Demo Tres', 'empleado3.demo@nodexa.app');

  -- ------------------------------------------------------------
  -- 3. TENANT MODULES (Habilitación de Módulos Plug & Play)
  -- ------------------------------------------------------------
  INSERT INTO tenant_modules (cliente_id, modulo, activo) VALUES
    ('a0000000-0000-4000-8000-000000000000', 'fiados', true),
    ('a0000000-0000-4000-8000-000000000000', 'devoluciones', true),
    ('a0000000-0000-4000-8000-000000000000', 'web', true),
    ('a0000000-0000-4000-8000-000000000000', 'ia', true),
    ('a0000000-0000-4000-8000-000000000000', 'bot_whatsapp', true),
    ('a1111111-1111-4111-8111-111111111111', 'fiados', true),
    ('a1111111-1111-4111-8111-111111111111', 'devoluciones', false),
    ('a1111111-1111-4111-8111-111111111111', 'web', false),
    ('a1111111-1111-4111-8111-111111111111', 'ia', false),
    ('a1111111-1111-4111-8111-111111111111', 'bot_whatsapp', false),
    ('b2222222-2222-4222-8222-222222222222', 'fiados', false),
    ('b2222222-2222-4222-8222-222222222222', 'devoluciones', true),
    ('b2222222-2222-4222-8222-222222222222', 'web', false),
    ('b2222222-2222-4222-8222-222222222222', 'ia', true),
    ('b2222222-2222-4222-8222-222222222222', 'bot_whatsapp', true),
    ('c3333333-3333-4333-8333-333333333333', 'fiados', true),
    ('c3333333-3333-4333-8333-333333333333', 'devoluciones', true),
    ('c3333333-3333-4333-8333-333333333333', 'web', true),
    ('c3333333-3333-4333-8333-333333333333', 'ia', true),
    ('c3333333-3333-4333-8333-333333333333', 'bot_whatsapp', true);

  -- ------------------------------------------------------------
  -- 4. MARCAS Y PROVEEDORES
  -- ------------------------------------------------------------
  INSERT INTO marcas (marca_id, cliente_id, nombre) VALUES
    ('m0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000000', 'Coca Cola'),
    ('m0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000000', 'Arcor'),
    ('m0000000-0000-4000-8000-000000000003', 'a1111111-1111-4111-8111-111111111111', 'La Serenísima'),
    ('m0000000-0000-4000-8000-000000000004', 'b2222222-2222-4222-8222-222222222222', 'Stanley'),
    ('m0000000-0000-4000-8000-000000000005', 'c3333333-3333-4333-8333-333333333333', 'Tramontina');

  INSERT INTO proveedores (proveedor_id, cliente_id, razon_social, cuit, telefono, email, direccion) VALUES
    ('pr000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000000', 'Distribuidora Central S.A.', '30-11223344-5', '+5491144332211', 'ventas@distcentral.com', 'Av. Corrientes 1234, CABA'),
    ('pr000000-0000-4000-8000-000000000002', 'a1111111-1111-4111-8111-111111111111', 'Lácteos del Sur SRL', '30-99887766-4', '+5492914556677', 'pedidos@lacteosdelsur.com', 'Ruta 3 Km 680, Bahía Blanca'),
    ('pr000000-0000-4000-8000-000000000003', 'b2222222-2222-4222-8222-222222222222', 'Mayorista Ferretero SA', '30-55443322-1', '+5492214889900', 'contacto@mayfer.com.ar', 'Calle 44 nro 890, La Plata');

  -- ------------------------------------------------------------
  -- 5. REPARTIDORES (Deliverys)
  -- ------------------------------------------------------------
  INSERT INTO repartidores (repartidor_id, cliente_id, nombre, telefono, vehiculo, activo, pin_acceso) VALUES
    ('r0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000000', 'Juan Motero', '+5492920554433', 'Honda Wave 110cc', true, '1234'),
    ('r0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000000', 'Marcos Bici', '+5492920667788', 'Bicicleta Rodado 29', true, '5678'),
    ('r0000000-0000-4000-8000-000000000003', 'c3333333-3333-4333-8333-333333333333', 'Diego Delivery', '+5492920990011', 'Fiat Fiorino', true, '9999');

  -- ------------------------------------------------------------
  -- 6. PRODUCTOS Y STOCK BASE
  -- ------------------------------------------------------------
  INSERT INTO productos (
    producto_id, cliente_id, nombre, sku, precio, costo, stock_actual,
    minimo_stock, publicado, imagen_url, categoria, marca_id, proveedor_id
  ) VALUES
    ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000000', 'Gaseosa Cola 2.25L', 'BEB-001', 2500, 1800, 45, 10, true, 'https://cdn.nodexa.app/seed/cola.webp', 'Bebidas', 'm0000000-0000-4000-8000-000000000001', 'pr000000-0000-4000-8000-000000000001'),
    ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000000', 'Galletitas Chocolatadas 300g', 'GAL-002', 1400, 950, 12, 15, true, 'https://cdn.nodexa.app/seed/galletitas.webp', 'Almacén', 'm0000000-0000-4000-8000-000000000002', 'pr000000-0000-4000-8000-000000000001'),
    ('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000000', 'Leche Entera 1L', 'LAC-003', 1100, 820, 80, 20, true, 'https://cdn.nodexa.app/seed/leche.webp', 'Lácteos', NULL, 'pr000000-0000-4000-8000-000000000001'),
    ('e1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 'Yogur Entero Frutilla 1L', 'LAC-101', 1600, 1150, 30, 8, true, NULL, 'Lácteos', 'm0000000-0000-4000-8000-000000000003', 'pr000000-0000-4000-8000-000000000002'),
    ('e1111111-1111-4111-8111-111111111112', 'a1111111-1111-4111-8111-111111111111', 'Queso Cremoso 1kg', 'LAC-102', 7800, 5600, 18, 5, true, NULL, 'Lácteos', 'm0000000-0000-4000-8000-000000000003', 'pr000000-0000-4000-8000-000000000002'),
    ('e2222222-2222-4222-8222-222222222222', 'b2222222-2222-4222-8222-222222222222', 'Juego de Destornilladores 6 pzas', 'HER-201', 18500, 12000, 25, 5, false, NULL, 'Herramientas', NULL, 'pr000000-0000-4000-8000-000000000003'),
    ('e2222222-2222-4222-8222-222222222223', 'b2222222-2222-4222-8222-222222222222', 'Termo Acero Inoxidable 1L', 'HER-202', 45000, 31000, 8, 3, false, NULL, 'Bazar', 'm0000000-0000-4000-8000-000000000004', 'pr000000-0000-4000-8000-000000000003'),
    ('e3333333-3333-4333-8333-333333333333', 'c3333333-3333-4333-8333-333333333333', 'Set Cubiertos Tramontina 24 pzas', 'BAZ-301', 28900, 19500, 40, 10, true, 'https://cdn.nodexa.app/seed/cubiertos.webp', 'Hogar', 'm0000000-0000-4000-8000-000000000005', NULL),
    ('e3333333-3333-4333-8333-333333333334', 'c3333333-3333-4333-8333-333333333333', 'Sartén Antiadherente 24cm', 'BAZ-302', 19800, 13400, 15, 4, true, 'https://cdn.nodexa.app/seed/sarten.webp', 'Hogar', 'm0000000-0000-4000-8000-000000000005', NULL);

  -- Volumetría de productos adicionada
  INSERT INTO productos (cliente_id, nombre, sku, precio, costo, stock_actual, minimo_stock, publicado, categoria)
  SELECT
    'a0000000-0000-4000-8000-000000000000',
    'Producto Demo ' || n,
    'SKU-DEMO-' || LPAD(n::text, 4, '0'),
    ROUND((100 + random() * 5000)::numeric, 2),
    ROUND((50 + random() * 2500)::numeric, 2),
    FLOOR(random() * 100)::int,
    5,
    true,
    'Almacén General'
  FROM generate_series(4, 120) n;

  -- ------------------------------------------------------------
  -- 7. CLIENTES FINALES (Padrón de Compradores a Cta Cte)
  -- ------------------------------------------------------------
  INSERT INTO clientes_finales (cliente_final_id, cliente_id, nombre, telefono, limite_credito, saldo_deudor, estado) VALUES
    ('c0f00000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000000', 'Juan Pérez (Fiado)', '+5492920112233', 50000, 15000, 'activo'),
    ('c0f00000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000000', 'María García', '+5492920445566', 30000, 0, 'activo'),
    ('c0f00000-0000-4000-8000-000000000003', 'a1111111-1111-4111-8111-111111111111', 'Vecino Jorge', '+5492920778899', 20000, 18500, 'activo'),
    ('c0f00000-0000-4000-8000-000000000004', 'c3333333-3333-4333-8333-333333333333', 'Restó Plaza', '+5492920990011', 150000, 89000, 'activo');

  -- Padrón masivo de clientes fiados para Bazar Casa Sur
  INSERT INTO clientes_finales (cliente_id, nombre, telefono, limite_credito, saldo_deudor, estado)
  SELECT
    'c3333333-3333-4333-8333-333333333333',
    'Cliente Fiado C' || n,
    '+5492923000' || LPAD(n::text, 3, '0'),
    ROUND((20000 + random() * 80000)::numeric, 0),
    ROUND((500 + random() * 15000)::numeric, 2),
    'activo'
  FROM generate_series(1, 10) n;

  -- ------------------------------------------------------------
  -- 8. CUENTAS CORRIENTES INICIALES
  -- ------------------------------------------------------------
  INSERT INTO cuentas_corrientes (cliente_id, cliente_final_id, saldo_deudor, limite_credito, estado)
  SELECT
    cf.cliente_id,
    cf.cliente_final_id,
    cf.saldo_deudor,
    cf.limite_credito,
    cf.estado
  FROM clientes_finales cf;

  -- ------------------------------------------------------------
  -- 9. VENTAS, MOVIMIENTOS CC E IMPUTACIONES
  -- ------------------------------------------------------------
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
      v_usuario_id := 'd0000000-0000-4000-8000-000000000006'::uuid;
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
            'd0000000-0000-4000-8000-000000000006', 'Falla de empaque o producto defectuoso', 'procesada', 0);

    FOR v_item IN
      SELECT venta_item_id, producto_id, cantidad, subtotal FROM venta_items
      WHERE venta_id = v_venta.venta_id LIMIT 1
    LOOP
      INSERT INTO devolucion_items (devolucion_id, venta_item_id, cantidad, monto)
      VALUES (v_devolucion_id, v_item.venta_item_id, v_item.cantidad, v_item.subtotal);

      v_monto_total := v_monto_total + v_item.subtotal;

      INSERT INTO movimientos_stock (cliente_id, producto_id, usuario_id, tipo, cantidad, saldo_resultante, referencia_devolucion_id)
      SELECT 'c3333333-3333-4333-8333-333333333333', v_item.producto_id, 'd0000000-0000-4000-8000-000000000006',
             'entrada', v_item.cantidad, p.stock_actual + v_item.cantidad, v_devolucion_id
      FROM productos p WHERE p.producto_id = v_item.producto_id;

      UPDATE productos SET stock_actual = stock_actual + v_item.cantidad WHERE producto_id = v_item.producto_id;
    END LOOP;

    UPDATE devoluciones SET monto_total = v_monto_total WHERE devolucion_id = v_devolucion_id;
    UPDATE ventas SET estado = 'devuelta_parcial' WHERE venta_id = v_venta.venta_id;

    INSERT INTO notas_credito (devolucion_id, cliente_id, monto, numero_comprobante)
    VALUES (v_devolucion_id, 'c3333333-3333-4333-8333-333333333333', v_monto_total, 'NC-C-' || LPAD(v_n::text, 6, '0'));
  END LOOP;

  -- ------------------------------------------------------------
  -- 12. CARGAS IA Y CONFIGURACIÓN BOT WHATSAPP
  -- ------------------------------------------------------------
  INSERT INTO cargas_ia (cliente_id, usuario_id, producto_id, imagen_url, resultado_extraido)
  SELECT
    'b2222222-2222-4222-8222-222222222222',
    'd0000000-0000-4000-8000-000000000004',
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
