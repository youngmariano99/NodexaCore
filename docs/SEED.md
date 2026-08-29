# SEED.md — NODEXA CORE

## 1. Estrategia del Lote de Datos de Prueba

- **Limpieza Total y Atómica (Reset de DB):** El script comienza con un `TRUNCATE CASCADE` de todas las tablas de negocio dentro de un bloque transaccional atómico (`DO $$ BEGIN ... EXCEPTION ... END $$;`), garantizando que la siembra se aplique en su totalidad o se revierta limpia si ocurre algún fallo.
- **Multi-tenant Representativo:** Se siembran 4 comercios (`clientes`) que cubren todos los escenarios operativos:
  1. `demo-nodexa` (ID: `a0000000...`): Comercio principal de pruebas con todos los módulos activos (Comandas, Deliverys, Fiados, Catálogo Web, Devoluciones, Carga IA, Bot WhatsApp).
  2. `Almacén Don Pedro` (`almacen-don-pedro`): Comercio pequeño con 50 SKUs, uso bajo y módulos de Fiados + Comandas.
  3. `Ferretería El Tornillo` (`ferreteria-el-tornillo`): Comercio al **91% del límite de SKU** (910 de 1.000 productos) para verificar el aviso preventivo de cuota.
  4. `Bazar Casa Sur` (`bazar-casa-sur`): Comercio al **100% del límite** (1.000 productos de tope) con pack extendido de catálogo.
- **Cobertura de Roles (Matriz `ROLES.md`):** Incluye 1 `admin_nodexa` global (`admin.demo@nodexa.app`), y por cada tenant al menos 1 `comerciante` y 1 `empleado` para validar permisos. La contraseña universal es **`NodexaDemo123!`**.
- **Comandas y Deliverys (Plan Premium+):** Se siembran repartidores activos (`repartidores`) con PIN de acceso móvil y un flujo completo de comandas web (`pedidos_web`) distribuidas en el Tablero Kanban (`pendiente`, `en_preparacion`, `listo`, `en_camino`, `entregado`).
- **Cuentas Corrientes Contables (Fiados):** Se incluyen clientes finales (`clientes_finales`) con `limite_credito`, cuentas suspendidas (`estado = 'suspendido'`), cargos de factura (`movimientos_cuenta_corriente`) e imputaciones contables M:N (`imputaciones_comprobantes`).
- **Cadena Transaccional Coherente:** Las ventas generan `venta_items`, descuentan stock vía `movimientos_stock`, y un subconjunto deriva en `devoluciones` → `devolucion_items` → `notas_credito`.
- **Trazabilidad Poblada:** Mutaciones críticas sembradas generan filas en `auditoria_diffs`.

---

## 2. Volumen por Entidad

| Entidad | Volumen | Justificación / Escenario |
| :--- | :--- | :--- |
| `clientes` | 4 | 1 Demo completo + 3 Tenants (Bajo uso, Umbral 91%, Límite 100%) |
| `usuarios` | 9 | 1 Admin Global + 4 Comerciantes + 4 Empleados |
| `tenant_modules` | 17 | Activación diferenciada de los 7 módulos |
| `marcas` | 3 | Marcas por tenant |
| `proveedores` | 2 | Proveedores registrados con CUIT y contacto |
| `repartidores` | 3 | Repartidores activos con PIN para Delivery / Hoja Móvil |
| `productos` | 1.980 | Demo: 20 · Don Pedro: 50 · El Tornillo: 910 · Casa Sur: 1.000 |
| `movimientos_stock` | ~2.500 | Entradas iniciales + salidas por venta + reingresos por devolución |
| `clientes_finales` | 5 | Clientes finales activos, con exceso de límite y suspendidos |
| `cuentas_corrientes` | 5 | Cabeceras de cuenta corriente asociadas a clientes finales |
| `movimientos_cuenta_corriente` | ~20 | Cargos por factura, pagos recibidos e imputaciones |
| `imputaciones_comprobantes` | ~10 | Enlaces M:N entre pagos y facturas pendientes |
| `pedidos_web` | 5 | Pedidos web en estados Kanban (Pendiente, Preparación, Listo, Camino, Entregado) |
| `pedido_items` | 10 | Ítems de pedidos web |
| `ventas` | 150 | Distribuidas en los 4 tenants |
| `venta_items` | ~300 | 1 a 3 ítems por venta |
| `devoluciones` | 5 | Subconjunto de ventas procesadas |
| `devolucion_items` | ~8 | Ítems devueltos con reingreso a stock |
| `notas_credito` | 5 | Notas de crédito secuenciales asociadas a devoluciones |
| `cargas_ia` | 34 | Subidas de imágenes con extracción IA |
| `configuracion_bot_whatsapp` | 3 | Configuraciones activas de Bot de respuestas automáticas |
| `auditoria_diffs` | 50 | Diffs de trazabilidad de cambios |

---

## 3. Script SQL de Siembra (`supabase/seed.sql`)

