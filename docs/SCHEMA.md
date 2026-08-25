# Esquema de Base de Datos: NODEXA CORE

**Motor:** PostgreSQL (Supabase) — Relacional, Multi-Tenant, 3FN
**Aislamiento:** Row Level Security (RLS) por `cliente_id` en todas las tablas de negocio
**Convención de Borrado:** Soft Delete (`eliminado_en TIMESTAMPTZ NULL`) en entidades de negocio principales

---

## 1. Tipos Enumerados (ENUM)

```sql
CREATE TYPE rol_usuario AS ENUM ('admin_nodexa', 'comerciante', 'empleado');
CREATE TYPE modulo_nodexa AS ENUM ('catalogo_web', 'carga_ia', 'fiados', 'devoluciones', 'bot_whatsapp');
CREATE TYPE tipo_movimiento_stock AS ENUM ('entrada', 'salida');
CREATE TYPE estado_venta AS ENUM ('confirmada', 'devuelta_parcial', 'devuelta_total');
CREATE TYPE tipo_movimiento_cuenta AS ENUM ('cargo', 'pago');
CREATE TYPE estado_devolucion AS ENUM ('registrada', 'procesada');
CREATE TYPE origen_alta_producto AS ENUM ('manual', 'excel', 'ia_vision');
```

---

## 2. Entidad: `clientes` (Tenant / Comercio)

| Campo | Tipo | Restricciones |
| :--- | :--- | :--- |
| `cliente_id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` |
| `nombre_comercio` | `text` | `NOT NULL` |
| `slug` | `text` | `NOT NULL`, `UNIQUE` (usado en `/c/[clienteSlug]`) |
| `estado_pago` | `boolean` | `NOT NULL`, `DEFAULT true` |
| `limite_sku` | `integer` | `NOT NULL`, `DEFAULT 1000`, `CHECK (limite_sku > 0)` |
| `packs_sku_contratados` | `integer` | `NOT NULL`, `DEFAULT 0`, `CHECK (packs_sku_contratados >= 0)` (packs de ampliación de SKU contratados; base para calcular el próximo período de facturación) |
| `cuota_mensual_ia` | `integer` | `NOT NULL`, `DEFAULT 40` |
| `ia_consultas_usadas` | `integer` | `NOT NULL`, `DEFAULT 0`, `CHECK (ia_consultas_usadas >= 0)` |
| `ia_periodo_actual` | `date` | `NOT NULL`, `DEFAULT date_trunc('month', now())` (para reset mensual) |
| `logo_url` | `text` | `NULL` |
| `color_primario` | `text` | `NULL` |
| `dominio_personalizado` | `text` | `NULL`, `UNIQUE` |
| `telefono_whatsapp` | `text` | `NOT NULL` |
| `plantilla_activa` | `text` | `NOT NULL`, `DEFAULT 'basica'` |
| `configuracion_plantilla` | `jsonb` | `NOT NULL`, `DEFAULT '{}'::jsonb` |
| `creado_en` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |
| `eliminado_en` | `timestamptz` | `NULL` |

**Índices:** `idx_clientes_slug (slug)`, `idx_clientes_estado_pago (estado_pago)`

---

## 3. Entidad: `usuarios`

Extiende `auth.users` de Supabase (1:1 vía `auth_user_id`).

| Campo | Tipo | Restricciones |
| :--- | :--- | :--- |
| `usuario_id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` |
| `auth_user_id` | `uuid` | `NOT NULL`, `UNIQUE`, `REFERENCES auth.users(id)` |
| `cliente_id` | `uuid` | `NULL`, `REFERENCES clientes(cliente_id)` (`NULL` únicamente si `rol = 'admin_nodexa'`) |
| `rol` | `rol_usuario` | `NOT NULL` |
| `nombre` | `text` | `NOT NULL` |
| `email` | `text` | `NOT NULL`, `UNIQUE` |
| `creado_en` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |
| `eliminado_en` | `timestamptz` | `NULL` |

