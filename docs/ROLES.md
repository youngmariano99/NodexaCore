# ROLES.md — NODEXA CORE

## 1. Listado y Descripción de Roles del Sistema

| Rol | Alcance | Descripción |
| :--- | :--- | :--- |
| `admin_nodexa` | Global (todos los `cliente_id`) | Personal interno de NODEXA. Ejecuta el alta comercial de comercios, activa/desactiva módulos, gestiona `estado_pago` y `limite_sku` según SOP de morosidad y ampliación. No opera el día a día del comercio (ventas, stock). |
| `comerciante` | Un único `cliente_id` (tenant) | Dueño del comercio. Acceso completo a su propio tenant: Core (productos, stock, mostrador), configuración de módulos contratados, facturación, personalización de vidriera y bot. Único rol habilitado para autorizar devoluciones y modificar cuentas corrientes. |
| `empleado` | Un único `cliente_id` (tenant), asignado por el `comerciante` | Personal operativo del comercio (cajero). Opera mostrador y consulta stock. Acceso restringido a funciones administrativas, financieras y de configuración del tenant. |
| `cliente_final` (visitante público, no autenticado) | Público, sin sesión | No es un `usuario` del sistema. Accede únicamente a la vidriera pública (`productos` con `publicado = true`) y al bot de WhatsApp. No posee JWT ni fila en `usuarios`. |

> No se infieren roles adicionales (ej. "supervisor", "contador") por no estar respaldados por los requisitos funcionales entregados.

---

## 2. Matriz de Permisos (Roles vs. Entidades/Casos de Uso)

**Convención:** `C` Crear · `L` Leer · `M` Modificar · `B` Baja lógica · `—` Sin acceso

| Entidad / Caso de Uso | admin_nodexa | comerciante | empleado | cliente_final |
| :--- | :---: | :---: | :---: | :---: |
| `clientes` (propio tenant) | C·L·M | L·M (datos propios) | L (solo lectura básica) | — |
| `clientes` (otros tenants) | — | — | — | — |
| `usuarios` (alta de empleados) | L (soporte) | C·L·M·B (dentro de su tenant) | L (perfil propio) | — |
| `tenant_modules` | C·L·M | L (contratación vía solicitud) | L | — |
| `productos` — alta/edición/baja | L (soporte) | C·L·M·B | C·L·M (sin baja lógica) | L (solo `publicado=true`) |
| `productos` — publicar/despublicar | — | M | — | — |
| `movimientos_stock` | L (soporte) | C·L | C·L | — |
| `ventas` (mostrador) | L (soporte) | C·L | C·L | — |
| `venta_items` | L (soporte) | C·L | C·L | — |
| `devoluciones` | L (soporte) | C·L·M | C (requiere confirmación del comerciante) | — |
| `devolucion_items` | L (soporte) | C·L | — | — |
| `notas_credito` | L (soporte) | L (generada por el sistema) | — | — |
| `clientes_finales` (fiados) | — | C·L·M·B | C·L (sin editar límites) | — |
| `movimientos_cuenta_corriente` | — | C·L | C (solo registrar pagos) | — |
| `cargas_ia` | L (soporte) | C·L | C·L | — |
| `configuracion_bot_whatsapp` | L (soporte) | C·L·M | — | L (respuesta automática, sin ver config) |
| `auditoria_diffs` | L (todos los tenants) | L (propio tenant) | — | — |
| Exportación CSV/JSON (catálogo/transacciones) | L (soporte a pedido) | C (ejecuta exportación) | — | — |
| Facturación / `estado_pago` | C·M | L | — | — |
| Ampliación `limite_sku` / cuota IA | M | L (solicita ampliación) | — | — |

