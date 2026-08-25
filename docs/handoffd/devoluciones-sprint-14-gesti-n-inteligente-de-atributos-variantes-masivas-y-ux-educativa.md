# Handoffs y Entregables del Sprint - Sprint 14: Gestión Inteligente de Atributos, Variantes Masivas y UX Educativa

**Objetivo:** Implementar el alta de marcas y categorías inline dentro del formulario de productos, rediseñar el alta a un formato Wizard multi-paso para la generación masiva de variantes, definir límites de marcas en Core, condicionar la visualización del cargador de imágenes y agregar guías de ayuda contextuales no invasivas.
**Capacidad:** 20 Ptos | **Duración:** 2 Semanas
**Estado del Sprint:** PLANIFICADO

--- 

## 🎯 HU: Alta de Producto Wizard con Matriz de Variantes Masiva
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero registrar productos configurando variables/dimensiones (talle, color) y generando de manera masiva la matriz de stock para optimizar la carga inicial.
```

### 📄 [✔ COMPLETADA] Generación Dinámica de Matriz de Combinaciones
- **Rol:** Backend
- **Componente/Ruta:** `generarMatrizCombinaciones` (src/lib/dominio/productos/generarMatrizCombinaciones.ts)

*No se registró devolución técnica para esta actividad.*


### 📄 [✔ COMPLETADA] Generación Dinámica de Matriz de Combinaciones
- **Rol:** Backend
- **Componente/Ruta:** `generarMatrizCombinaciones` (src/lib/dominio/productos/generarMatrizCombinaciones.ts)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se creó la columna producto_padre_id en la migración SQL y se documentó en SCHEMA.md. Se actualizó el repositorio de productos y el server action crearProducto para soportar e insertar las variantes hijas asociadas al ID del padre. PR #80 creada.

**Archivos Modificados:**
- `supabase/migrations/20260825000000_add_producto_padre_id.sql`
- `docs/SCHEMA.md`
- `src/repositories/productosRepository.ts`
- `src/services/productos/crearProducto.ts`

**Contratos y API signatures:**
- `export interface DatosNuevoProducto { ... productoPadreId?: string | null; }`
- `export async function crearProducto(_estadoPrevio: EstadoCrearProducto, formData: FormData): Promise<EstadoCrearProducto>`


### 📄 [✔ COMPLETADA] Wizard Multi-paso para Creación de Productos
- **Rol:** Frontend
- **Componente/Ruta:** `FormularioAltaProductoWizard` (src/app/(app)/productos/nuevo/FormularioAltaProductoWizard.tsx)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se refactorizó el wizard de alta de productos en componentes más pequeños para cumplir con el límite de líneas y solucionar los warnings de TypeScript. Los cambios se subieron a GitHub y se abrió el PR #79.

**Archivos Modificados:**
- `src/app/(app)/productos/nuevo/page.tsx`
- `src/app/(app)/productos/nuevo/FormularioAltaProductoWizard.tsx`
- `src/app/(app)/productos/nuevo/Paso1DatosGenerales.tsx`
- `src/app/(app)/productos/nuevo/Paso2Dimensiones.tsx`
- `src/app/(app)/productos/nuevo/Paso3MatrizStock.tsx`

**Contratos y API signatures:**
- `export default async function NuevoProductoPage()`
- `export function FormularioAltaProductoWizard({ catalogoWebActivo }: FormularioAltaProductoWizardProps)`
- `export function Paso1DatosGenerales(props: Paso1DatosGeneralesProps)`
- `export function Paso2Dimensiones(props: Paso2DimensionesProps)`
- `export function Paso3MatrizStock(props: Paso3MatrizStockProps)`


### 📄 [✔ COMPLETADA] Wizard Multi-paso para Creación de Productos
- **Rol:** Frontend
- **Componente/Ruta:** `FormularioAltaProductoWizard` (src/app/(app)/productos/nuevo/FormularioAltaProductoWizard.tsx)

*No se registró devolución técnica para esta actividad.*


### 📄 [✔ COMPLETADA] Wizard Multi-paso para Creación de Productos
- **Rol:** Frontend
- **Componente/Ruta:** `FormularioAltaProductoWizard` (src/app/(app)/productos/nuevo/FormularioAltaProductoWizard.tsx)

*No se registró devolución técnica para esta actividad.*


### 📄 [✔ COMPLETADA] Generación Dinámica de Matriz de Combinaciones
- **Rol:** Backend
- **Componente/Ruta:** `generarMatrizCombinaciones` (src/lib/dominio/productos/generarMatrizCombinaciones.ts)

*No se registró devolución técnica para esta actividad.*


--- 

## 🎯 HU: Creación Inline de Atributos y Límite de Marcas
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero crear marcas y categorías directamente desde el formulario de producto sin perder el progreso de los datos completados, y que se valide el límite base de marcas (máximo 50) para controlar el consumo de mi plan.
```