**Restricción:** `CHECK ((rol = 'admin_nodexa' AND cliente_id IS NULL) OR (rol != 'admin_nodexa' AND cliente_id IS NOT NULL))`
**Índices:** `idx_usuarios_cliente_id (cliente_id)`

---

## 4. Entidad: `tenant_modules` (Feature Flags)

| Campo | Tipo | Restricciones |
| :--- | :--- | :--- |
| `tenant_module_id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` |
| `cliente_id` | `uuid` | `NOT NULL`, `REFERENCES clientes(cliente_id)` |
| `modulo` | `modulo_nodexa` | `NOT NULL` |
| `activo` | `boolean` | `NOT NULL`, `DEFAULT true` |
| `activado_en` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |
| `desactivado_en` | `timestamptz` | `NULL` |

**Restricción:** `UNIQUE (cliente_id, modulo)`
**Índices:** `idx_tenant_modules_cliente (cliente_id, modulo)`

---

## 5. Entidad: `productos`

| Campo | Tipo | Restricciones |
| :--- | :--- | :--- |
| `producto_id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` |
| `cliente_id` | `uuid` | `NOT NULL`, `REFERENCES clientes(cliente_id)` |
| `sku` | `text` | `NOT NULL` |
| `nombre` | `text` | `NOT NULL` |
| `descripcion` | `text` | `NULL` |
| `categoria` | `text` | `NULL` |
| `precio` | `numeric(12,2)` | `NOT NULL`, `CHECK (precio >= 0)` |
| `stock_actual` | `integer` | `NOT NULL`, `DEFAULT 0`, `CHECK (stock_actual >= 0)` |
| `imagen_url` | `text` | `NULL` |
| `publicado` | `boolean` | `NOT NULL`, `DEFAULT false` |
| `origen_alta` | `origen_alta_producto` | `NOT NULL`, `DEFAULT 'manual'` |
| `creado_en` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |
| `actualizado_en` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |
| `eliminado_en` | `timestamptz` | `NULL` |
| `producto_padre_id` | `uuid` | `NULL`, `REFERENCES productos(producto_id) ON DELETE CASCADE` |
| `categoria_id` | `uuid` | `NULL`, `REFERENCES categorias(categoria_id) ON DELETE SET NULL` |
| `marca_id` | `uuid` | `NULL`, `REFERENCES marcas(marca_id) ON DELETE SET NULL` |
| `proveedor_id` | `uuid` | `NULL`, `REFERENCES proveedores(proveedor_id) ON DELETE SET NULL` |
| `stock_minimo` | `integer` | `NOT NULL`, `DEFAULT 0`, `CHECK (stock_minimo >= 0)` |

**Restricción:** `UNIQUE (cliente_id, sku)`
**Índices:** `idx_productos_cliente_publicado (cliente_id, publicado) WHERE eliminado_en IS NULL`, `idx_productos_cliente_activos (cliente_id) WHERE eliminado_en IS NULL` (soporte al conteo de límite de SKU), `idx_productos_padre_id (producto_padre_id)`, `idx_productos_categoria_id (categoria_id)`, `idx_productos_marca_id (marca_id)`, `idx_productos_proveedor_id (proveedor_id)`

---

## 5.1 Entidad: `marcas`

| Campo | Tipo | Restricciones |
| :--- | :--- | :--- |
| `marca_id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` |
| `nombre` | `text` | `NOT NULL` |
| `cliente_id` | `uuid` | `NOT NULL`, `REFERENCES clientes(cliente_id)` |
| `creado_en` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |
| `eliminado_en` | `timestamptz` | `NULL` |

---

## 5.2 Entidad: `categorias`

| Campo | Tipo | Restricciones |
| :--- | :--- | :--- |
| `categoria_id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` |
| `nombre` | `text` | `NOT NULL` |
| `cliente_id` | `uuid` | `NOT NULL`, `REFERENCES clientes(cliente_id)` |
| `creado_en` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |
| `eliminado_en` | `timestamptz` | `NULL` |

---

## 5.3 Entidad: `proveedores`