**Notas de matriz:**
- `empleado` nunca ejecuta baja lógica de `productos`, `clientes_finales` ni gestiona `devoluciones` sin flujo de confirmación explícita del `comerciante` (control operativo, no técnico — a reforzar en UI/Server Action).
- `admin_nodexa` no tiene permisos de escritura sobre `productos`, `ventas`, `clientes_finales`, `movimientos_cuenta_corriente`, `devoluciones` ni `cargas_ia`: su función es exclusivamente comercial/soporte, no operativa del comercio.
- Ninguna fila de `movimientos_cuenta_corriente`, `movimientos_stock`, `venta_items`, `devolucion_items` o `auditoria_diffs` admite `UPDATE`/`DELETE` por diseño (tablas append-only): no se listan permisos `M`/`B` sobre ellas fuera de lo indicado.

---

## 3. Reglas y Configuración de Aislamiento de Datos

### 3.1 Claims del JWT (Supabase Auth)

El token emitido en el login debe incluir, además de `sub`, los siguientes custom claims (vía `auth.users.raw_app_meta_data` o función `custom_access_token_hook`):

```json
{
  "sub": "auth_user_id",
  "cliente_id": "uuid | null",
  "rol": "admin_nodexa | comerciante | empleado"
}
```

> `cliente_id` es `null` únicamente para `admin_nodexa`, coherente con el `CHECK` de la tabla `usuarios`.

### 3.2 Función Helper de Autorización (reutilizable en políticas RLS)

```sql
CREATE OR REPLACE FUNCTION auth_cliente_id() RETURNS uuid AS $$
  SELECT (auth.jwt() ->> 'cliente_id')::uuid
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth_rol() RETURNS rol_usuario AS $$
  SELECT (auth.jwt() ->> 'rol')::rol_usuario
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION es_admin_nodexa() RETURNS boolean AS $$
  SELECT auth_rol() = 'admin_nodexa'
$$ LANGUAGE sql STABLE;
```

### 3.3 Patrón General de Aislamiento por Tenant (RLS)

Aplicado a toda tabla de negocio con columna `cliente_id` (`productos`, `movimientos_stock`, `ventas`, `venta_items`, `clientes_finales`, `movimientos_cuenta_corriente`, `devoluciones`, `devolucion_items`, `notas_credito`, `cargas_ia`, `configuracion_bot_whatsapp`, `tenant_modules`):

```sql
ALTER TABLE <tabla> ENABLE ROW LEVEL SECURITY;

-- Lectura: comerciante/empleado ven únicamente su tenant; admin_nodexa lectura global de soporte
CREATE POLICY <tabla>_select_tenant ON <tabla>
  FOR SELECT USING (
    cliente_id = auth_cliente_id()
    OR es_admin_nodexa()
  );

-- Escritura: exclusiva del propio tenant, admin_nodexa NO escribe en tablas operativas
CREATE POLICY <tabla>_insert_tenant ON <tabla>
  FOR INSERT WITH CHECK (cliente_id = auth_cliente_id());

CREATE POLICY <tabla>_update_tenant ON <tabla>
  FOR UPDATE USING (cliente_id = auth_cliente_id())
  WITH CHECK (cliente_id = auth_cliente_id());
```

> Ninguna política usa `USING (true)`. `es_admin_nodexa()` se otorga solo en `SELECT` de soporte, nunca en `INSERT`/`UPDATE`/`DELETE` de entidades operativas del comercio.

### 3.4 Restricción por Rol Dentro del Mismo Tenant (`empleado` vs `comerciante`)

Ejemplo sobre `productos` (el `empleado` no puede ejecutar baja lógica):

```sql
CREATE POLICY productos_update_tenant ON productos
  FOR UPDATE USING (cliente_id = auth_cliente_id())
  WITH CHECK (
    cliente_id = auth_cliente_id()
    AND (
      auth_rol() = 'comerciante'
      OR (auth_rol() = 'empleado' AND eliminado_en IS NULL)
    )
  );
```

Ejemplo sobre `clientes_finales` (el `empleado` no modifica `saldo_deudor` directamente, solo mediante `movimientos_cuenta_corriente`):

