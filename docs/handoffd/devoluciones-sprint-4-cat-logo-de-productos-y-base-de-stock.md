# Handoffs y Entregables del Sprint - Sprint 4: Catálogo de Productos y Base de Stock

**Objetivo:** Construir el CRUD completo de productos con sus guardrails de límite de SKU e iniciar el control de stock del Core.
**Capacidad:** 30 Ptos | **Duración:** 2 Semanas
**Estado del Sprint:** ACTIVO

--- 

## 🎯 HU: Alta manual de producto
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero cargar manualmente un producto con nombre, precio, categoría e imagen para incorporarlo a mi catálogo interno.
```

### 📄 [✔ COMPLETADA] Server Action crearProducto con validación Zod
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `crearProducto` (src/services/productos/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
crearProducto sigue el mismo patrón FormData + useActionState que crearCliente.ts/crearUsuario.ts (es un alta pensada para un formulario real, /productos/nuevo según docs/SITEMAP.md), a diferencia de los servicios admin recientes que reciben argumentos tipados directos. La decisión más específica de esta estación es la validación Zod diferenciada: el checklist pedía explícitamente que un precio inválido mapee a NX-PRD-003 (no al genérico NX-SYS-006 que usan todos los demás campos), así que se inspeccionan los issues de Zod después del safeParse buscando path[0] === 'precio' para decidir el código — es la primera vez en el repo que una validación Zod se bifurca a más de un código de error, documentado inline para que quede claro que no es un patrón accidental. El bloqueo de límite (NX-PRD-001) se resuelve con dos consultas separadas (limite_sku del cliente + COUNT de productos activos) hechas con el cliente de sesión, ya cubiertas por RLS existente (clientes_select y productos_select_tenant), sin necesitar service_role. La política RLS productos_insert_tenant (verificada contra la migración real) no distingue rol para INSERT —a diferencia de UPDATE, que sí separa comerciante/empleado—, así que el chequeo de rol en el Server Action (comerciante O empleado, con cliente_id no nulo) es la única barrera real de 'quién puede dar de alta', consistente con docs/ROLES.md §2. contarProductosActivos e insertarProducto quedaron en un repositorio nuevo (productosRepository.ts, con el sufijo 'Repository' que pide el ticket, distinto de la convención sin sufijo de ventas.ts/devoluciones.ts/clientes.ts ya existente — se respetó el nombre literal del checklist). La migración de seed (1.960 productos, idéntica a docs/SEED.md §4) quedó escrita pero sin aplicar: a diferencia de estaciones anteriores donde un seed pendiente bloqueaba la verificación en navegador, acá no hay ninguna verificación de UI que dependa de datos reales (es una Server Action pura, sin página nueva), así que no había ninguna razón para aplicarla de inmediato ni para preguntar — queda simplemente pendiente de tu confirmación cuando quieras poblarla. tsc --noEmit, eslint --max-warnings 0, vitest (84/84 incluyendo los 12 nuevos) y next build pasan sin errores.

**Archivos Modificados:**
- `src/repositories/productosRepository.ts`
- `src/repositories/productosRepository.test.ts`
- `src/services/productos/crearProducto.ts`
- `src/services/productos/crearProducto.test.ts`
- `src/services/productos/tipos.ts`
- `src/lib/errores/catalogo.ts`
- `supabase/migrations/20260809180000_seed_productos_volumetrico.sql`

**Contratos y API signatures:**
- `crearProducto(estadoPrevio: EstadoCrearProducto, formData: FormData): Promise<EstadoCrearProducto> — src/services/productos/crearProducto.ts`
- `EstadoCrearProducto { error: string | null; exito: boolean }, ESTADO_CREAR_PRODUCTO_INICIAL — src/services/productos/tipos.ts`
- `contarProductosActivos(supabase, clienteId): Promise<ResultadoRepositorio<number>> — src/repositories/productosRepository.ts`
- `insertarProducto(supabase, datos: DatosNuevoProducto): Promise<ResultadoRepositorio<FilaProducto>> — src/repositories/productosRepository.ts`
- `CATALOGO_ERRORES['NX-PRD-001'], ['NX-PRD-002'], ['NX-PRD-003']`
- `Migración seed_productos_volumetrico: 1.960 filas (50/910/1.000) — NO aplicada aún contra el proyecto real, no bloqueante`


--- 

## 🎯 HU: Edición de producto existente
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero editar los datos de un producto ya cargado para mantener actualizada la información de precio y stock de referencia.
```