| Campo | Tipo | Restricciones |
| :--- | :--- | :--- |
| `proveedor_id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` |
| `nombre` | `text` | `NOT NULL` |
| `contacto` | `text` | `NOT NULL` |
| `dias_demora` | `integer` | `NOT NULL`, `DEFAULT 0`, `CHECK (dias_demora >= 0)` |
| `cliente_id` | `uuid` | `NOT NULL`, `REFERENCES clientes(cliente_id)` |
| `creado_en` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |
| `eliminado_en` | `timestamptz` | `NULL` |

**Índices:** `idx_proveedores_cliente_id (cliente_id)`

---

## 6. Entidad: `movimientos_stock`

| Campo | Tipo | Restricciones |
| :--- | :--- | :--- |
| `movimiento_id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` |
| `cliente_id` | `uuid` | `NOT NULL`, `REFERENCES clientes(cliente_id)` |
| `producto_id` | `uuid` | `NOT NULL`, `REFERENCES productos(producto_id)` |
| `usuario_id` | `uuid` | `NOT NULL`, `REFERENCES usuarios(usuario_id)` |
| `tipo` | `tipo_movimiento_stock` | `NOT NULL` |
| `cantidad` | `integer` | `NOT NULL`, `CHECK (cantidad > 0)` |
| `saldo_resultante` | `integer` | `NOT NULL`, `CHECK (saldo_resultante >= 0)` |
| `referencia_venta_id` | `uuid` | `NULL`, `REFERENCES ventas(venta_id)` |
| `referencia_devolucion_id` | `uuid` | `NULL`, `REFERENCES devoluciones(devolucion_id)` |
| `creado_en` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |

**Índices:** `idx_movstock_producto (producto_id, creado_en DESC)`, `idx_movstock_cliente (cliente_id, creado_en DESC)`

---

## 7. Entidad: `ventas`

| Campo | Tipo | Restricciones |
| :--- | :--- | :--- |
| `venta_id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` |
| `cliente_id` | `uuid` | `NOT NULL`, `REFERENCES clientes(cliente_id)` |
| `usuario_id` | `uuid` | `NOT NULL`, `REFERENCES usuarios(usuario_id)` |
| `cliente_final_id` | `uuid` | `NULL`, `REFERENCES clientes_finales(cliente_final_id)` (venta a cuenta corriente) |
| `total` | `numeric(12,2)` | `NOT NULL`, `CHECK (total >= 0)` |
| `estado` | `estado_venta` | `NOT NULL`, `DEFAULT 'confirmada'` |
| `idempotency_key` | `text` | `NOT NULL`, `UNIQUE` (control de concurrencia/duplicados) |
| `creado_en` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |
| `eliminado_en` | `timestamptz` | `NULL` |

**Índices:** `idx_ventas_cliente_fecha (cliente_id, creado_en DESC)`, `idx_ventas_cliente_final (cliente_final_id)`

---

## 8. Entidad: `venta_items`

| Campo | Tipo | Restricciones |
| :--- | :--- | :--- |
| `venta_item_id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` |
| `venta_id` | `uuid` | `NOT NULL`, `REFERENCES ventas(venta_id)` |
| `producto_id` | `uuid` | `NOT NULL`, `REFERENCES productos(producto_id)` |
| `cantidad` | `integer` | `NOT NULL`, `CHECK (cantidad > 0)` |
| `precio_unitario` | `numeric(12,2)` | `NOT NULL`, `CHECK (precio_unitario >= 0)` |
| `subtotal` | `numeric(12,2)` | `NOT NULL`, `CHECK (subtotal >= 0)` |

**Índices:** `idx_ventaitems_venta (venta_id)`, `idx_ventaitems_producto (producto_id)`

---

## 9. Entidad: `clientes_finales` (Módulo Fiados)

| Campo | Tipo | Restricciones |
| :--- | :--- | :--- |
| `cliente_final_id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` |
| `cliente_id` | `uuid` | `NOT NULL`, `REFERENCES clientes(cliente_id)` |
| `nombre` | `text` | `NOT NULL` |
| `telefono` | `text` | `NULL` |
| `saldo_deudor` | `numeric(12,2)` | `NOT NULL`, `DEFAULT 0` |
| `creado_en` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |
| `eliminado_en` | `timestamptz` | `NULL` |