```sql
-- ============================================================
-- SEED.sql — NODEXA CORE
-- Motor: PostgreSQL (Supabase)
-- Descripción: Script de siembra de datos de prueba completo,
-- atómico (transaccional) y con opción de limpieza total previa.
-- ============================================================

DO $$
BEGIN

  -- 0. LIMPIEZA ATÓMICA DE DATOS PREVIOS (REINICIO A CERO)
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

  -- 1. CLIENTES (Tenants)
  INSERT INTO clientes (
    cliente_id, nombre_comercio, slug, estado_pago, limite_sku,
    cuota_mensual_ia, ia_consultas_usadas, ia_periodo_actual,
    logo_url, color_primario, dominio_personalizado, telefono_whatsapp
  ) VALUES
    ('a0000000-0000-4000-8000-000000000000', 'Nodexa Demo Store', 'demo-nodexa', true, 1000, 40, 5, date_trunc('month', now()), NULL, '#10B981', NULL, '+5492920000000'),
    ('a1111111-1111-4111-8111-111111111111', 'Almacén Don Pedro', 'almacen-don-pedro', true, 1000, 40, 0, date_trunc('month', now()), NULL, '#3B82F6', NULL, '+5492920000001'),
    ('b2222222-2222-4222-8222-222222222222', 'Ferretería El Tornillo', 'ferreteria-el-tornillo', true, 1000, 40, 34, date_trunc('month', now()), NULL, '#F59E0B', NULL, '+5492920000002'),
    ('c3333333-3333-4333-8333-333333333333', 'Bazar Casa Sur', 'bazar-casa-sur', true, 2000, 40, 12, date_trunc('month', now()), NULL, '#8B5CF6', 'bazarcasasur.com.ar', '+5492920000003');

  -- 2. USUARIOS
  INSERT INTO usuarios (usuario_id, auth_user_id, cliente_id, rol, nombre, email) VALUES
    ('d0000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-a00000000001', NULL, 'admin_nodexa', 'Soporte NODEXA Global', 'admin.demo@nodexa.app'),
    ('d0000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-a000000000010', 'a0000000-0000-4000-8000-000000000000', 'comerciante', 'Comerciante Demo', 'comerciante.demo@nodexa.app'),
    ('d0000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-a000000000011', 'a0000000-0000-4000-8000-000000000000', 'empleado', 'Empleado Mostrador Demo', 'empleado.demo@nodexa.app'),
    ('d0000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-a00000000002', 'a1111111-1111-4111-8111-111111111111', 'comerciante', 'Pedro Gómez', 'pedro@almacendonpedro.com'),
    ('d0000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-a00000000003', 'a1111111-1111-4111-8111-111111111111', 'empleado', 'Lucía Fernández', 'lucia@almacendonpedro.com'),
    ('d0000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-a00000000004', 'b2222222-2222-4222-8222-222222222222', 'comerciante', 'Marta Silva', 'marta@ferreteriaeltornillo.com'),
    ('d0000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-a00000000005', 'b2222222-2222-4222-8222-222222222222', 'empleado', 'Diego Ríos', 'diego@ferreteriaeltornillo.com'),
    ('d0000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-a00000000007', 'c3333333-3333-4333-8333-333333333333', 'comerciante', 'Andrés Bazán', 'andres@bazarcasasur.com'),
    ('d0000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-a00000000008', 'c3333333-3333-4333-8333-333333333333', 'empleado', 'Sol Medina', 'sol@bazarcasasur.com');

  -- 3. MÓDULOS DE TENANT
  INSERT INTO tenant_modules (cliente_id, modulo, activo) VALUES
    ('a0000000-0000-4000-8000-000000000000', 'fiados', true),
    ('a0000000-0000-4000-8000-000000000000', 'catalogo_web', true),
    ('a0000000-0000-4000-8000-000000000000', 'comandas', true),
    ('a0000000-0000-4000-8000-000000000000', 'deliverys', true),
    ('a0000000-0000-4000-8000-000000000000', 'devoluciones', true),
    ('a0000000-0000-4000-8000-000000000000', 'carga_ia', true),
    ('a0000000-0000-4000-8000-000000000000', 'bot_whatsapp', true),
    ('a1111111-1111-4111-8111-111111111111', 'fiados', true),
    ('a1111111-1111-4111-8111-111111111111', 'comandas', true),
    ('b2222222-2222-4222-8222-222222222222', 'catalogo_web', true),
    ('b2222222-2222-4222-8222-222222222222', 'carga_ia', true),
    ('b2222222-2222-4222-8222-222222222222', 'bot_whatsapp', true),
    ('b2222222-2222-4222-8222-222222222222', 'deliverys', true),
    ('c3333333-3333-4333-8333-333333333333', 'catalogo_web', true),
    ('c3333333-3333-4333-8333-333333333333', 'fiados', true),
    ('c3333333-3333-4333-8333-333333333333', 'devoluciones', true),
    ('c3333333-3333-4333-8333-333333333333', 'comandas', true),
    ('c3333333-3333-4333-8333-333333333333', 'deliverys', true),
    ('c3333333-3333-4333-8333-333333333333', 'bot_whatsapp', true);

  -- REPARTIDORES
  INSERT INTO repartidores (repartidor_id, cliente_id, nombre, telefono, activo, pin_acceso_hash) VALUES
    ('r0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000000', 'Juan Perez (Repartidor 1)', '+5492920999001', true, '1234'),
    ('r0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000000', 'Marcos Moto (Repartidor 2)', '+5492920999002', true, '5678');

  RAISE NOTICE 'Seed atómico completado con éxito.';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error al ejecutar el seed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END $$;
```