### 📄 [✔ COMPLETADA] Server Action actualizarProducto con verificación de tenant
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `actualizarProducto` (src/services/productos/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
actualizarProducto reutiliza verificarPertenenciaTenant en vez de reimplementar el guard IDOR/BOLA: se extendió su tipo TablaConGuardTenant y el mapa COLUMNA_ID_POR_TABLA para incluir 'productos' → 'producto_id', manteniendo un único punto de verdad para ese patrón en todo el repo (ya usado por ventas/devoluciones/clientesFinales). Al ejercitar el guard en el test de NX-SYS-007 se confirmó un detalle importante del comportamiento ya existente: verificarPertenenciaTenant dispara su propio registrarDiff con campoModificado='intento_acceso_cruzado' ante un acceso cruzado — el test inicial asumía 'registrarDiff nunca se llama' y falló contra el código real, se corrigió la aserción para reflejar el comportamiento correcto en vez de forzar el mock. El campo actualizado_en se fija explícito en el UPDATE porque DEFAULT now() en Postgres solo aplica al INSERT — se documentó inline para que no se lea como un descuido. El diff por campo requiere conocer el valor anterior real (no null): se agregó una lectura previa mínima (SELECT nombre, descripcion, categoria, precio) antes del UPDATE, mismo patrón ya usado en actualizarClienteFinal de la estación de auditoría asíncrona. El DTO Zod es explícitamente parcial (todas las claves opcionales) con un .refine() que exige al menos un campo presente, ya que 'edición' no tiene sentido con un payload vacío; se excluyeron deliberadamente sku (inmutable), publicado (docs/ROLES.md lista 'publicar/despublicar' como fila separada de la matriz de permisos, corresponde al módulo Catálogo Web) y stock_actual (se gestiona vía movimientos_stock, no por edición directa) del conjunto editable. La firma recibe productoId como primer argumento pensada para .bind(null, productoId) en el formulario real (aún no construido, docs/SITEMAP.md lista /productos/[productoId] como estación futura). tsc --noEmit, eslint --max-warnings 0, vitest (90/90 incluyendo los 6 nuevos) y next build pasan sin errores; sin verificación de navegador porque no hay página nueva en este ticket (backend puro, mismo criterio que crearProducto).

**Archivos Modificados:**
- `src/services/productos/actualizarProducto.ts`
- `src/services/productos/actualizarProducto.test.ts`
- `src/services/productos/tipos.ts`
- `src/repositories/base/verificarPertenenciaTenant.ts`

**Contratos y API signatures:**
- `actualizarProducto(productoId: string, estadoPrevio: EstadoActualizarProducto, formData: FormData): Promise<EstadoActualizarProducto> — src/services/productos/actualizarProducto.ts`
- `EstadoActualizarProducto { error: string | null; exito: boolean }, ESTADO_ACTUALIZAR_PRODUCTO_INICIAL — src/services/productos/tipos.ts`
- `TablaConGuardTenant = 'ventas' | 'devoluciones' | 'clientes_finales' | 'productos' — ampliado en src/repositories/base/verificarPertenenciaTenant.ts`


--- 

## 🎯 HU: Baja lógica de producto
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero dar de baja un producto sin eliminarlo físicamente para conservar el historial de ventas y auditoría asociado a ese producto.
```

### 📄 [✔ COMPLETADA] Server Action de soft delete de producto
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `eliminarProducto` (src/services/productos/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
eliminarProducto sigue el mismo esqueleto de auth+guard que actualizarProducto (sesión → solicitante → rol → verificarPertenenciaTenant), pero restringe el rol a comerciante exclusivamente, citando textualmente la nota de matriz de docs/ROLES.md §2 sobre que empleado nunca ejecuta baja lógica de productos — a diferencia de actualizarProducto, que sí permite ambos roles para edición normal. Se agregó un guard extra no pedido explícitamente para eliminarProducto pero necesario por consistencia: si el producto ya estaba dado de baja, no se vuelve a escribir eliminado_en (se corta con NX-PRD-006 en vez de generar un diff sin valor real de timestamp-a-timestamp). El hallazgo más importante de la estación fue en el Paso 4 del checklist, que pedía NX-PRD-006 'ante intentos de editar' — eso apunta a actualizarProducto.ts (estación anterior), no a eliminarProducto.ts en sí. Se verificó la política RLS productos_update_tenant real: su WITH CHECK exige eliminado_en IS NULL solo para el disyunto de empleado, pero comerciante bypasea esa condición por completo — sin un chequeo de aplicación, un comerciante podía editar en silencio un producto ya eliminado mientras que un empleado intentando lo mismo se topaba con un error crudo de RLS (permission denied) en vez de un código de negocio normalizado. Se corrigió agregando eliminado_en a la lectura de valores previos de actualizarProducto.ts y un corte temprano con NX-PRD-006, con test nuevo cubriendo el caso. El Paso 3 (excluir de índices activos en listados) se verificó por inspección explícita: la única consulta de listado/conteo de productos que existe hoy en el repo (contarProductosActivos, de la estación de crearProducto) ya filtra WHERE eliminado_en IS NULL desde que se escribió — no hace falta ni conviene fabricar una página de listado completa como efecto colateral de este ticket, ya que /productos es una estación de UI todavía no asignada. Se detectó y corrigió una brecha real de configuración de ESLint: la regla @typescript-eslint/no-unused-vars viene sin argsIgnorePattern en eslint-config-next, y su opción por defecto args:'after-used' solo ignora parámetros no usados que preceden al último parámetro sí usado — en crearCliente.ts/crearUsuario.ts esto nunca se notó porque su único parámetro no usado (_estadoPrevio) siempre precede a formData (usado); en eliminarProducto.ts, productoId (usado) es el primer parámetro y tanto _estadoPrevio como _formData (no usados) quedan después, así que si se los marcaba con guion bajo por convención pero la regla no tenía el patrón de exclusión configurado, ESLint los reportaba de todas formas. Se agregó argsIgnorePattern/varsIgnorePattern '^_' a la config compartida (eslint.config.mjs) para formalizar la convención que el repo ya usaba de hecho, en vez de silenciar el warning archivo por archivo con eslint-disable. tsc --noEmit, eslint --max-warnings 0 (con el ajuste de config), vitest (96/96 incluyendo los 10 nuevos) y next build pasan sin errores; CI de GitHub Actions (Lint, Tipado, Pruebas unitarias, Pruebas E2E) todo en verde en el PR real.

**Archivos Modificados:**
- `src/services/productos/eliminarProducto.ts`
- `src/services/productos/eliminarProducto.test.ts`
- `src/services/productos/actualizarProducto.ts`
- `src/services/productos/actualizarProducto.test.ts`
- `src/services/productos/tipos.ts`
- `src/lib/errores/catalogo.ts`
- `eslint.config.mjs`

**Contratos y API signatures:**
- `eliminarProducto(productoId: string, estadoPrevio: EstadoEliminarProducto, formData: FormData): Promise<EstadoEliminarProducto> — src/services/productos/eliminarProducto.ts`
- `EstadoEliminarProducto { error: string | null; exito: boolean }, ESTADO_ELIMINAR_PRODUCTO_INICIAL — src/services/productos/tipos.ts`
- `CATALOGO_ERRORES['NX-PRD-006']`
- `actualizarProducto ahora también retorna NX-PRD-006 si el producto ya tiene eliminado_en seteado`
- `eslint.config.mjs: @typescript-eslint/no-unused-vars con argsIgnorePattern/varsIgnorePattern '^_'`


--- 

## 🎯 HU: Listado paginado de productos
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero ver mi catálogo en un listado paginado para navegar cómodamente incluso cuando tengo cientos o miles de productos.
```

### 📄 [✔ COMPLETADA] Query paginada server-side de productos
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `obtenerProductosPaginados` (src/repositories/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
El hallazgo más importante de la estación fue un bug de paginación real, no anticipado por el ticket: ordenar solo por creado_en no es suficiente cuando múltiples filas comparten el mismo timestamp, porque Postgres evalúa DEFAULT now() una única vez por sentencia en un INSERT masivo (no por fila) — todas las 1000 filas del seed de un tenant terminan con el creado_en idéntico. Con un ORDER BY con empates, dos ejecuciones de .range() para páginas distintas no tienen garantía de devolver un orden consistente entre sí, lo que se confirmó en vivo contra el proyecto real: la misma fila aparecía en la página 1 y en la página 2 simultáneamente. Se corrigió agregando producto_id como desempate determinístico (order by creado_en desc, producto_id asc) y se verificó en el navegador que las páginas dejaron de solaparse. Se optó por un Route Handler (GET /api/productos) en vez de exponer una Server Action a TanStack Query: el hook useQuery necesita un contrato HTTP estándar con fetch(), y docs/SITEMAP.md ya documentaba /api/productos como Route Handler planificado. Como /api/* no está cubierto por el matcher de src/proxy.ts (que solo protege rutas de página), la validación de sesión y rol dentro del handler es la autorización primaria de este endpoint, no defensa en profundidad. El layout de (app) se creó mínimo (solo QueryProvider) a propósito: el sidebar/topbar completo que documenta SITEMAP.md es una estación de UI separada, no pedida acá. ListadoProductos se separó del page.tsx (Server Component) porque useSearchParams() en un componente cliente debe envolverse en Suspense según la documentación de Next.js App Router para no forzar toda la ruta a client-side rendering sin límite en el build. Se verificó en navegador real (no solo build) contra el proyecto Supabase real con el tenant de 1000 productos (Bazar Casa Sur): conteo correcto, paginación sin duplicados tras el fix, y comportamiento de caché de TanStack Query confirmado (contenido servido instantáneamente desde caché al volver a una página visitada, con revalidación en segundo plano cuando la demora entre acciones de esta sesión de verificación superó el staleTime de 30s — comportamiento esperado, no un defecto). Se encontró y corrigió además un bug real preexistente en la migración de seed de productos de la estación anterior (CASE sin cast a origen_alta_producto, fallaba al aplicarse contra Postgres real) y se aplicaron los 1.960 productos contra el proyecto real, con autorización explícita del usuario, para poder ejecutar esta verificación con datos reales. get_advisors (security) sin hallazgos nuevos. tsc --noEmit, eslint --max-warnings 0, vitest (106/106 incluyendo los 10 nuevos) y next build pasan sin errores; CI de GitHub Actions (Lint, Tipado, Pruebas unitarias, Pruebas E2E) todo en verde en el PR real.

**Archivos Modificados:**
- `src/repositories/productosRepository.ts`
- `src/repositories/productosRepository.test.ts`
- `src/app/api/productos/route.ts`
- `src/app/api/productos/route.test.ts`
- `src/app/(app)/layout.tsx`
- `src/app/(app)/productos/page.tsx`
- `src/app/(app)/productos/listado-productos.tsx`
- `src/components/providers/query-provider.tsx`
- `src/hooks/useProductosPaginados.ts`
- `supabase/migrations/20260809180000_seed_productos_volumetrico.sql`
- `package.json`
- `package-lock.json`

**Contratos y API signatures:**
- `obtenerProductosPaginados(supabase, clienteId, pagina, porPagina?): Promise<ResultadoRepositorio<ResultadoProductosPaginados>> — src/repositories/productosRepository.ts`
- `PRODUCTOS_POR_PAGINA = 25, FilaProductoListado, ResultadoProductosPaginados`
- `GET /api/productos?pagina=&porPagina= — src/app/api/productos/route.ts (401/403/500 normalizados + 200 con {productos,total,pagina,porPagina})`
- `useProductosPaginados(pagina): UseQueryResult<ResultadoProductosPaginados> — src/hooks/useProductosPaginados.ts`
- `<QueryProvider> — src/components/providers/query-provider.tsx, montado en app/(app)/layout.tsx`
- `Ruta: /productos`
- `Nueva dependencia: @tanstack/react-query`


--- 

## 🎯 HU: Aviso discreto al 90% del límite de SKU
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero recibir un aviso discreto en el panel cuando alcance el 90% de mi límite de SKU contratado para anticipar la necesidad de ampliar mi plan.
```

### 📄 [✔ COMPLETADA] Cálculo de porcentaje de uso de SKU y banda de aviso
- **Rol:** Frontend / UX Engineer
- **Componente/Ruta:** `calcularPorcentajeUsoSku` (src/lib/dominio/productos/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
calcularPorcentajeUsoSku y debeMostrarAvisoLimiteSku se agruparon en el mismo archivo (aunque el ticket solo nombra la primera) porque el umbral de negocio (90%, sin techo en 100%) es indisociable del cálculo y ambas cosas se prueban juntas con TDD antes de tocar ninguna UI. dashboard/page.tsx es la primera página real del grupo (app) — hasta ahora solo tenía error.tsx y layout.tsx (QueryProvider de la estación anterior) — y calcula el uso combinando contarProductosActivos (ya existente, estación de crearProducto) con clientes.limite_sku, sin duplicar lógica de conteo. El hallazgo central de esta estación fue un bug real de CI, no cubierto por el checklist: el primer push rompió el job de Tipado porque crearClienteSupabaseServidor() invoca obtenerEntornoServidor() (que valida TODO el esquema de entorno server-only, incluyendo SUPABASE_SERVICE_ROLE_KEY y las credenciales de Upstash) antes de llegar a await cookies() — es decir, antes de que Next.js pueda detectar por análisis propio que la ruta depende de una API dinámica. El entorno de CI no define esas variables (no las necesita para nada relacionado con esta página), y Next intentó prerenderizar /dashboard en build, abortando todo el proceso. Se diagnosticó reproduciendo el fallo en local (rm -rf .next + build sin .env.local), se aisló moviendo la carpeta dashboard fuera del árbol de app para confirmar que sin ella el build pasaba limpio incluso sin variables de entorno, y se corrigió agregando export const dynamic = 'force-dynamic' — la forma documentada y determinística de opt-out de prerenderizado en App Router, en vez de depender de heurísticas de detección automática. Se aplicó el mismo fix defensivamente a admin/clientes/page.tsx y admin/clientes/[clienteId]/page.tsx: comparten exactamente el mismo patrón de riesgo (mismo crearClienteSupabaseServidor(), sin marcador explícito) y simplemente no habían disparado el problema todavía por casualidad de cómo Next las analizó en builds previos — dejarlas así habría sido una bomba de tiempo para cualquier PR futuro no relacionado. Se verificó el fix reproduciendo el escenario exacto de CI en local (build sin .env.local) antes y después del cambio. gh pr edit tuvo un bug conocido de GitHub (deprecación de Projects classic) al intentar actualizar la descripción del PR con el hallazgo del fix; se resolvió actualizando el body vía gh api -X PATCH directo sobre el endpoint REST de pulls, sin tocar nada del repositorio. tsc --noEmit, eslint --max-warnings 0, vitest (115/115) y next build (validado con y sin .env.local) pasan sin errores; CI de GitHub Actions en verde en el PR real tras el fix.

**Archivos Modificados:**
- `src/lib/dominio/productos/calcularPorcentajeUsoSku.ts`
- `src/lib/dominio/productos/calcularPorcentajeUsoSku.test.ts`
- `src/app/(app)/dashboard/page.tsx`
- `src/lib/errores/catalogo.ts`
- `src/app/(admin)/admin/clientes/page.tsx`
- `src/app/(admin)/admin/clientes/[clienteId]/page.tsx`

**Contratos y API signatures:**
- `calcularPorcentajeUsoSku(activos: number, limite: number): number — src/lib/dominio/productos/calcularPorcentajeUsoSku.ts`
- `UMBRAL_AVISO_SKU_PORCENTAJE = 90, debeMostrarAvisoLimiteSku(porcentajeUso: number): boolean`
- `CATALOGO_ERRORES['NX-PRD-008']`
- `Ruta: /dashboard (primera página real del grupo (app))`
- `export const dynamic = "force-dynamic" agregado a dashboard, admin/clientes y admin/clientes/[clienteId]`


--- 

## 🎯 HU: Bloqueo de alta al 100% del límite con oferta de ampliación
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero que se bloquee la creación de nuevos productos al llegar al 100% de mi límite y se me ofrezca un Pack de Catálogo Extendido para poder seguir creciendo sin cargos sorpresa.
```

### 📄 [✔ COMPLETADA] Validación de bloqueo de alta al alcanzar limite_sku
- **Rol:** Frontend / UX Engineer
- **Componente/Ruta:** `ModalBloqueoSku` (src/components/productos/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Los Pasos 1-2 del checklist (verificar límite antes del insert, retornar NX-PRD-001) ya estaban resueltos por completo en crearProducto.ts desde la estación de 'Server Action crearProducto con validación Zod' — se verificó el código existente línea por línea antes de tocar nada, sin duplicar la lógica ni re-implementarla. El foco real de esta estación fue ModalBloqueoSku y su integración real: como no existía ninguna página que consumiera crearProducto todavía (el Server Action existía sin ningún formulario que lo invocara), se construyó app/(app)/productos/nuevo/ mínimo — un formulario cliente con los 4 campos del DTO — específicamente para poder demostrar y verificar el modal end-to-end, no como una funcionalidad separada fuera de alcance. El modal se distingue deliberadamente de MensajeError (rojo, para validación) usando exclusivamente acento text-blue-500 sin ícono de alerta, siguiendo textualmente docs/DESIGN.md §4 ('modal de bloqueo empático... nunca en tono punitivo o rojo'). El manejo de 'cerrado manualmente' del modal usa el patrón de React de ajustar estado durante el render (comparando el objeto `estado` de useActionState contra el último visto) en vez de un useEffect con setState, porque el linter del proyecto (react-hooks/set-state-in-effect) lo rechaza explícitamente — se topó con este error real al escribir la primera versión y se corrigió seleccionando el patrón que React mismo documenta como preferible en vez de silenciar la regla. La verificación en navegador requirió un ajuste temporal de limite_sku contra el proyecto Supabase real (ningún tenant sembrado estaba exactamente en su límite): se pidió autorización explícita al usuario antes de la escritura SQL directa (el clasificador de permisos ya la había bloqueado una vez), se ejecutó el ciclo completo bloqueo→ampliación→alta exitosa contra datos reales, se limpió el producto de prueba insertado y se restauró limite_sku a su valor original al terminar. Durante la verificación se encontró que los clics automatizados del tooling de browser no llegaban a disparar el submit del formulario (confirmado comparando logs del servidor: sin POST tras varios reintentos con valores de campo correctos); se diagnosticó llamando form.requestSubmit() directamente, lo que sí generó el POST esperado y confirmó que la aplicación funciona correctamente — el problema era de entrega del evento de clic en el entorno de automatización, no un bug real, y se documenta acá para que una estación futura que verifique este mismo formulario no pierda tiempo re-investigando lo mismo. tsc --noEmit, eslint --max-warnings 0, vitest (115/115, sin regresiones) y next build pasan sin errores; CI de GitHub Actions (Lint, Tipado, Pruebas unitarias, Pruebas E2E) todo en verde en el PR real.

**Archivos Modificados:**
- `src/components/productos/ModalBloqueoSku.tsx`
- `src/app/(app)/productos/nuevo/page.tsx`
- `src/app/(app)/productos/nuevo/formulario-alta-producto.tsx`

**Contratos y API signatures:**
- `<ModalBloqueoSku abierto={boolean} onCerrar={() => void} /> — src/components/productos/ModalBloqueoSku.tsx`
- `Ruta: /productos/nuevo`
- `<FormularioAltaProducto /> — src/app/(app)/productos/nuevo/formulario-alta-producto.tsx`


--- 

## 🎯 HU: Registro de entrada de stock
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero registrar una entrada de stock por producto para reflejar mercadería recibida y mantener actualizado el saldo disponible.
```

### 📄 [✔ COMPLETADA] Server Action registrarEntradaStock
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `registrarEntradaStock` (src/services/stock/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
La decisión central de esta estación fue dónde vive la atomicidad: el checklist pedía explícitamente calcular saldo_resultante 'dentro de una función RPC de Supabase' en vez de en la Server Action, y se siguió al pie de la letra porque un patrón 'leer stock_actual en la app, sumar en memoria, hacer UPDATE' tiene una ventana de carrera real entre dos entradas concurrentes al mismo producto (la segunda pisaría el cálculo de la primera). Un UPDATE...RETURNING de una sola fila en Postgres es atómico por diseño del motor, así que el RPC hace ese UPDATE y usa su valor de retorno directamente como saldo_resultante para el INSERT en movimientos_stock, ambos dentro de la misma ejecución de función (transacción implícita). Se decidió SECURITY INVOKER (no DEFINER): el RPC corre con los permisos de la sesión que lo invoca, así que las políticas RLS productos_update_tenant y movimientos_stock_insert_tenant ya existentes siguen siendo la autoridad real, sin necesitar bypassear RLS ni replicar su lógica en PL/pgSQL. cliente_id y usuario_id se derivan del JWT/sesión adentro de la función (auth_cliente_id(), auth.uid()) en vez de recibirse como parámetros — un producto de otro tenant simplemente no matchea el WHERE del UPDATE y la función falla con NO_DATA_FOUND (SQLSTATE P0002, un código ya reservado de PL/pgSQL, no inventado), que la Server Action traduce a NX-SYS-007 sin necesitar una consulta de guard separada (verificarPertenenciaTenant) porque el RPC ya resuelve el aislamiento de tenant atómicamente junto con la escritura. Al escribir el seed de movimientos_stock se encontró un bug real heredado de docs/SEED.md: 16 de los 1.960 productos sembrados tienen stock_actual=0 (producto del random() de la siembra volumétrica), e insertar una 'entrada' de 0 unidades viola el CHECK (cantidad > 0) de movimientos_stock — se excluyeron esas filas explícitamente (documentado en el propio SQL), dejando el volumen real en 1.944 en vez de 1.960 literal. Toda la lógica crítica (cálculo atómico, aislamiento de tenant) se verificó contra el proyecto Supabase real dentro de transacciones con SET LOCAL request.jwt.claims + ROLLBACK, sin dejar ningún dato residual: se confirmó el caso exacto del criterio de aceptación (50+20=70) y que un comerciante no puede registrar una entrada sobre un producto de otro tenant. get_advisors (security) sin hallazgos nuevos. No hay página de UI en este ticket (Server Action puro), mismo criterio que las estaciones anteriores de productos, así que no aplica verificación de navegador. tsc --noEmit, eslint --max-warnings 0, vitest (122/122 incluyendo los 7 nuevos) y next build pasan sin errores; CI de GitHub Actions en verde en el PR real.

**Archivos Modificados:**
- `src/services/stock/registrarEntradaStock.ts`
- `src/services/stock/registrarEntradaStock.test.ts`
- `src/services/stock/tipos.ts`
- `supabase/migrations/20260810100000_registrar_entrada_stock_rpc.sql`
- `supabase/migrations/20260810110000_seed_movimientos_stock_volumetrico.sql`

**Contratos y API signatures:**
- `registrarEntradaStock(estadoPrevio: EstadoRegistrarEntradaStock, formData: FormData): Promise<EstadoRegistrarEntradaStock> — src/services/stock/registrarEntradaStock.ts`
- `EstadoRegistrarEntradaStock { error: string | null; exito: boolean }, ESTADO_REGISTRAR_ENTRADA_STOCK_INICIAL`
- `SQL function public.registrar_entrada_stock(p_producto_id uuid, p_cantidad integer) returns movimientos_stock — SECURITY INVOKER, aplicada contra el proyecto real`
- `1.944 filas sembradas en movimientos_stock (proyecto real)`


--- 

## 🎯 HU: Registro de salida de stock
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero registrar una salida de stock por producto para reflejar mermas, roturas u otros movimientos que no provienen de una venta.
```

### 📄 [✔ COMPLETADA] Server Action registrarSalidaStock con validación de saldo
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `registrarSalidaStock` (src/services/stock/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
El ticket nombraba explícitamente una función RPC distinta (fn_registrar_movimiento_stock) a la construida en la estación anterior (registrar_entrada_stock, entrada-only). En vez de crear una segunda función con lógica atómica duplicada, se consolidó en una única función genérica parametrizada por tipo ('entrada'/'salida') y se refactorizó registrarEntradaStock.ts para usarla también — la migración anterior no se edita (nunca se reescribe una migración ya aplicada), sino que una nueva migración hace DROP de la función vieja y crea la genérica. La decisión técnica central fue dónde vive el chequeo de saldo suficiente para salida: se integró directamente en la cláusula WHERE del mismo UPDATE atómico (stock_actual + v_delta >= 0) en vez de un SELECT previo o un SELECT ... FOR UPDATE explícito. Esto es deliberado: un UPDATE con condición en el WHERE es una única sentencia que Postgres serializa por fila de forma nativa bajo escritura concurrente (la segunda transacción re-evalúa la condición contra el valor ya commiteado por la primera), logrando la garantía de 'no stock negativo bajo concurrencia' sin necesitar un lock manual ni una columna de versión optimista separada — más simple y con una sola ida a la base en el camino feliz. Cuando el UPDATE no aplica ningún cambio (NOT FOUND), el RPC no puede distinguir por sí solo si fue por 'producto de otro tenant' o 'saldo insuficiente'; se resuelve con una consulta de diagnóstico posterior (un EXISTS liviano) que corre después de que la mutación ya falló, así que no reabre ninguna ventana de carrera — solo decide qué SQLSTATE levantar para que la Server Action mapee al código de negocio correcto (NX004 custom → NX-PRD-004, P0002 reservado de PL/pgSQL → NX-SYS-007). El criterio de concurrencia (dos solicitudes simultáneas) no se pudo probar con transacciones verdaderamente paralelas desde las herramientas disponibles; se verificó en cambio la corrección del branch lógico en secuencia contra el proyecto real (un intento que dejaría stock negativo falla limpiamente sin aplicar cambios) y se documentó explícitamente por qué la garantía real de concurrencia se apoya en la semántica estándar de Postgres para UPDATE, no en una prueba de carga. Se verificó cuidadosamente que las pruebas contra la base real no dejaran residuos: se encontró una fila en movimientos_stock para el producto de prueba y se confirmó que era la siembra legítima de la estación de registrarEntradaStock (no un artefacto de esta verificación) antes de dar por buena la limpieza. Sin página de UI en este ticket, mismo criterio que las estaciones backend anteriores. tsc --noEmit, eslint --max-warnings 0, vitest (129/129) y next build pasan sin errores; CI de GitHub Actions en verde en el PR real.

**Archivos Modificados:**
- `src/services/stock/registrarSalidaStock.ts`
- `src/services/stock/registrarSalidaStock.test.ts`
- `src/services/stock/registrarEntradaStock.ts`
- `src/services/stock/registrarEntradaStock.test.ts`
- `src/services/stock/tipos.ts`
- `src/lib/errores/catalogo.ts`
- `supabase/migrations/20260810120000_fn_registrar_movimiento_stock_rpc.sql`

**Contratos y API signatures:**
- `registrarSalidaStock(estadoPrevio: EstadoRegistrarSalidaStock, formData: FormData): Promise<EstadoRegistrarSalidaStock> — src/services/stock/registrarSalidaStock.ts`
- `EstadoRegistrarSalidaStock { error: string | null; exito: boolean }, ESTADO_REGISTRAR_SALIDA_STOCK_INICIAL`
- `SQL function public.fn_registrar_movimiento_stock(p_producto_id uuid, p_tipo tipo_movimiento_stock, p_cantidad integer) returns movimientos_stock — SECURITY INVOKER, reemplaza a registrar_entrada_stock (DROP incluido en la misma migración), aplicada contra el proyecto real`
- `registrarEntradaStock ahora llama a fn_registrar_movimiento_stock con p_tipo='entrada' (antes llamaba a registrar_entrada_stock)`
- `CATALOGO_ERRORES['NX-PRD-004']`


--- 

