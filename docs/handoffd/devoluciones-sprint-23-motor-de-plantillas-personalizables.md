# Handoffs y Entregables del Sprint - Sprint 23: Motor de Plantillas Personalizables, Live Preview y ConfiguraciÃ³n CatÃ¡logo Web

**Objetivo:** Desarrollar el editor visual modular en tiempo real para las plantillas del catÃ¡logo web y purgar cÃ³digo muerto para optimizar el bundle de producciÃ³n por cliente.
**Capacidad:** 20 Ptos | **DuraciÃ³n:** 2 Semanas
**Estado del Sprint:** PLANIFICADO

--- 

## ðŸŽ¯ HU: Editor Visual Modular en Pantalla Dividida (Live Preview)
*Criterios de AceptaciÃ³n/DescripciÃ³n:*
```text
Como comerciante quiero personalizar el diseÃ±o de mi vidriera (banners, textos y plantillas) mediante un editor interactivo y ver los cambios reflejados al instante en un simulador integrado.
```

### ðŸ“„ [âœ” COMPLETADA] Soporte JSONB de ConfiguraciÃ³n de Plantilla
- **Rol:** BD
- **Componente/Ruta:** `Esquema configuracion_plantilla` (supabase/migrations/20260824020000_configuracion_plantilla_jsonb.sql)

#### ðŸ’¾ DevoluciÃ³n / Handoff de la IA:
**Resumen TÃ©cnico:**
Se implementÃ³ la migraciÃ³n SQL 20260824020000_configuracion_plantilla_jsonb.sql agregando las columnas plantilla_activa y configuracion_plantilla (JSONB) a la entidad clientes. Se incorporÃ³ la funciÃ³n trigger fn_validar_configuracion_plantilla para validar la integridad del JSONB y la disponibilidad de plantilla activa respetando el catÃ¡logo ERRORS.md (NX-SYS-006) de forma flexible sin requerir migraciones fÃ­sicas en futuras plantillas.

**Archivos Modificados:**
- `supabase/migrations/20260824020000_configuracion_plantilla_jsonb.sql`
- `docs/SCHEMA.md`

**Contratos y API signatures:**
- `clientes.plantilla_activa (TEXT NOT NULL DEFAULT 'basica')`
- `clientes.configuracion_plantilla (JSONB NOT NULL DEFAULT '{}'::jsonb)`
- `fn_validar_configuracion_plantilla() (TRIGGER FUNCTION)`
- `trg_validar_configuracion_plantilla (BEFORE INSERT OR UPDATE ON clientes)`


### ðŸ“„ [âœ” COMPLETADA] Editor Split-Screen con sincronizaciÃ³n por postMessage
- **Rol:** Frontend
- **Componente/Ruta:** `EditorPersonalizacionDiseno` (src/app/(app)/catalogo-web/personalizar/EditorPersonalizacionDiseno.tsx)

#### ðŸ’¾ DevoluciÃ³n / Handoff de la IA:
**Resumen TÃ©cnico:**
Se implementÃ³ la interfaz interactiva en pantalla dividida EditorPersonalizacionDiseno.tsx. La columna izquierda contiene los formularios para seleccionar plantillas, personalizar el color primario, mensaje hero, cargar imÃ¡genes a Cloudinary (vÃ­a SubidorImagen) y alternar la exposiciÃ³n/ocultamiento de precios con un switch toggle. La columna derecha aloja el simulador iframe que recibe sincronizaciÃ³n en tiempo real vÃ­a el canal postMessage con latencia cero sin recargar la pÃ¡gina completa. Se verificaron las pruebas automatizadas, lint y build en verde y se enviÃ³ la PR #90 en GitHub.

**Archivos Modificados:**
- `src/app/(app)/catalogo-web/personalizar/EditorPersonalizacionDiseno.tsx`
- `src/app/(app)/catalogo-web/personalizar/page.tsx`
- `src/app/(app)/catalogo-web/personalizar/EditorPersonalizacionDiseno.test.tsx`
- `src/components/catalogoWeb/SubidorImagen.tsx`

**Contratos y API signatures:**
- `EditorPersonalizacionDiseno({ clienteSlug, configuracionInicial }: EditorPersonalizacionDisenoProps): JSX.Element`
- `SubidorImagen({ label, imagenUrlActual, onImagenCargada, onImagenEliminada }: SubidorImagenProps): JSX.Element`


### ðŸ“„ [âœ” COMPLETADA] Editor Split-Screen con sincronizaciÃ³n por postMessage
- **Rol:** Frontend
- **Componente/Ruta:** `EditorPersonalizacionDiseno` (src/app/(app)/catalogo-web/personalizar/EditorPersonalizacionDiseno.tsx)

*No se registrÃ³ devoluciÃ³n tÃ©cnica para esta actividad.*