**Índices:** `idx_clientesfinales_cliente (cliente_id) WHERE eliminado_en IS NULL`, `idx_clientesfinales_telefono_unico UNIQUE (cliente_id, telefono) WHERE telefono IS NOT NULL AND eliminado_en IS NULL` (docs/ERRORS.md `NX-FIA-005`: un alta sin `telefono` nunca colisiona)

---

## 10. Entidad: `movimientos_cuenta_corriente`

| Campo | Tipo | Restricciones |
| :--- | :--- | :--- |
| `movimiento_cc_id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` |
| `cliente_final_id` | `uuid` | `NOT NULL`, `REFERENCES clientes_finales(cliente_final_id)` |
| `venta_id` | `uuid` | `NULL`, `REFERENCES ventas(venta_id)` (`NULL` si es un pago manual) |
| `tipo` | `tipo_movimiento_cuenta` | `NOT NULL` |
| `monto` | `numeric(12,2)` | `NOT NULL`, `CHECK (monto > 0)` |
| `usuario_id` | `uuid` | `NOT NULL`, `REFERENCES usuarios(usuario_id)` |
| `creado_en` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |

**Índices:** `idx_movcc_clientefinal (cliente_final_id, creado_en DESC)`

---

## 11. Entidad: `devoluciones` (Módulo Devoluciones)

| Campo | Tipo | Restricciones |
| :--- | :--- | :--- |
| `devolucion_id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` |
| `cliente_id` | `uuid` | `NOT NULL`, `REFERENCES clientes(cliente_id)` |
| `venta_id` | `uuid` | `NOT NULL`, `REFERENCES ventas(venta_id)` |
| `usuario_id` | `uuid` | `NOT NULL`, `REFERENCES usuarios(usuario_id)` |
| `motivo` | `text` | `NOT NULL` |
| `estado` | `estado_devolucion` | `NOT NULL`, `DEFAULT 'registrada'` |
| `monto_total` | `numeric(12,2)` | `NOT NULL`, `CHECK (monto_total >= 0)` |
| `creado_en` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |

**Índices:** `idx_devoluciones_venta (venta_id)`, `idx_devoluciones_cliente (cliente_id, creado_en DESC)`

---

## 12. Entidad: `devolucion_items`

| Campo | Tipo | Restricciones |
| :--- | :--- | :--- |
| `devolucion_item_id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` |
| `devolucion_id` | `uuid` | `NOT NULL`, `REFERENCES devoluciones(devolucion_id)` |
| `venta_item_id` | `uuid` | `NOT NULL`, `REFERENCES venta_items(venta_item_id)` |
| `cantidad` | `integer` | `NOT NULL`, `CHECK (cantidad > 0)` |
| `monto` | `numeric(12,2)` | `NOT NULL`, `CHECK (monto >= 0)` |

**Índices:** `idx_devitems_devolucion (devolucion_id)`

---

## 13. Entidad: `notas_credito`

| Campo | Tipo | Restricciones |
| :--- | :--- | :--- |
| `nota_credito_id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` |
| `devolucion_id` | `uuid` | `NOT NULL`, `REFERENCES devoluciones(devolucion_id)`, `UNIQUE` |
| `cliente_id` | `uuid` | `NOT NULL`, `REFERENCES clientes(cliente_id)` |
| `monto` | `numeric(12,2)` | `NOT NULL`, `CHECK (monto >= 0)` |
| `numero_comprobante` | `text` | `NOT NULL`, `UNIQUE`, formato `NC-{cliente_id_corto}-{correlativo}`, generado por `fn_registrar_devolucion` vía `nextval('notas_credito_correlativo_seq')` (correlativo atómico, sin ventana de carrera) |
| `creado_en` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |

**Índices:** `idx_notascredito_cliente (cliente_id)`

---

## 14. Entidad: `cargas_ia` (Módulo Carga con IA)