```sql
CREATE POLICY clientes_finales_update_tenant ON clientes_finales
  FOR UPDATE USING (cliente_id = auth_cliente_id())
  WITH CHECK (
    cliente_id = auth_cliente_id()
    AND auth_rol() = 'comerciante'
  );
```

### 3.5 Lectura Pública No Autenticada (Vidriera / `cliente_final`)

```sql
CREATE POLICY productos_lectura_publica ON productos
  FOR SELECT USING (
    publicado = true
    AND eliminado_en IS NULL
  );
```

> Esta política coexiste con `productos_select_tenant`; PostgreSQL evalúa políticas `SELECT` con `OR`, permitiendo acceso anónimo restringido sin necesidad de rol `authenticated`.

Mismo patrón para el FAQ del bot en la vidriera (`cliente_final`, fila "configuracion_bot_whatsapp": `L (respuesta automática, sin ver config)`):

```sql
CREATE POLICY configuracion_bot_whatsapp_lectura_publica ON configuracion_bot_whatsapp
  FOR SELECT USING (activo = true);

CREATE POLICY tenant_modules_lectura_publica_bot ON tenant_modules
  FOR SELECT USING (
    modulo = 'bot_whatsapp'
    AND activo = true
  );
```

> `tenant_modules` solo se abre para `modulo = 'bot_whatsapp'`: el resto de los módulos sigue sin lectura pública. Un bot desactivado (`activo = false`) o un módulo no contratado no exponen ninguna fila — ni siquiera para confirmar que existen.

### 3.6 Tabla Exclusiva de `admin_nodexa` (`clientes`, `estado_pago`, `limite_sku`)

```sql
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY clientes_select ON clientes
  FOR SELECT USING (
    cliente_id = auth_cliente_id()
    OR es_admin_nodexa()
  );

-- Solo admin_nodexa modifica estado_pago y limite_sku
CREATE POLICY clientes_update_admin ON clientes
  FOR UPDATE USING (es_admin_nodexa())
  WITH CHECK (es_admin_nodexa());

-- El comerciante actualiza únicamente campos de personalización (logo, color, teléfono)
-- vía Server Action con columnas explícitas, nunca UPDATE directo de fila completa desde el cliente
```

### 3.7 Tabla Append-Only sin `UPDATE`/`DELETE` (`auditoria_diffs`, `movimientos_stock`, `movimientos_cuenta_corriente`)

```sql
ALTER TABLE auditoria_diffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY auditoria_select ON auditoria_diffs
  FOR SELECT USING (
    cliente_id = auth_cliente_id()
    OR es_admin_nodexa()
  );

CREATE POLICY auditoria_insert_sistema ON auditoria_diffs
  FOR INSERT WITH CHECK (cliente_id = auth_cliente_id());

-- Sin política UPDATE/DELETE definida: cualquier intento es denegado por defecto (RLS deny-by-default)
```

### 3.8 Verificación IDOR/BOLA en Server Actions (Defensa en Profundidad)

RLS es la capa de base de datos; toda Server Action/Route Handler debe validar explícitamente el recurso antes de operar, sin confiar únicamente en el filtro implícito del cliente Supabase:

```sql
-- Patrón de verificación previa a mutación crítica (ej. confirmar devolución)
SELECT venta_id FROM ventas
WHERE venta_id = :venta_id_solicitado
  AND cliente_id = :cliente_id_del_jwt;
-- Si no retorna fila -> error normalizado NX-PER-001 (recurso no pertenece al tenant)
```

### 3.9 Aislamiento de `service_role`

La `service_role` key (bypass de RLS) se restringe exclusivamente a:
- Jobs asíncronos de auditoría (`auditoria_diffs`) y actualización de `ia_consultas_usadas` / `ia_periodo_actual`.
- Procesos administrativos de `admin_nodexa` (alta de `clientes`, suspensión por morosidad).

Prohibido su uso en cualquier ejecución iniciada desde el navegador del cliente, conforme a `04_NODEXA_Stack_Tecnológico_Arquitectura_Estándares_de_Código.md §3.6`.