### ðŸ“„ [âœ” COMPLETADA] Soporte JSONB de ConfiguraciÃ³n de Plantilla
- **Rol:** BD
- **Componente/Ruta:** `Esquema configuracion_plantilla` (supabase/migrations/20260824020000_configuracion_plantilla_jsonb.sql)

*No se registrÃ³ devoluciÃ³n tÃ©cnica para esta actividad.*


### ðŸ“„ [âœ” COMPLETADA] Soporte JSONB de ConfiguraciÃ³n de Plantilla
- **Rol:** BD
- **Componente/Ruta:** `Esquema configuracion_plantilla` (supabase/migrations/20260824020000_configuracion_plantilla_jsonb.sql)

*No se registrÃ³ devoluciÃ³n tÃ©cnica para esta actividad.*


### ðŸ“„ [âœ” COMPLETADA] Editor Split-Screen con sincronizaciÃ³n por postMessage
- **Rol:** Frontend
- **Componente/Ruta:** `EditorPersonalizacionDiseno` (src/app/(app)/catalogo-web/personalizar/EditorPersonalizacionDiseno.tsx)

*No se registrÃ³ devoluciÃ³n tÃ©cnica para esta actividad.*


--- 

## ðŸŽ¯ HU: Ruteo DinÃ¡mico y Code Splitting de Plantillas
*Criterios de AceptaciÃ³n/DescripciÃ³n:*
```text
Como visitante pÃºblico quiero acceder a la vidriera del comercio mediante su subdominio propio de forma veloz para consultar sus productos descargando en mi navegador Ãºnicamente los componentes del diseÃ±o que el comercio configurÃ³.
```

### ðŸ“„ [âœ” COMPLETADA] Middleware de ResoluciÃ³n de Tenant por Host
- **Rol:** Backend
- **Componente/Ruta:** `Middleware de rutas dinÃ¡micas` (src/middleware.ts)

#### ðŸ’¾ DevoluciÃ³n / Handoff de la IA:
**Resumen TÃ©cnico:**
Se implementÃ³ el middleware de Next.js en src/middleware.ts para interceptar el header host en peticiones pÃºblicas del CatÃ¡logo Web, consultar a Supabase la validez del slug o dominio personalizado (comprobando estado_pago=true y tenant_module activo para catalogo_web) y ejecutar NextResponse.rewrite hacia /c/[subdominio] manteniendo la URL en el navegador inalterada (cumpliendo el criterio de aceptaciÃ³n). Se subieron los cambios a la rama feature/mc-act-964nhrk-middleware-de-resoluci-n-de-tenant-por-host y se creÃ³ la PR #88 en GitHub.

**Archivos Modificados:**
- `src/middleware.ts`

**Contratos y API signatures:**
- `obtenerSubdominioDesdeHost(host: string): string | null`
- `middleware(request: NextRequest): Promise<NextResponse>`


### ðŸ“„ [âœ” COMPLETADA] Middleware de ResoluciÃ³n de Tenant por Host
- **Rol:** Backend
- **Componente/Ruta:** `Middleware de rutas dinÃ¡micas` (src/middleware.ts)

*No se registrÃ³ devoluciÃ³n tÃ©cnica para esta actividad.*


### ðŸ“„ [âœ” COMPLETADA] Code Splitting e Importaciones DinÃ¡micas (next/dynamic)
- **Rol:** Frontend
- **Componente/Ruta:** `Ruteador y selector de plantillas pÃºblicas` (src/plantillas/SelectorPlantillas.tsx)

#### ðŸ’¾ DevoluciÃ³n / Handoff de la IA:
**Resumen TÃ©cnico:**
Se implementÃ³ el ruteador y selector de plantillas pÃºblicas SelectorPlantillas.tsx utilizando la funciÃ³n dynamic de next/dynamic para las plantillas 'basica', 'la-martina' y 'filomena'. El selector descarga dinÃ¡micamente en tiempo de ejecuciÃ³n Ãºnicamente el bundle JavaScript correspondiente a la columna clientes.plantilla_activa del comercio, evitando la inclusiÃ³n de cÃ³digo de plantillas inactivas en el bundle inicial del cliente final. Se crearon las pruebas unitarias correspondientes en Vitest, se verificÃ³ el build en verde y se publicÃ³ la PR #89 en GitHub.

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


### ðŸ“„ [âœ” COMPLETADA] Code Splitting e Importaciones DinÃ¡micas (next/dynamic)
- **Rol:** Frontend
- **Componente/Ruta:** `Ruteador y selector de plantillas pÃºblicas` (src/plantillas/SelectorPlantillas.tsx)

*No se registrÃ³ devoluciÃ³n tÃ©cnica para esta actividad.*


--- 