| Campo | Tipo | Restricciones |
| :--- | :--- | :--- |
| `carga_ia_id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` |
| `cliente_id` | `uuid` | `NOT NULL`, `REFERENCES clientes(cliente_id)` |
| `usuario_id` | `uuid` | `NOT NULL`, `REFERENCES usuarios(usuario_id)` |
| `producto_id` | `uuid` | `NULL`, `REFERENCES productos(producto_id)` (`NULL` si el usuario descartó el resultado) |
| `imagen_url` | `text` | `NOT NULL` |
| `resultado_extraido` | `jsonb` | `NULL` (nombre, precio, categoría inferidos) |
| `creado_en` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |

**Índices:** `idx_cargasia_cliente_fecha (cliente_id, creado_en DESC)` (soporte al conteo de cuota mensual)

---

## 15. Entidad: `configuracion_bot_whatsapp` (Módulo Bot Estático)

| Campo | Tipo | Restricciones |
| :--- | :--- | :--- |
| `cliente_id` | `uuid` | `PK`, `REFERENCES clientes(cliente_id)` |
| `activo` | `boolean` | `NOT NULL`, `DEFAULT false` |
| `mensaje_horarios` | `text` | `NULL` |
| `mensaje_ubicacion` | `text` | `NULL` |
| `mensaje_catalogo` | `text` | `NULL` |
| `permite_derivar_whatsapp` | `boolean` | `NOT NULL`, `DEFAULT true` |
| `actualizado_en` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |

`permite_derivar_whatsapp`: controla si el FAQ del bot en la vidriera pública (`/c/[clienteSlug]`) ofrece al cliente final continuar la conversación por WhatsApp real (`wa.me` + `clientes.telefono_whatsapp`) cuando ninguna de las preguntas predefinidas resuelve su consulta. Columna agregada en la estación "Webhook de recepción de mensajes de WhatsApp" (redefinida como FAQ en catálogo + fallback a WhatsApp, ver docs/SITEMAP.md).

**Lectura pública:** `configuracion_bot_whatsapp_lectura_publica` (`activo = true`) y `tenant_modules_lectura_publica_bot` (`modulo = 'bot_whatsapp' AND activo = true`) exponen exclusivamente lo necesario para el FAQ de `cliente_final`, sin autenticación — mismo patrón que `productos_lectura_publica`/`clientes_lectura_publica` (docs/ROLES.md §3.5).

---

## 16. Entidad: `auditoria_diffs` (Trazabilidad Transversal)

| Campo | Tipo | Restricciones |
| :--- | :--- | :--- |
| `auditoria_id` | `bigint` | `PK`, `GENERATED ALWAYS AS IDENTITY` |
| `cliente_id` | `uuid` | `NOT NULL`, `REFERENCES clientes(cliente_id)` |
| `usuario_id` | `uuid` | `NOT NULL`, `REFERENCES usuarios(usuario_id)` |
| `tabla_afectada` | `text` | `NOT NULL` |
| `registro_id` | `uuid` | `NOT NULL` |
| `campo_modificado` | `text` | `NOT NULL` |
| `valor_anterior` | `text` | `NULL` |
| `valor_nuevo` | `text` | `NULL` |
| `creado_en` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |

**Índices:** `idx_auditoria_cliente_tabla (cliente_id, tabla_afectada, creado_en DESC)`, `idx_auditoria_registro (registro_id)`
**Partición sugerida:** por rango mensual de `creado_en` (bajo costo de retención, tabla de alto volumen).

---

## 17. Entidad: `ajustes_facturacion` (Facturación Recurrente)

| Campo | Tipo | Restricciones |
| :--- | :--- | :--- |
| `ajuste_facturacion_id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` |
| `cliente_id` | `uuid` | `NOT NULL`, `REFERENCES clientes(cliente_id)` |
| `concepto` | `text` | `NOT NULL`, `CHECK (concepto IN ('pack_sku', 'recarga_ia'))` |
| `monto` | `numeric(12,2)` | `NOT NULL`, `CHECK (monto >= 0)` |
| `periodo_facturado` | `date` | `NOT NULL` (primer día del mes que corresponde cobrar el ajuste — siempre el período SIGUIENTE al de la ampliación) |
| `creado_en` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |

