# Handoffs y Entregables del Sprint - Sprint 5: Carga Masiva, Stock en Tiempo Real y Panel de Ventas

**Objetivo:** Cerrar las funcionalidades avanzadas de catálogo (Excel, compresión de imágenes), completar el control de stock y comenzar el Panel de Ventas/Mostrador.
**Capacidad:** 30 Ptos | **Duración:** 2 Semanas
**Estado del Sprint:** PLANIFICADO

--- 

## 🎯 HU: Carga masiva de productos vía Excel
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero importar mi catálogo mediante una plantilla Excel estructurada para dar de alta muchos productos de una sola vez sin cargarlos uno por uno.
```

### 📄 [✔ COMPLETADA] Route Handler de importación de catálogo por Excel
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `importarProductos` (app/api/productos/importar/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
El Route Handler valida sesión+rol (comerciante/empleado) como autorización primaria (fuera del matcher de src/proxy.ts, igual que GET /api/productos), verifica la plantilla (columnas sku/nombre/precio/categoria) y cada fila con Zod devolviendo NX-PRD-007 literal para todo error de formato (instrucción textual del checklist de esta actividad, a diferencia de crearProducto.ts que bifurca precio a NX-PRD-003). Los SKU repetidos dentro del mismo archivo se detectan antes de tocar la base (NX-PRD-002) y las filas que exceden el limite_sku disponible del tenant se recortan y marcan NX-PRD-001 sin bloquear las que sí entran. El insert real usa insertarProductosEnLote, un upsert con ignoreDuplicates sobre (cliente_id, sku) — mismo patrón que activarModulosIniciales de la estación de onboarding — que genera un único INSERT...ON CONFLICT DO NOTHING RETURNING atómico: no revierte el lote completo ante un SKU ya existente en el tenant (a diferencia de un insert multi-fila común) y el RETURNING permite diferenciar por SKU altas reales vs. rechazos NX-PRD-002 contra la base. Cada producto insertado se audita vía registrarDiff (fire-and-forget, no bloquea la respuesta). Decisión de seguridad relevante: se descartó el paquete xlsx (SheetJS) de npm por tener una vulnerabilidad de prototype pollution y un ReDoS sin fix disponible (confirmado por npm audit) — inaceptable en un endpoint que parsea binarios subidos por usuarios no confiables, en línea con CLAUDE.md §4 'seguridad: OWASP Top 10'. Se usó exceljs en su lugar (0 vulnerabilidades directas explotables en este flujo; solo una advertencia moderada transitiva de uuid que requiere un parámetro que este código nunca pasa). El fixture de 500 filas pedido por el ticket se generó con un script propio (no es un seed de Supabase, no toca la base) y se verificó su contenido real (9 SKU duplicados / 18 filas, 10 precios negativos) antes de documentar los números en el comentario del script. tsc --noEmit, eslint --max-warnings 0, vitest (141/141 incluyendo los 13 nuevos) y next build (con el guardrail postbuild de fuga de service_role) pasan sin errores. Sin verificación de navegador: es un Route Handler puro sin página de UI nueva, mismo criterio que las estaciones backend previas del módulo de stock/productos. Se hizo commit, push y se abrió el PR #25 siguiendo la instrucción permanente del usuario; el merge queda a su cargo tras el CI.

**Archivos Modificados:**
- `src/app/api/productos/importar/route.ts`
- `src/app/api/productos/importar/route.test.ts`
- `src/repositories/productosRepository.ts`
- `src/repositories/productosRepository.test.ts`
- `src/lib/errores/catalogo.ts`
- `scripts/generar-fixture-importacion-productos.ts`
- `scripts/fixtures/importacion-productos-prueba.xlsx`
- `package.json`
- `package-lock.json`

**Contratos y API signatures:**
- `POST /api/productos/importar — src/app/api/productos/importar/route.ts (FormData campo 'archivo'; 401/403/422/500 normalizados + 200 con { total, insertados, rechazados, filas: [{fila, sku, insertado, error}] })`
- `insertarProductosEnLote(supabase, clienteId, productos: DatosProductoImportado[]): Promise<ResultadoRepositorio<FilaProductoInsertadoLote[]>> — src/repositories/productosRepository.ts`
- `DatosProductoImportado { sku, nombre, precio, categoria }, FilaProductoInsertadoLote { producto_id, sku }`
- `CATALOGO_ERRORES['NX-PRD-007']`
- `Nueva dependencia: exceljs (no xlsx/SheetJS)`
- `Fixture: scripts/fixtures/importacion-productos-prueba.xlsx (500 filas, 9 SKU duplicados, 10 precios negativos), regenerable con npx tsx scripts/generar-fixture-importacion-productos.ts`


--- 

## 🎯 HU: Compresión automática de imágenes de producto
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero que las imágenes que subo se compriman automáticamente a WebP para que mi catálogo cargue rápido sin tener que preocuparme por el formato del archivo.
```

