# Handoffs y Entregables del Sprint - Sprint 10: Cimientos Visuales, Navegación y CRUD de Catálogo

**Objetivo:** Construir la infraestructura visual común (Sidebar y Topbar con control de accesos por tenant_modules) y habilitar la gestión manual/masiva de productos en frontend con subida de imágenes.
**Capacidad:** 30 Ptos | **Duración:** 2 Semanas
**Estado del Sprint:** COMPLETADO

--- 

## 🎯 HU: UI de Navegación y Sidebar con Control de Módulos (Transversal/Layout)
*Criterios de Aceptación/Descripción:*
```text
Como comerciante o empleado del comercio quiero contar con un Sidebar y Topbar que respete el área táctil mínima de 44x44px y la paleta Verde Nodexa, y que bloquee dinámicamente los accesos a los módulos no contratados para navegar de forma limpia, consistente y segura.
```

### 📄 [✔ COMPLETADA] Implementación del Sidebar de Navegación y Topbar en el Layout General
- **Rol:** Frontend
- **Componente/Ruta:** `AppLayout` (src/app/(app)/layout.tsx)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Implementación de layout global responsivo con Sidebar y Topbar adaptado al diseño de identidad Verde Nodexa (#16D39A) y fondos oscuros. Se implementó una barrera (Gate) a nivel cliente que lee tenant_modules y roles bloqueando accesos no autorizados con sus códigos correspondientes de ERRORS.md. Todo validado exitosamente contra compilación TypeScript, ESLint (0 advertencias) y suite de Vitest de 464 pruebas.

**Archivos Modificados:**
- `src/app/(app)/layout.tsx`
- `src/components/layout/AppLayoutClient.tsx`
- `src/services/autenticacion/cerrarSesion.ts`

**Contratos y API signatures:**
- `export default async function AppLayout({ children }: { children: React.ReactNode })`
- `export function AppLayoutClient(props: AppLayoutClientProps)`
- `export async function cerrarSesion()`


--- 

## 🎯 HU: UI de Edición y Baja de Producto
*Criterios de Aceptación/Descripción:*
```text
Como comerciante o empleado del comercio quiero editar los datos de un producto existente e iniciar su baja lógica desde la interfaz de listado de productos para mantener la información del catálogo actualizada.
```

### 📄 [✔ COMPLETADA] Desarrollo de la Página de Edición de Producto
- **Rol:** Frontend
- **Componente/Ruta:** `FormularioEdicionProducto` (src/app/(app)/productos/[productoId]/page.tsx)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Creación de la ruta dinámica /productos/[productoId]. Implementación de verificación robusta de sesión, roles y pertenencia a Tenant (BOLA/IDOR) en el Server Component. Implementación del Formulario en un Client Component con inputs estilizados al Verde Nodexa y resguardo de SKU como solo lectura. Enlace con la Server Action 'actualizarProducto', control de errores normalizado y revalidación de caché de TanStack Query.

**Archivos Modificados:**
- `src/app/(app)/productos/[productoId]/page.tsx`
- `src/app/(app)/productos/[productoId]/formulario-edicion-producto.tsx`

**Contratos y API signatures:**
- `export default async function EditarProductoPage({ params }: EditarProductoPageProps)`
- `export function FormularioEdicionProducto({ producto }: FormularioEdicionProductoProps)`


### 📄 [✔ COMPLETADA] Integración de Baja Lógica desde la UI
- **Rol:** Frontend
- **Componente/Ruta:** `ListadoProductos` (src/app/(app)/productos/listado-productos.tsx)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Integración del botón 'Dar de baja' en la columna de acciones del listado de productos. Implementación del diálogo de confirmación de borrado lógico con advertencia empática en rojo. Conexión del botón con la Server Action 'eliminarProducto' y revalidación de caché de TanStack Query ('productos') tras el borrado lógico exitoso. ESLint, Vitest y compilación de producción validados y PR #60 subido.

**Archivos Modificados:**
- `src/app/(app)/productos/listado-productos.tsx`

**Contratos y API signatures:**
- `export function ListadoProductos()`


--- 

## 🎯 HU: Integración de Compresión y Subida de Imágenes a Cloudinary
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero que el formulario de alta y edición de producto permita subir una imagen para que se comprima automáticamente en background a WebP (~70 KB) y se almacene en la ficha del producto.
```

### 📄 [✔ COMPLETADA] Integración de Imágenes en las Acciones de Productos
- **Rol:** Backend
- **Componente/Ruta:** `crearProducto / actualizarProducto` (src/services/productos/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se integró el pipeline de compresión WebP en las Server Actions de creación y actualización de productos. La imagen subida desde el FormData se comprime mediante comprimirImagenProducto y su URL se almacena en la columna imagen_url. Los fallos de red/servicios de Cloudinary son atajados con el código de excepción NX-PRD-005. Se mockeó comprimirImagen en los unit tests para aislar la validación de entorno.

**Archivos Modificados:**
- `src/services/productos/crearProducto.ts`
- `src/services/productos/actualizarProducto.ts`
- `src/repositories/productosRepository.ts`
- `src/services/productos/crearProducto.test.ts`
- `src/services/productos/actualizarProducto.test.ts`

**Contratos y API signatures:**
- `export async function crearProducto(_estadoPrevio: EstadoCrearProducto, formData: FormData): Promise<EstadoCrearProducto>`
- `export async function actualizarProducto(productoId: string, _estadoPrevio: EstadoActualizarProducto, formData: FormData): Promise<EstadoActualizarProducto>`
- `export async function insertarProducto(supabase: SupabaseClient, datos: DatosNuevoProducto): Promise<ResultadoRepositorio<FilaProducto>>`


--- 

## 🎯 HU: UI de Carga Masiva por Excel
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero subir mi inventario masivamente mediante una plantilla de Excel estructurada para no tener que cargar los productos individualmente.
```

### 📄 [✔ COMPLETADA] Pantalla de Importación de Plantilla Excel
- **Rol:** Frontend
- **Componente/Ruta:** `CargaMasivaExcel` (src/app/(app)/productos/carga-masiva/page.tsx)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Creación de la ruta /productos/carga-masiva y su componente cliente. Implementación del área drag & drop para la carga del archivo Excel y conexión con el Route Handler POST /api/productos/importar. Gestión y visualización de resultados en lotes con desglose de registros procesados y errores mapeados por fila. Creación del Route Handler GET /api/productos/importar/plantilla para posibilitar la descarga de la estructura Excel esperada.

**Archivos Modificados:**
- `src/app/(app)/productos/carga-masiva/page.tsx`
- `src/app/(app)/productos/carga-masiva/carga-masiva-excel.tsx`
- `src/app/api/productos/importar/plantilla/route.ts`

**Contratos y API signatures:**
- `export default function CargaMasivaPage()`
- `export function CargaMasivaExcel()`
- `export async function GET()`


--- 