**Índices:** `idx_ajustesfacturacion_cliente_periodo (cliente_id, periodo_facturado)`
**Append-only:** sin `UPDATE`/`DELETE` — un ajuste ya emitido no se corrige ni se borra, mismo criterio que `auditoria_diffs`/`movimientos_stock`.

**Modelo comercial de `concepto = 'pack_sku'` (escalonado decreciente, docs/BACKLOG.md "Actualización del próximo período de facturación en ampliaciones"):** pack 1 = $5.000 ARS, cada pack siguiente descuenta $1.000 ARS respecto del anterior, con piso de $2.000 ARS a partir del pack 4 en adelante (`calcularCostoPackSku`, `src/lib/dominio/facturacion/calcularCostoPackSku.ts`). `concepto = 'recarga_ia'` es un monto fijo de $3.000 ARS por paquete de +40 consultas (`COSTO_RECARGA_IA_ARS`) — ninguno de los dos montos estaba documentado antes de esta estación; se confirmaron explícitamente con el usuario por tratarse de datos de facturación real.

---

## 18. Relaciones (Resumen de Claves Foráneas)

```
clientes (1) ──< usuarios
clientes (1) ──< tenant_modules
clientes (1) ──< productos
clientes (1) ──< clientes_finales
clientes (1) ──< ventas
clientes (1) ──< devoluciones
clientes (1) ──< cargas_ia
clientes (1) ──1 configuracion_bot_whatsapp
clientes (1) ──< ajustes_facturacion

productos (1) ──< movimientos_stock
productos (1) ──< venta_items
productos (1) ──< cargas_ia

ventas (1) ──< venta_items
ventas (1) ──< devoluciones
ventas (1) ──< movimientos_cuenta_corriente

clientes_finales (1) ──< ventas
clientes_finales (1) ──< movimientos_cuenta_corriente

devoluciones (1) ──< devolucion_items
devoluciones (1) ──1 notas_credito
venta_items (1) ──< devolucion_items
```

---

## 19. Políticas RLS (Directriz de Aislamiento Multi-Tenant)

```sql
-- Patrón aplicado a toda tabla con columna cliente_id (ejemplo: productos)
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY productos_select_tenant ON productos
  FOR SELECT USING (cliente_id = (auth.jwt() ->> 'cliente_id')::uuid);

CREATE POLICY productos_insert_tenant ON productos
  FOR INSERT WITH CHECK (cliente_id = (auth.jwt() ->> 'cliente_id')::uuid);

CREATE POLICY productos_update_tenant ON productos
  FOR UPDATE USING (cliente_id = (auth.jwt() ->> 'cliente_id')::uuid)
  WITH CHECK (cliente_id = (auth.jwt() ->> 'cliente_id')::uuid);

-- Lectura pública restringida (vidriera) solo sobre productos publicados
CREATE POLICY productos_lectura_publica ON productos
  FOR SELECT USING (publicado = true AND eliminado_en IS NULL);
```

> Aplicar el mismo patrón (`cliente_id` del JWT) sobre: `movimientos_stock`, `ventas`, `venta_items`, `clientes_finales`, `movimientos_cuenta_corriente`, `devoluciones`, `devolucion_items`, `notas_credito`, `cargas_ia`, `configuracion_bot_whatsapp`, `tenant_modules`, `auditoria_diffs`. Ninguna política de `INSERT`, `UPDATE` o `DELETE` utiliza `USING (true)`.
>
> `ajustes_facturacion` es un caso especial dentro de este patrón: `SELECT` sigue la regla genérica (`cliente_id = auth_cliente_id() OR es_admin_nodexa()`), pero `INSERT` es exclusivo de `es_admin_nodexa()` (nunca `cliente_id = auth_cliente_id()`) — un comercio nunca genera sus propios cargos, mismo criterio ya aplicado a `clientes_update_admin`.