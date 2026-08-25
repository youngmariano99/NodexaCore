# Handoffs y Entregables del Sprint - Sprint 15: Módulo de Proveedores, Reposición Automatizada y Edición Masiva de Precios

**Objetivo:** Introducir la entidad proveedores (integrante del Core) para asociar stock mínimo de reposición, validar el límite máximo de 20 proveedores, implementar edición masiva de precios en lote por atributos de Core y automatizar la alerta del Punto de Pedido.
**Capacidad:** 20 Ptos | **Duración:** 2 Semanas
**Estado del Sprint:** ACTIVO

--- 

## 🎯 HU: Módulo de Proveedores y Asociación a Catálogo
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero registrar mis proveedores con su tiempo promedio de entrega para asociarlos a mis productos e identificar cuándo reponer mercadería.
```

### 📄 [✔ COMPLETADA] Vista y CRUD de Proveedores
- **Rol:** Frontend
- **Componente/Ruta:** `FormularioProveedores` (src/app/(app)/proveedores/FormularioProveedores.tsx)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se creó la ruta y vista /proveedores integrando listado de demora estimada y formulario modal de alta con validación Zod y paleta oscura de Nodexa. PR #85 creada.

**Archivos Modificados:**
- `src/app/(app)/proveedores/FormularioProveedores.tsx`
- `src/app/(app)/proveedores/page.tsx`

**Contratos y API signatures:**
- `export default async function ProveedoresPage()`
- `export function FormularioProveedores({ proveedores }: FormularioProveedoresProps)`


### 📄 [✔ COMPLETADA] Vista y CRUD de Proveedores
- **Rol:** Frontend
- **Componente/Ruta:** `FormularioProveedores` (src/app/(app)/proveedores/FormularioProveedores.tsx)

*No se registró devolución técnica para esta actividad.*


### 📄 [✔ COMPLETADA] Esquema de Base de Datos para Proveedores
- **Rol:** BD
- **Componente/Ruta:** `Tabla proveedores y referencias de producto` (supabase/migrations/20260824010000_crear_proveedores.sql)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementó la migración SQL para la tabla proveedores y la alteración de productos. Se habilitó RLS y un trigger de base de datos para desvincular productos en cascada ante el soft-delete del proveedor. PR #83 creada.

**Archivos Modificados:**
- `supabase/migrations/20260824010000_crear_proveedores.sql`
- `docs/SCHEMA.md`


### 📄 [✔ COMPLETADA] Repositorio y Servicio de Creación con Límite de Proveedores
- **Rol:** Backend
- **Componente/Ruta:** `ProveedoresRepository / CrearProveedor` (src/repositories/proveedoresRepository.ts / src/services/stock/crearProveedor.ts)

*No se registró devolución técnica para esta actividad.*


### 📄 [✔ COMPLETADA] Vista y CRUD de Proveedores
- **Rol:** Frontend
- **Componente/Ruta:** `FormularioProveedores` (src/app/(app)/proveedores/FormularioProveedores.tsx)

*No se registró devolución técnica para esta actividad.*


### 📄 [✔ COMPLETADA] Esquema de Base de Datos para Proveedores
- **Rol:** BD
- **Componente/Ruta:** `Tabla proveedores y referencias de producto` (supabase/migrations/20260824010000_crear_proveedores.sql)

*No se registró devolución técnica para esta actividad.*


### 📄 [✔ COMPLETADA] Repositorio y Servicio de Creación con Límite de Proveedores
- **Rol:** Backend
- **Componente/Ruta:** `ProveedoresRepository / CrearProveedor` (src/repositories/proveedoresRepository.ts / src/services/stock/crearProveedor.ts)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se corrigió el error de tipado al invocar registrarDiff que impedía compilar en producción (tsconfig type check). La rama y PR #84 quedaron actualizadas y limpias.

**Archivos Modificados:**
- `src/services/stock/crearProveedor.ts`


### 📄 [✔ COMPLETADA] Esquema de Base de Datos para Proveedores
- **Rol:** BD
- **Componente/Ruta:** `Tabla proveedores y referencias de producto` (supabase/migrations/20260824010000_crear_proveedores.sql)

*No se registró devolución técnica para esta actividad.*


--- 

## 🎯 HU: Cálculo Dinámico de Punto de Pedido y Alertas
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero que el sistema calcule el punto de pedido automático basado en el consumo diario de ventas para recibir alertas de reposición sin ingresar datos manuales complejos.
```

