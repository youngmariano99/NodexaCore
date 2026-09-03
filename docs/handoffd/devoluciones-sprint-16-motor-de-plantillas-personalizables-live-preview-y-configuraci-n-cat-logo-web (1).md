# Handoffs y Entregables del Sprint - Sprint 16: Motor de Plantillas Personalizables, Live Preview y Configuración Catálogo Web

**Objetivo:** Desarrollar el editor visual modular en tiempo real para las plantillas del catálogo web y purgar código muerto para optimizar el bundle de producción por cliente.
**Capacidad:** 20 Ptos | **Duración:** 2 Semanas
**Estado del Sprint:** PLANIFICADO

--- 

## 🎯 HU: Editor Visual Modular en Pantalla Dividida (Live Preview)
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero personalizar el diseño de mi vidriera (banners, textos y plantillas) mediante un editor interactivo y ver los cambios reflejados al instante en un simulador integrado.
```

### 📄 [✔ COMPLETADA] Soporte JSONB de Configuración de Plantilla
- **Rol:** BD
- **Componente/Ruta:** `Esquema configuracion_plantilla` (supabase/migrations/20260824020000_configuracion_plantilla_jsonb.sql)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementó la migración SQL 20260824020000_configuracion_plantilla_jsonb.sql agregando las columnas plantilla_activa y configuracion_plantilla (JSONB) a la entidad clientes. Se incorporó la función trigger fn_validar_configuracion_plantilla para validar la integridad del JSONB y la disponibilidad de plantilla activa respetando el catálogo ERRORS.md (NX-SYS-006) de forma flexible sin requerir migraciones físicas en futuras plantillas.

**Archivos Modificados:**
- `supabase/migrations/20260824020000_configuracion_plantilla_jsonb.sql`
- `docs/SCHEMA.md`

**Contratos y API signatures:**
- `clientes.plantilla_activa (TEXT NOT NULL DEFAULT 'basica')`
- `clientes.configuracion_plantilla (JSONB NOT NULL DEFAULT '{}'::jsonb)`
- `fn_validar_configuracion_plantilla() (TRIGGER FUNCTION)`
- `trg_validar_configuracion_plantilla (BEFORE INSERT OR UPDATE ON clientes)`


### 📄 [✔ COMPLETADA] Editor Split-Screen con sincronización por postMessage
- **Rol:** Frontend
- **Componente/Ruta:** `EditorPersonalizacionDiseno` (src/app/(app)/catalogo-web/personalizar/EditorPersonalizacionDiseno.tsx)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementó la interfaz interactiva en pantalla dividida EditorPersonalizacionDiseno.tsx. La columna izquierda contiene los formularios para seleccionar plantillas, personalizar el color primario, mensaje hero, cargar imágenes a Cloudinary (vía SubidorImagen) y alternar la exposición/ocultamiento de precios con un switch toggle. La columna derecha aloja el simulador iframe que recibe sincronización en tiempo real vía el canal postMessage con latencia cero sin recargar la página completa. Se verificaron las pruebas automatizadas, lint y build en verde y se envió la PR #90 en GitHub.

**Archivos Modificados:**
- `src/app/(app)/catalogo-web/personalizar/EditorPersonalizacionDiseno.tsx`
- `src/app/(app)/catalogo-web/personalizar/page.tsx`
- `src/app/(app)/catalogo-web/personalizar/EditorPersonalizacionDiseno.test.tsx`
- `src/components/catalogoWeb/SubidorImagen.tsx`

**Contratos y API signatures:**
- `EditorPersonalizacionDiseno({ clienteSlug, configuracionInicial }: EditorPersonalizacionDisenoProps): JSX.Element`
- `SubidorImagen({ label, imagenUrlActual, onImagenCargada, onImagenEliminada }: SubidorImagenProps): JSX.Element`


### 📄 [✔ COMPLETADA] Editor Split-Screen con sincronización por postMessage
- **Rol:** Frontend
- **Componente/Ruta:** `EditorPersonalizacionDiseno` (src/app/(app)/catalogo-web/personalizar/EditorPersonalizacionDiseno.tsx)

*No se registró devolución técnica para esta actividad.*


### 📄 [✔ COMPLETADA] Soporte JSONB de Configuración de Plantilla
- **Rol:** BD
- **Componente/Ruta:** `Esquema configuracion_plantilla` (supabase/migrations/20260824020000_configuracion_plantilla_jsonb.sql)

*No se registró devolución técnica para esta actividad.*


### 📄 [✔ COMPLETADA] Soporte JSONB de Configuración de Plantilla
- **Rol:** BD
- **Componente/Ruta:** `Esquema configuracion_plantilla` (supabase/migrations/20260824020000_configuracion_plantilla_jsonb.sql)

*No se registró devolución técnica para esta actividad.*


### 📄 [✔ COMPLETADA] Editor Split-Screen con sincronización por postMessage
- **Rol:** Frontend
- **Componente/Ruta:** `EditorPersonalizacionDiseno` (src/app/(app)/catalogo-web/personalizar/EditorPersonalizacionDiseno.tsx)

*No se registró devolución técnica para esta actividad.*


--- 

## 🎯 HU: Ruteo Dinámico y Code Splitting de Plantillas
*Criterios de Aceptación/Descripción:*
```text
Como visitante público quiero acceder a la vidriera del comercio mediante su subdominio propio de forma veloz para consultar sus productos descargando en mi navegador únicamente los componentes del diseño que el comercio configuró.
```

### 📄 [✔ COMPLETADA] Middleware de Resolución de Tenant por Host
- **Rol:** Backend
- **Componente/Ruta:** `Middleware de rutas dinámicas` (src/middleware.ts)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementó el middleware de Next.js en src/middleware.ts para interceptar el header host en peticiones públicas del Catálogo Web, consultar a Supabase la validez del slug o dominio personalizado (comprobando estado_pago=true y tenant_module activo para catalogo_web) y ejecutar NextResponse.rewrite hacia /c/[subdominio] manteniendo la URL en el navegador inalterada (cumpliendo el criterio de aceptación). Se subieron los cambios a la rama feature/mc-act-964nhrk-middleware-de-resoluci-n-de-tenant-por-host y se creó la PR #88 en GitHub.

**Archivos Modificados:**
- `src/middleware.ts`

**Contratos y API signatures:**
- `obtenerSubdominioDesdeHost(host: string): string | null`
- `middleware(request: NextRequest): Promise<NextResponse>`


### 📄 [✔ COMPLETADA] Middleware de Resolución de Tenant por Host
- **Rol:** Backend
- **Componente/Ruta:** `Middleware de rutas dinámicas` (src/middleware.ts)

*No se registró devolución técnica para esta actividad.*


### 📄 [✔ COMPLETADA] Code Splitting e Importaciones Dinámicas (next/dynamic)
- **Rol:** Frontend
- **Componente/Ruta:** `Ruteador y selector de plantillas públicas` (src/plantillas/SelectorPlantillas.tsx)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementó el ruteador y selector de plantillas públicas SelectorPlantillas.tsx utilizando la función dynamic de next/dynamic para las plantillas 'basica', 'la-martina' y 'filomena'. El selector descarga dinámicamente en tiempo de ejecución únicamente el bundle JavaScript correspondiente a la columna clientes.plantilla_activa del comercio, evitando la inclusión de código de plantillas inactivas en el bundle inicial del cliente final. Se crearon las pruebas unitarias correspondientes en Vitest, se verificó el build en verde y se publicó la PR #89 en GitHub.

**Archivos Modificados:**
- `src/plantillas/SelectorPlantillas.tsx`
- `src/plantillas/tipos.ts`
- `src/plantillas/basica/PlantillaBasica.tsx`
- `src/plantillas/la-martina/PlantillaLaMartina.tsx`
- `src/plantillas/filomena/PlantillaFilomena.tsx`
- `src/plantillas/SelectorPlantillas.test.tsx`

**Contratos y API signatures:**
- `SelectorPlantillas({ plantillaActiva, ...props }: SelectorPlantillasProps): JSX.Element`
- `PlantillaProps`
- `NombrePlantilla`


### 📄 [✔ COMPLETADA] Code Splitting e Importaciones Dinámicas (next/dynamic)
- **Rol:** Frontend
- **Componente/Ruta:** `Ruteador y selector de plantillas públicas` (src/plantillas/SelectorPlantillas.tsx)

*No se registró devolución técnica para esta actividad.*


--- 