### 📄 [✔ COMPLETADA] Pipeline de compresión WebP vía Cloudinary
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `comprimirImagen` (src/services/imagenes/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
imagenesRepository.ts abstrae por completo el SDK de Cloudinary (Paso 2 del checklist): expone subirImagenComoWebp aceptando tanto Buffer (vía upload_stream, para imágenes subidas desde un formulario) como string (URL/data URI, vía upload directo), evitando forzar al llamador a materializar un Buffer cuando ya tiene una URL. La transformación fija width:1080/crop:limit + fetch_format:webp/quality:auto:eco: Cloudinary no admite un 'peso exacto en bytes' como parámetro de transformación, así que quality:auto:eco (su modo orientado a minimizar peso) es la aproximación real al objetivo de ~70KB del ticket — documentado inline en ambos archivos para que no se lea como un descuido del checklist. comprimirImagenProducto (el punto de entrada de dominio, Criterio de Aceptación 3) no importa cloudinary en ningún momento, solo el repositorio. Cualquier fallo de la API (credenciales inválidas, timeout, archivo corrupto) se normaliza a NX-PRD-005 sin propagar el error crudo del SDK ni romper el flujo del llamador (Paso 3 / Criterio 2). El peso final se valida después de subir (Paso 4): si supera 1.5x el objetivo, no bloquea el alta —la imagen ya es WebP y perfectamente utilizable— pero reporta un warning a Sentry para seguimiento, mismo criterio de 'no romper el flujo principal ante una desviación no crítica' que ya usa registrarDiff.ts. Se descartó un flag de 'cliente ya configurado' en el repositorio: cloudinary.config() solo asigna propiedades en memoria del proceso (no hace red), así que repetirlo en cada subida es barato y evita un estado de singleton que hubiera complicado los tests de forma innecesaria. Las credenciales se agregaron a src/lib/env.ts como obligatorias del lado servidor (mismo criterio que Upstash: es un servicio activo del pipeline, no telemetría opcional degradable a no-op) y se sumó CLOUDINARY_API_SECRET al guardrail postbuild verificar-fugas-env-cliente.ts que ya auditaba SUPABASE_SERVICE_ROLE_KEY y UPSTASH_REDIS_REST_TOKEN. Las pruebas de integración (Paso 4 / Criterio 4) mockean el SDK de Cloudinary y verifican tanto el camino dentro del objetivo (sin aviso a Sentry) como el camino que lo excede significativamente (con aviso), además de la tolerancia intermedia sin aviso. Sin UI en este ticket (Server-side puro, mismo criterio que las estaciones backend previas de Gestión de Catálogo): el formulario de alta/edición de producto que use este servicio para la imagen queda para una estación futura — actualizarProducto.ts/crearProducto.ts no se tocaron. tsc --noEmit, eslint --max-warnings 0, vitest (152/152 incluyendo los 11 nuevos) y next build (con el guardrail postbuild ampliado) pasan sin errores. Se hizo commit, push y se abrió el PR #26 siguiendo la instrucción permanente del usuario; el merge queda a su cargo tras el CI.

**Archivos Modificados:**
- `src/repositories/imagenesRepository.ts`
- `src/repositories/imagenesRepository.test.ts`
- `src/services/imagenes/comprimirImagen.ts`
- `src/services/imagenes/comprimirImagen.test.ts`
- `src/lib/env.ts`
- `.env.example`
- `scripts/verificar-fugas-env-cliente.ts`
- `package.json`
- `package-lock.json`

**Contratos y API signatures:**
- `subirImagenComoWebp(origen: Buffer | string, opciones: OpcionesSubidaImagen): Promise<ResultadoRepositorio<ImagenSubida>> — src/repositories/imagenesRepository.ts`
- `ImagenSubida { url, bytes, ancho, alto, formato }, OpcionesSubidaImagen { carpeta, anchoMaximo }`
- `comprimirImagenProducto(origen: Buffer | string): Promise<ResultadoRepositorio<ImagenComprimida>> — src/services/imagenes/comprimirImagen.ts`
- `ImagenComprimida { url, bytes, ancho, alto }, ANCHO_MAXIMO_PX = 1080, PESO_OBJETIVO_BYTES = 71680`
- `env server-only obligatorias: CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET`
- `Nueva dependencia: cloudinary (SDK oficial v2)`
- `scripts/verificar-fugas-env-cliente.ts audita también CLOUDINARY_API_SECRET`


--- 

## 🎯 HU: Visualización de saldo de stock en tiempo real
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero ver el saldo actualizado de stock de cada producto en tiempo real para tomar decisiones de reposición con información confiable.
```

### 📄 [✔ COMPLETADA] Vista de movimientos de stock con TanStack Query
- **Rol:** Frontend / UX Engineer
- **Componente/Ruta:** `MovimientosStock` (app/(app)/stock/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
El repositorio embebe la FK productos(nombre, sku) en una sola query (nunca N+1) y usa movimiento_id como desempate de order() junto a creado_en DESC — mismo bug de fondo ya documentado en obtenerProductosPaginados: los 1.944 movimientos sembrados en Sprint 4 comparten creado_en literal por lote, y sin desempate .range() no garantiza el mismo orden entre páginas; se verificó en vivo (50 movimientos de Almacén Don Pedro) que no hay duplicados entre página 1 y 2. El filtro opcional productoId en el Route Handler y el repositorio calza exactamente con idx_movstock_producto (producto_id, creado_en DESC) cuando se usa, y con idx_movstock_cliente cuando no (listado general del tenant) — así se cumple literalmente el Paso 1 del checklist sin forzar un filtro obligatorio no pedido por los criterios de aceptación. GET /api/stock repite la autorización de sesión+rol (comerciante/empleado con cliente_id) como barrera primaria, igual que GET /api/productos, porque /api/* no está cubierto por el matcher del proxy global aunque /stock sí lo esté. El frontend replica al pie de la letra el patrón ya establecido por app/(app)/productos/ (Suspense + useSearchParams + TanStack Query + paginación vía Link sin recarga completa), evitando introducir un segundo patrón de listado paginado en el repo. Cantidad y saldo van en font-mono (Paso 3); el badge de entrada/salida usa ícono lucide-react (PackagePlus/PackageMinus) además de color —nunca solo color, docs/DESIGN.md §5— y deliberadamente NO usa el rojo semántico para 'salida': ese token está reservado a errores de formulario/alertas destructivas, y una salida de stock (merma, rotura) es una operación de negocio válida, no un error. El punto más relevante de esta estación es la invalidación del Paso 2: hoy no existe en el repo ninguna pantalla que dispare registrarEntradaStock/registrarSalidaStock (son Server Actions sin página propia, confirmado por grep antes de escribir código — ver docs/PRUEBAS_MANUALES.md sección 'Pendiente de pantalla'), así que no había ningún llamador real al que conectar una invalidación. En vez de fabricar un formulario de alta de movimiento fuera del alcance de este ticket (Component/Archivo: MovimientosStock) o dejar el criterio sin resolver, se construyó y testeó invalidarMovimientosStock(queryClient) como la infraestructura lista para que la estación que construya esas pantallas la invoque tras estado.exito, con un test que usa un QueryClient real para probar que la invalidación por prefijo de clave funciona (afecta todas las páginas/filtros de /stock, no otras claves como productos) — documentado explícitamente en el código para que no se lea como un paso salteado. HALLAZGO OPERATIVO fuera de alcance de este ticket pero crítico: verificando en navegador se detectó que el login (y por extensión toda la app) falla con un error 500 sin CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET configuradas, porque el PR #26 (ya mergeado a main) las agregó como obligatorias en obtenerEntornoServidor(), y crearClienteSupabaseServidor() valida todo ese esquema antes de cualquier operación — incluido el login, que no usa Cloudinary para nada. Se agregaron valores placeholder solo en .env.local (no versionado, confirmado con git status) para poder verificar este ticket; se alertó al usuario en la descripción del PR y en el chat porque si Vercel no tiene esas 3 variables configuradas, la producción completa quedaría rota, no solo la carga de imágenes — esto requiere acción del usuario, no un cambio de código de esta estación. Verificado end-to-end en navegador real contra el proyecto Supabase real: login real, paginación sin duplicados con datos reales (Almacén Don Pedro, 50 movimientos), font-mono confirmado por computed style (Geist Mono), navegación 'Siguiente' confirmada sin reload vía read_network_requests (fetch a /api/stock?pagina=2), y empty state con CTA verificado con comerciante.demo@nodexa.app (0 movimientos). tsc --noEmit, eslint --max-warnings 0, vitest (166/166 incluyendo los 14 nuevos) y next build pasan sin errores. Se hizo commit, push y se abrió el PR #27 siguiendo la instrucción permanente del usuario; el merge queda a su cargo tras el CI.

**Archivos Modificados:**
- `src/app/(app)/stock/page.tsx`
- `src/app/(app)/stock/movimientos-stock.tsx`
- `src/app/api/stock/route.ts`
- `src/app/api/stock/route.test.ts`
- `src/repositories/movimientosStockRepository.ts`
- `src/repositories/movimientosStockRepository.test.ts`
- `src/hooks/useMovimientosStockPaginados.ts`
- `src/hooks/useMovimientosStockPaginados.test.ts`
- `docs/SITEMAP.md`

**Contratos y API signatures:**
- `GET /api/stock?pagina=&porPagina=&productoId= — src/app/api/stock/route.ts (401/403/500 normalizados + 200 con {movimientos,total,pagina,porPagina})`
- `obtenerMovimientosStockPaginados(supabase, clienteId, pagina, porPagina?, productoId?): Promise<ResultadoRepositorio<ResultadoMovimientosStockPaginados>> — src/repositories/movimientosStockRepository.ts`
- `MOVIMIENTOS_STOCK_POR_PAGINA = 25, FilaMovimientoStockListado, TipoMovimientoStock`
- `useMovimientosStockPaginados(pagina, productoId?): UseQueryResult<ResultadoMovimientosStockPaginados> — src/hooks/useMovimientosStockPaginados.ts`
- `CLAVE_CONSULTA_MOVIMIENTOS_STOCK, invalidarMovimientosStock(queryClient): Promise<void>`
- `<MovimientosStock /> — src/app/(app)/stock/movimientos-stock.tsx`
- `Ruta: /stock`


--- 

## 🎯 HU: Validación de stock no negativo
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero que el sistema impida dejar el stock en negativo al registrar una salida para evitar inconsistencias en mi inventario.
```

### 📄 [✔ COMPLETADA] Prueba unitaria y constraint de stock no negativo
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `calcularNuevoSaldo` (src/lib/dominio/stock/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
calcularNuevoSaldo es una función pura sin dependencias de Supabase/Next.js (Paso 2), reutilizando ErrorDeDominio ya existente en mapearError.ts en vez de inventar un mecanismo de excepción propio — el código NX-PRD-004 queda validado contra el catálogo en el punto donde se lanza. El caso límite de saldo exacto en cero se probó explícitamente como caso permitido (no lanza), y una salida sobre stock cero para cualquier cantidad positiva sí lanza, cubriendo el criterio de aceptación 3 sobre casos límite. El Paso 1 (CHECK (stock_actual >= 0) sobre productos) ya existía desde la migración crear_tablas_negocio.sql de una estación previa (Sprint 4, guard de RLS/tablas de negocio) — se verificó línea por línea antes de escribir código y no requirió ninguna migración nueva, evitando duplicar un constraint ya aplicado contra el proyecto real. La decisión más delicada de la estación fue cómo cumplir el Criterio de Aceptación 4 ('el error de dominio se propaga a la Server Action y mapea a NX-PRD-004') sin reintroducir la ventana de carrera que la estación de registrarSalidaStock.ts había eliminado deliberadamente semanas atrás (documentado en su propio comentario: la validación de saldo vive en el WHERE del UPDATE atómico del RPC, no en una lectura previa). Se resolvió agregando la lectura previa + calcularNuevoSaldo como una capa Fail-Fast estrictamente aditiva y documentada como tal en ambos archivos: nunca reemplaza al UPDATE atómico de fn_registrar_movimiento_stock (que sigue siendo la única fuente de verdad bajo concurrencia), solo corta más rápido y con mejor UX en el camino feliz de un único usuario. Si dos salidas concurrentes dejan la lectura previa desactualizada, el RPC sigue siendo quien realmente decide y ya devolvía NX-PRD-004 desde la estación anterior — se agregó un test específico ('lectura previa desactualizada por concurrencia') que verifica que ese camino sigue funcionando igual. Si la lectura previa no encuentra el producto (de otro tenant o soft-eliminado), el chequeo se omite explícitamente y se delega en el RPC, para no duplicar ni adelantar la decisión de NX-SYS-007 que ya resuelve correctamente esa distinción (mismo criterio que verificarPertenenciaTenant, docs/ROLES.md §3.8, de no revelar existencia de recursos ajenos). Se reescribió registrarSalidaStock.test.ts para mockear supabase.from() diferenciando por nombre de tabla ('usuarios' vs 'productos'), ya que el mock anterior devolvía el mismo builder sin importar la tabla consultada y hubiera roto silenciosamente con la nueva lectura; se agregaron 3 casos nuevos (Fail-Fast puro, caso límite en cero end-to-end contra el RPC, y el camino de lectura previa desactualizada) sin tocar el contrato público de la función. NX-PRD-004 ya estaba en el catálogo local (src/lib/errores/catalogo.ts) desde la estación de registrarSalidaStock, así que no requirió cambios ahí tampoco. tsc --noEmit, eslint --max-warnings 0, vitest (176/176 incluyendo los 10 nuevos/actualizados) y next build (con el guardrail postbuild de fuga de service_role, ahora auditando también CLOUDINARY_API_SECRET desde la estación anterior) pasan sin errores. Sin verificación de navegador: sin pantalla de UI en este ticket. Se hizo commit, push y se abrió el PR #28 siguiendo la instrucción permanente del usuario; el merge queda a su cargo tras el CI.

**Archivos Modificados:**
- `src/lib/dominio/stock/calcularNuevoSaldo.ts`
- `src/lib/dominio/stock/calcularNuevoSaldo.test.ts`
- `src/services/stock/registrarSalidaStock.ts`
- `src/services/stock/registrarSalidaStock.test.ts`

**Contratos y API signatures:**
- `calcularNuevoSaldo(stockActual: number, cantidad: number, tipo: TipoMovimientoStock): number — src/lib/dominio/stock/calcularNuevoSaldo.ts (lanza ErrorDeDominio('NX-PRD-004') si el resultado sería negativo)`
- `TipoMovimientoStock = 'entrada' | 'salida'`
- `registrarSalidaStock ahora hace una lectura previa de productos.stock_actual antes de invocar fn_registrar_movimiento_stock; sin cambios en su firma pública ni en EstadoRegistrarSalidaStock`


--- 

## 🎯 HU: Selección de productos en el mostrador
*Criterios de Aceptación/Descripción:*
```text
Como cajero quiero buscar y seleccionar productos en el panel de ventas para armar el carrito de una venta en curso.
```

### 📄 [✔ COMPLETADA] Componente de búsqueda y carrito en Panel de Ventas
- **Rol:** Frontend / UX Engineer
- **Componente/Ruta:** `BuscadorProductos` (app/(app)/mostrador/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
El buscador usa un nuevo Route Handler dedicado (GET /api/productos/buscar) en vez de extender GET /api/productos con un parámetro de búsqueda: son dos patrones de acceso distintos (autocomplete acotado con .limit(10) vs. listado paginado con .range()), y mezclarlos hubiera forzado al repositorio existente a decidir entre dos modos de query incompatibles en una misma función. La decisión técnica más relevante fue la sanitización del término de búsqueda antes de armar el filtro .or() de PostgREST: ese filtro usa coma/paréntesis como sintaxis propia de separación y agrupación de condiciones, así que un término de búsqueda que los contuviera rompería la consulta compuesta (sku.ilike.X,nombre.ilike.X) en vez de buscarse literalmente — se optó por descartar esos caracteres directamente (ningún SKU/nombre real los necesita) en vez de intentar un escapado con comillas, más frágil de mantener correcto con el paso del tiempo. Además se escapan %/_ (comodines de LIKE) para que buscar '50%' no matchee todo lo que empiece con 50. Se agregaron tests explícitos para ambos escapes y para el caso borde de un término que queda vacío tras sanitizarse (retorna [] sin tocar la base). El carrito se modeló como reducer puro en src/lib/dominio/ventas/ (no dentro del componente) siguiendo el mismo patrón ya establecido en el repo para lógica de negocio testeable (calcularNuevoSaldo, calcularPorcentajeUsoSku): la regla real que encapsula —nunca dejar que cantidad supere stockDisponible, tanto al agregar por primera vez como al incrementar— es lógica de negocio genuina, no solo estado de UI, y quedó cubierta con 10 casos Vitest sin necesitar testing-library (no instalado en el repo, mismo criterio que las estaciones previas de UI). BuscadorProductos.tsx es dueño del useReducer (ownership pedido explícitamente por el ticket) y delega el renderizado del carrito y del total a CarritoVenta.tsx/ResumenTotal.tsx — los tres archivos quedaron en 145/92/30 líneas, muy por debajo del límite de 500-600. El debounce se implementó con un hook genérico propio (useDebouncedValue, setTimeout+cleanup) en vez de sumar una dependencia como lodash.debounce solo para esto. No se validó stock contra la base al confirmar una cantidad (eso es NX-VTA-001, de la historia de confirmación de cobro en Sprint 6): el tope de stockDisponible acá es deliberadamente un límite de UX sobre datos de una búsqueda que puede quedar desactualizada, documentado explícitamente en el código para no leerse como una validación de venta real. Verificado en navegador real contra el proyecto Supabase real (pedro@almacendonpedro.com, 50 productos): 18 pulsaciones de teclado dispararon exactamente 1 request a /api/productos/buscar (confirmado por read_network_requests), agregar/incrementar/decrementar productos actualiza el carrito y el total ($21.203,01 sobre 3 unidades) sin recarga, los 16 botones interactivos (agregar x10, incrementar/decrementar/quitar x2 productos) midieron exactamente 44x44px por computed style, el layout a 375px no generó overflow horizontal, y recargar la página vació el carrito por completo (confirma que useReducer no persiste en ningún storage, Criterio de Aceptación 2). tsc --noEmit, eslint --max-warnings 0, vitest (200/200 incluyendo los 24 nuevos) y next build (con el guardrail postbuild) pasan sin errores. Se hizo commit, push y se abrió el PR #29 siguiendo la instrucción permanente del usuario; el merge queda a su cargo tras el CI.

**Archivos Modificados:**
- `src/app/(app)/mostrador/page.tsx`
- `src/app/(app)/mostrador/BuscadorProductos.tsx`
- `src/app/(app)/mostrador/CarritoVenta.tsx`
- `src/app/(app)/mostrador/ResumenTotal.tsx`
- `src/lib/dominio/ventas/carritoReducer.ts`
- `src/lib/dominio/ventas/carritoReducer.test.ts`
- `src/repositories/productosRepository.ts`
- `src/repositories/productosRepository.test.ts`
- `src/app/api/productos/buscar/route.ts`
- `src/app/api/productos/buscar/route.test.ts`
- `src/hooks/useDebouncedValue.ts`
- `src/hooks/useBuscarProductos.ts`
- `docs/SITEMAP.md`

**Contratos y API signatures:**
- `GET /api/productos/buscar?q=&limite= — src/app/api/productos/buscar/route.ts (401/403/500 normalizados + 200 con {productos: FilaProductoBusqueda[]})`
- `buscarProductosParaVenta(supabase, clienteId, termino, limite?): Promise<ResultadoRepositorio<FilaProductoBusqueda[]>> — src/repositories/productosRepository.ts`
- `LIMITE_BUSQUEDA_PRODUCTOS = 10, FilaProductoBusqueda`
- `useDebouncedValue<T>(valor: T, delayMs: number): T — src/hooks/useDebouncedValue.ts`
- `useBuscarProductos(termino): UseQueryResult<FilaProductoBusqueda[]> — src/hooks/useBuscarProductos.ts`
- `reducirCarrito(estado: ItemCarrito[], accion: AccionCarrito): ItemCarrito[], calcularTotalCarrito(items): number — src/lib/dominio/ventas/carritoReducer.ts`
- `ProductoParaCarrito, ItemCarrito, AccionCarrito, ESTADO_CARRITO_INICIAL`
- `<BuscadorProductos /> — src/app/(app)/mostrador/BuscadorProductos.tsx`
- `<CarritoVenta items dispatch /> — src/app/(app)/mostrador/CarritoVenta.tsx`
- `<ResumenTotal items /> — src/app/(app)/mostrador/ResumenTotal.tsx`
- `Ruta: /mostrador`


--- 

## 🎯 HU: Cálculo automático del total de la venta
*Criterios de Aceptación/Descripción:*
```text
Como cajero quiero que el sistema calcule automáticamente el total a cobrar según los productos y cantidades seleccionados para evitar errores manuales de suma.
```

### 📄 [✔ COMPLETADA] Función pura de cálculo de total de venta
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `calcularTotalVenta` (src/lib/dominio/ventas/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
calcularTotalVenta trabaja en centavos enteros (Math.round(precio*100)) antes de sumar, no en punto flotante directo: sumar decimales en JS arrastra el error de redondeo binario clásico (0.1+0.2!==0.3), y trabajar en enteros hasta el final elimina esa deriva por completo, garantizando que el resultado siempre coincida exacto con la suma de subtotales redondeados a numeric(12,2) sin importar cuántos ítems se combinen — se agregó un test que reproduce explícitamente el bug de referencia (19.99*5 en float puro da 99.94999999999999, la función da 99.95 exacto) para dejar constancia del problema que se está evitando, no solo del resultado esperado. El punto más delicado de la estación fue decidir qué significa 'consumir la función tanto en el cliente como en el servidor (validación final)' sin fabricar la historia completa de confirmación de cobro (Sprint 6, con idempotencia y descuento de stock, explícitamente otra Historia del backlog). Se resolvió con un endpoint acotado y honesto: POST /api/ventas/previsualizar recibe solo producto_id+cantidad (el esquema Zod ni siquiera admite un campo de precio en el body) y resuelve los precios reales contra la tabla productos del tenant vía el nuevo obtenerPreciosProductosPorIds — nunca confía en un precioUnitario que pudiera mandar un cliente manipulado. Esto es 'validación final' en un sentido genuino (defensa contra tampering de precios) sin necesitar construir el registro de la venta, la deducción de stock ni el control de duplicados, que quedan íntegramente para la estación de Sprint 6. Se detectó que el ticket anterior (Mostrador) ya había introducido una calcularTotalCarrito ad-hoc (suma naive en float, sin la garantía de centavos exactos) en carritoReducer.ts: se eliminó por completo en vez de dejarla coexistir con la nueva función — dos cálculos de 'total' distintos en el mismo módulo hubiera sido una fuente real de bugs de un centavo entre lo que ve el cajero y lo que valida el servidor — y se migró ResumenTotal.tsx a calcularTotalVenta mapeando ItemCarrito a VentaItem. Se verificó en navegador real contra el proyecto Supabase real que ambos caminos (preview client-side en /mostrador y POST /api/ventas/previsualizar) devuelven exactamente el mismo total ($21.203,01) para el mismo carrito, y se probó activamente el caso de tampering: un precioUnitario:0.01 falso en el body del POST fue completamente ignorado, el servidor usó el precio real de la base ($9.602,04). tsc --noEmit, eslint --max-warnings 0, vitest (223/223 incluyendo los 25 nuevos) y next build (con el guardrail postbuild) pasan sin errores. Se hizo commit, push y se abrió el PR #30 siguiendo la instrucción permanente del usuario; el merge queda a su cargo tras el CI.

**Archivos Modificados:**
- `src/lib/dominio/ventas/calcularTotalVenta.ts`
- `src/lib/dominio/ventas/calcularTotalVenta.test.ts`
- `src/lib/dominio/ventas/carritoReducer.ts`
- `src/lib/dominio/ventas/carritoReducer.test.ts`
- `src/app/(app)/mostrador/ResumenTotal.tsx`
- `src/repositories/productosRepository.ts`
- `src/repositories/productosRepository.test.ts`
- `src/app/api/ventas/previsualizar/route.ts`
- `src/app/api/ventas/previsualizar/route.test.ts`
- `docs/SITEMAP.md`

**Contratos y API signatures:**
- `calcularTotalVenta(items: VentaItem[]): number — src/lib/dominio/ventas/calcularTotalVenta.ts`
- `calcularSubtotalItem(item: VentaItem): number`
- `VentaItem { productoId, precioUnitario, cantidad }`
- `obtenerPreciosProductosPorIds(supabase, clienteId, productoIds: string[]): Promise<ResultadoRepositorio<FilaPrecioProducto[]>> — src/repositories/productosRepository.ts`
- `FilaPrecioProducto { producto_id, precio }`
- `POST /api/ventas/previsualizar — src/app/api/ventas/previsualizar/route.ts (body {items:[{productoId,cantidad}]}; 401/403/400/500 normalizados + 200 con {total, items:[{productoId,precioUnitario,cantidad,subtotal}]})`
- `calcularTotalCarrito eliminado de src/lib/dominio/ventas/carritoReducer.ts (superseded por calcularTotalVenta)`


--- 

