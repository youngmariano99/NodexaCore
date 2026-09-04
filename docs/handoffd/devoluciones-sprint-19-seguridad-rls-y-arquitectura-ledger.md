# Handoffs y Entregables del Sprint - Sprint 19: Seguridad RLS y Arquitectura Ledger

**Objetivo:** Corregir vulnerabilidades de aislamiento Multi-Tenant y asentar las bases de la inmutabilidad contable (partida doble y concurrencia optimista).
**Capacidad:** 21 Ptos | **Duración:** 2 Semanas
**Estado del Sprint:** COMPLETADO

--- 

## 🎯 HU: Remediación de Políticas RLS en Cuentas Corrientes
*Criterios de Aceptación/Descripción:*
```text
Como administrador del sistema quiero corregir las políticas RLS de Cuentas Corrientes para que usen el cliente_id correcto del JWT y dividan los permisos, impidiendo borrados accidentales.
```

### 📄 [✔ COMPLETADA] Generar migración SQL correctiva para RLS
- **Rol:** BD
- **Componente/Ruta:** `migracion_rls_cuentas_corrientes.sql` (supabase/migrations)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se creó la migración SQL que reemplaza las políticas permisivas previas en cuentas_corrientes e imputaciones_comprobantes por políticas granulares SELECT, INSERT y UPDATE basadas en la raíz del token JWT (auth.jwt() ->> 'cliente_id'). Se agregó la cláusula WITH CHECK en las operaciones de escritura y se omitieron políticas para DELETE, garantizando la inmutabilidad y el aislamiento Zero-Trust. Se actualizó SCHEMA.md.

**Archivos Modificados:**
- `supabase/migrations/20260831020000_migracion_rls_cuentas_corrientes.sql`
- `docs/SCHEMA.md`

**Contratos y API signatures:**
- `cuentas_corrientes_select_tenant`
- `cuentas_corrientes_insert_tenant`
- `cuentas_corrientes_update_tenant`
- `imputaciones_comprobantes_select_tenant`
- `imputaciones_comprobantes_insert_tenant`
- `imputaciones_comprobantes_update_tenant`


--- 

## 🎯 HU: Motor Ledger: Impuestos, Pagos y Concurrencia
*Criterios de Aceptación/Descripción:*
```text
Como analista contable quiero que las tablas transaccionales cuenten con campos de desglose impositivo, método de pago y revisiones por concurrencia para soportar facturación.
```

### 📄 [✔ COMPLETADA] Ampliación de esquema Ventas
- **Rol:** BD
- **Componente/Ruta:** `migracion_ledger_ventas.sql` (supabase/migrations)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se creó la migración DDL que amplía la tabla ventas con los campos de desglose impositivo (base imponible, alícuotas de IVA, percepciones y exentos), método de pago y el campo lock_version para control de concurrencia optimista. Asimismo, se agregó lock_version con valor por defecto 0 a las tablas transaccionales movimientos_stock y movimientos_cuenta_corriente. Se actualizó la especificación en SCHEMA.md.

**Archivos Modificados:**
- `supabase/migrations/20260831010000_migracion_ledger_ventas.sql`
- `docs/SCHEMA.md`

**Contratos y API signatures:**
- `ventas (base_imponible, iva_10_5, iva_21, percepciones, exento, metodo_pago, lock_version)`
- `movimientos_stock (lock_version)`
- `movimientos_cuenta_corriente (lock_version)`


--- 

## 🎯 HU: Patrón Append-Only en Pagos de Cuentas Corrientes
*Criterios de Aceptación/Descripción:*
```text
Como analista contable quiero que los pagos se registren como inserciones inmutables en vez de actualizar filas existentes, garantizando la partida doble.
```

### 📄 [✔ COMPLETADA] Refactorizar Server Action de pagos
- **Rol:** Backend
- **Componente/Ruta:** `registrarPagoCuentaCorriente.ts` (src/services/fiados/registrarPagoCuentaCorriente.ts)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se refactorizó el Server Action registrarPagoCuentaCorriente eliminando la instrucción UPDATE sobre la tabla movimientos_cuenta_corriente, garantizando el patrón estricto Append-Only en los registros de ledger financiero. El flujo ahora realiza exclusivamente INSERT en movimientos_cuenta_corriente e INSERT en imputaciones_comprobantes, actualizando el saldo_deudor de la entidad clientes_finales. Se actualizaron las pruebas unitarias incorporando la verificación de no-mutación.

**Archivos Modificados:**
- `src/services/fiados/registrarPagoCuentaCorriente.ts`
- `src/services/fiados/registrarPagoCuentaCorriente.test.ts`

**Contratos y API signatures:**
- `registrarPagoCuentaCorriente(_estadoPrevio: EstadoRegistrarPagoCuentaCorriente, formData: FormData): Promise<EstadoRegistrarPagoCuentaCorriente>`


--- 