### 📄 [✔ COMPLETADA] Cálculo del Consumo Diario de Ventas
- **Rol:** Backend
- **Componente/Ruta:** `calcularConsumoDiario` (src/services/stock/calcularConsumoDiario.ts)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementó el servicio de consumo diario promedio de los últimos 30 días omitiendo días sin ventas, y calculando alertas de punto de pedido/urgencia según la demora del proveedor y el stock de seguridad. PR #86 creada.

**Archivos Modificados:**
- `src/services/stock/calcularConsumoDiario.ts`
- `src/services/stock/calcularConsumoDiario.test.ts`

**Contratos y API signatures:**
- `export async function calcularConsumoDiario(productoId: string): Promise<ResultadoConsumoDiario | null>`


### 📄 [✔ COMPLETADA] Cálculo del Consumo Diario de Ventas
- **Rol:** Backend
- **Componente/Ruta:** `calcularConsumoDiario` (src/services/stock/calcularConsumoDiario.ts)

*No se registró devolución técnica para esta actividad.*


### 📄 [✔ COMPLETADA] Cálculo del Consumo Diario de Ventas
- **Rol:** Backend
- **Componente/Ruta:** `calcularConsumoDiario` (src/services/stock/calcularConsumoDiario.ts)

*No se registró devolución técnica para esta actividad.*


--- 

## 🎯 HU: Editor Masivo de Precios en Lote
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero cambiar los precios de mis productos en lote filtrando por categoría, marca o proveedor para ajustar valores rápidamente ante inflación o cambios del mercado.
```

### 📄 [✔ COMPLETADA] Acción del Servidor para Actualización Masiva
- **Rol:** Backend
- **Componente/Ruta:** `actualizarPreciosLote` (src/services/productos/actualizarPreciosLote.ts)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementó el Server Action actualizarPreciosLote conectado a una función SQL (fn_actualizar_precios_lote) para asegurar atomicidad y registro de logs de auditoría por producto modificado. PR #82 creada.

**Archivos Modificados:**
- `supabase/migrations/20260826000000_add_product_attributes_columns.sql`
- `docs/SCHEMA.md`
- `src/services/productos/tipos.ts`
- `src/services/productos/actualizarPreciosLote.ts`
- `src/services/productos/actualizarPreciosLote.test.ts`

**Contratos y API signatures:**
- `export async function actualizarPreciosLote(estadoPrevio: EstadoActualizarPreciosLote, formData: FormData): Promise<EstadoActualizarPreciosLote>`


### 📄 [✔ COMPLETADA] UI del Editor de Precios Lote
- **Rol:** Frontend
- **Componente/Ruta:** `EditorPreciosMasivos` (src/app/(app)/productos/precios-lote/EditorPreciosMasivos.tsx)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se creó la UI interactiva del CRUD masivo de precios de productos en /productos/precios-lote, integrando la acción de servidor con doble check de confirmación, banner de seguridad y spinner de envío con botón esmeralda. PR #87 creada.

**Archivos Modificados:**
- `src/app/(app)/productos/precios-lote/EditorPreciosMasivos.tsx`
- `src/app/(app)/productos/precios-lote/page.tsx`

**Contratos y API signatures:**
- `export function EditorPreciosMasivos(props: EditorPreciosMasivosProps)`
- `export default async function PreciosLotePage()`


### 📄 [✔ COMPLETADA] UI del Editor de Precios Lote
- **Rol:** Frontend
- **Componente/Ruta:** `EditorPreciosMasivos` (src/app/(app)/productos/precios-lote/EditorPreciosMasivos.tsx)

*No se registró devolución técnica para esta actividad.*


### 📄 [✔ COMPLETADA] Acción del Servidor para Actualización Masiva
- **Rol:** Backend
- **Componente/Ruta:** `actualizarPreciosLote` (src/services/productos/actualizarPreciosLote.ts)

*No se registró devolución técnica para esta actividad.*


### 📄 [✔ COMPLETADA] UI del Editor de Precios Lote
- **Rol:** Frontend
- **Componente/Ruta:** `EditorPreciosMasivos` (src/app/(app)/productos/precios-lote/EditorPreciosMasivos.tsx)

*No se registró devolución técnica para esta actividad.*


### 📄 [✔ COMPLETADA] Acción del Servidor para Actualización Masiva
- **Rol:** Backend
- **Componente/Ruta:** `actualizarPreciosLote` (src/services/productos/actualizarPreciosLote.ts)

*No se registró devolución técnica para esta actividad.*


--- 