### 📄 [✔ COMPLETADA] Repositorios y Validación de Límite de Marcas
- **Rol:** Backend
- **Componente/Ruta:** `MarcasRepository / CrearMarca` (src/repositories/marcasRepository.ts / src/services/productos/crearMarca.ts)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementaron las clases y lógica de marcas, se crearon los tests unitarios (que pasaron exitosamente), se creó la migración local y se versionaron los cambios con add, commit, push y apertura de PR #78.

**Archivos Modificados:**
- `supabase/migrations/20260824000000_crear_marcas_y_categorias.sql`
- `src/repositories/marcasRepository.ts`
- `src/services/productos/tipos.ts`
- `src/services/productos/crearMarca.ts`
- `src/services/productos/crearMarca.test.ts`
- `docs/ERRORS.md`
- `docs/SCHEMA.md`

**Contratos y API signatures:**
- `export async function contarMarcasActivas(supabase: SupabaseClient, clienteId: string): Promise<ResultadoRepositorio<number>>`
- `export async function insertarMarca(supabase: SupabaseClient, datos: DatosNuevaMarca): Promise<ResultadoRepositorio<FilaMarca>>`
- `export async function crearMarca(_estadoPrevio: EstadoCrearMarca, formData: FormData): Promise<EstadoCrearMarca>`


### 📄 [✔ COMPLETADA] Formulario Modal Inline para Categorías y Marcas
- **Rol:** Frontend
- **Componente/Ruta:** `ModalCreadorAtributo` (src/components/productos/ModalCreadorAtributo.tsx)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementó ModalCreadorAtributo utilizando React Hook Form y Zod. Se agregaron el repositorio de categorías y el server action crearCategoria correspondientes, mapeando correctamente NX-BRD-001. PR #81 creada.

**Archivos Modificados:**
- `src/components/productos/ModalCreadorAtributo.tsx`
- `src/repositories/categoriasRepository.ts`
- `src/services/productos/crearCategoria.ts`
- `src/services/productos/tipos.ts`
- `src/lib/errores/catalogo.ts`

**Contratos y API signatures:**
- `export function ModalCreadorAtributo(props: ModalCreadorAtributoProps): JSX.Element`
- `export async function crearCategoria(estadoPrevio: EstadoCrearCategoria, formData: FormData): Promise<EstadoCrearCategoria>`


### 📄 [✔ COMPLETADA] Formulario Modal Inline para Categorías y Marcas
- **Rol:** Frontend
- **Componente/Ruta:** `ModalCreadorAtributo` (src/components/productos/ModalCreadorAtributo.tsx)

*No se registró devolución técnica para esta actividad.*


### 📄 [✔ COMPLETADA] Diseño de base de datos para Marcas y Categorías
- **Rol:** BD
- **Componente/Ruta:** `Tablas de marcas y categorías` (supabase/migrations/20260824000000_crear_marcas_y_categorias.sql)

*No se registró devolución técnica para esta actividad.*


### 📄 [✔ COMPLETADA] Repositorios y Validación de Límite de Marcas
- **Rol:** Backend
- **Componente/Ruta:** `MarcasRepository / CrearMarca` (src/repositories/marcasRepository.ts / src/services/productos/crearMarca.ts)

*No se registró devolución técnica para esta actividad.*


### 📄 [✔ COMPLETADA] Diseño de base de datos para Marcas y Categorías
- **Rol:** BD
- **Componente/Ruta:** `Tablas de marcas y categorías` (supabase/migrations/20260824000000_crear_marcas_y_categorias.sql)

*No se registró devolución técnica para esta actividad.*


--- 

