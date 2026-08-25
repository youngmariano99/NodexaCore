# Handoffs y Entregables del Sprint - Sprint 6: Cobro en Mostrador, Catálogo Web e Inicio de Carga con IA

**Objetivo:** Completar el flujo de venta en mostrador, habilitar la vidriera pública del Catálogo Web y comenzar el módulo de Carga con IA.
**Capacidad:** 30 Ptos | **Duración:** 2 Semanas
**Estado del Sprint:** COMPLETADO

--- 

## 🎯 HU: Confirmación de cobro con control de duplicados
*Criterios de Aceptación/Descripción:*
```text
Como cajero quiero confirmar el cobro de una venta con protección ante clics repetidos o fallas de red para que nunca se registre la misma venta dos veces.
```

### 📄 [✔ COMPLETADA] Server Action confirmarVenta con idempotency_key
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `confirmarVenta` (src/services/ventas/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
fn_confirmar_venta hace en una única transacción lo que antes hubiera requerido dos llamadas separadas desde la Server Action (insertar ventas, luego venta_items): si la segunda fallara tras crear la venta, Postgres revierte ambas, evitando una venta sin ítems. Los precios NUNCA salen del payload del cliente: se resuelven contra productos.precio real del tenant dentro del propio RPC, mismo criterio zero-trust que POST /api/ventas/previsualizar (estación anterior) — un total o precio manipulado no puede alterar lo que se persiste. El total que sí viaja en el formulario (calculado client-side con calcularTotalVenta) se usa exclusivamente como chequeo Fail-Fast (NX-VTA-003 si es negativo, antes de gastar un round-trip al RPC), nunca como el valor que se guarda. La violación del UNIQUE(idempotency_key) se atrapa con un BEGIN/EXCEPTION WHEN unique_violation dentro del RPC y se re-levanta con un SQLSTATE custom NX002 — mismo patrón exacto que NX004 en fn_registrar_movimiento_stock (estación de stock) — que la Server Action traduce a NX-VTA-002 sin duplicar nada: se verificó en vivo contra el proyecto real reenviando el mismo idempotency_key directo al RPC y confirmando que el conteo de ventas no se movió. El punto más delicado de la estación fue la integración de UI: la primera versión de ConfirmarCobro.tsx llamaba una función del padre (que a su vez hacía dispatch + setState) desde el render del propio componente hijo — un anti-patrón real de React ('actualizar el estado de un componente distinto durante el render de otro', distinto del patrón documentado de 'ajustar el propio estado durante el render' que ya usa FormularioAltaProducto.tsx). Se corrigió subiendo useActionState(confirmarVenta) y el idempotencyKey a BuscadorProductos.tsx (el dueño real de ese estado, junto con el carrito), dejando ConfirmarCobro.tsx puramente presentacional; el ajuste post-venta (vaciar carrito + generar clave nueva) ahora ocurre en el mismo componente que posee ambos estados, durante su propio render, sin useEffect. Al aplicar el seed de 300 ventas contra el proyecto real (con autorización explícita del usuario) se encontró un bug real heredado del script original de docs/SEED.md §7: asumía 4 empleados ya sembrados en los tenants A/B/C, pero verificando la tabla usuarios real se confirmó que esos tenants solo tienen sus 3 comerciantes — los empleados nunca se crearon (a diferencia de demo-nodexa, que sí tiene 3) — usar esos IDs de empleado rompía el FOREIGN KEY de ventas.usuario_id. Se corrigió fijando el usuario_id de cada venta sembrada al comerciante del tenant, se re-aplicó con éxito (300 ventas, 600 venta_items), y se actualizó docs/SEED.md §3 para que el script documentado coincida con lo realmente aplicado y no induzca a error a una estación futura. Verificado end-to-end en navegador real contra el proyecto Supabase real: botón deshabilitado con carrito vacío, alta de producto al carrito, clic en 'Confirmar cobro' con el botón deshabilitándose de inmediato, venta persistida verificada por SQL directo (total, ítems y precios exactos), mensaje 'Venta confirmada' y carrito vaciado automáticamente. get_advisors (security) sin hallazgos nuevos tras aplicar ambas migraciones. tsc --noEmit, eslint --max-warnings 0, vitest (234/234 incluyendo los 11 nuevos) y next build (con el guardrail postbuild) pasan sin errores. Se hizo commit, push y se abrió el PR #31 siguiendo la instrucción permanente del usuario; el merge queda a su cargo tras el CI.

**Archivos Modificados:**
- `src/services/ventas/confirmarVenta.ts`
- `src/services/ventas/confirmarVenta.test.ts`
- `src/services/ventas/tipos.ts`
- `src/app/(app)/mostrador/ConfirmarCobro.tsx`
- `src/app/(app)/mostrador/BuscadorProductos.tsx`
- `src/lib/errores/catalogo.ts`
- `supabase/migrations/20260810130000_fn_confirmar_venta_rpc.sql`
- `supabase/migrations/20260810140000_seed_ventas_volumetrico.sql`
- `docs/SEED.md`

**Contratos y API signatures:**
- `confirmarVenta(estadoPrevio: EstadoConfirmarVenta, formData: FormData): Promise<EstadoConfirmarVenta> — src/services/ventas/confirmarVenta.ts`
- `EstadoConfirmarVenta { error: string | null; exito: boolean; ventaId: string | null }, ESTADO_CONFIRMAR_VENTA_INICIAL`
- `SQL function public.fn_confirmar_venta(p_idempotency_key text, p_cliente_final_id uuid, p_items jsonb) returns ventas — SECURITY INVOKER, aplicada contra el proyecto real`
- `<ConfirmarCobro idempotencyKey items total carritoVacio estado estaEnviando accionFormulario /> — src/app/(app)/mostrador/ConfirmarCobro.tsx`
- `CATALOGO_ERRORES['NX-VTA-002'], ['NX-VTA-003'], ['NX-VTA-005']`
- `301 filas en ventas / ~601 en venta_items (proyecto real): 300/600 de seed ('seed-venta-N') + 1 venta real de verificación`


--- 

## 🎯 HU: Descuento automático de stock al confirmar venta
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero que al confirmarse una venta se descuente automáticamente el stock de los productos vendidos para no tener que hacerlo manualmente después.
```

### 📄 [✔ COMPLETADA] Función RPC transaccional de venta con descuento de stock
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `fn_confirmar_venta` (supabase/migrations/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Esta estación depende de fn_confirmar_venta creada en la estación anterior (mc-act-4sls, PR #31), todavía sin mergear a main: en vez de recrear confirmarVenta.ts/UI desde cero sobre main (duplicando ese trabajo), se ramificó directamente desde la rama de ese PR para producir un diff incremental limpio — el PR de esta estación (#32) queda apilado sobre el #31 y debe mergearse después de él. Como la migración 20260810130000 ya estaba aplicada contra el proyecto real, no se edita: se creó una migración nueva (20260810150000) que hace CREATE OR REPLACE FUNCTION sobre la misma firma, seteando el precedente ya usado por fn_registrar_movimiento_stock_rpc.sql al reemplazar a registrar_entrada_stock_rpc.sql en una estación previa. El bloqueo optimista pedido por el Paso 2 es el mismo patrón ya validado en el repo: un único UPDATE productos SET stock_actual = stock_actual - cantidad WHERE ... AND stock_actual >= cantidad combina lectura y escritura en una sola sentencia atómica por fila — Postgres serializa automáticamente dos UPDATE concurrentes sobre la misma fila (la segunda transacción espera el commit de la primera y recién ahí reevalúa su propio WHERE contra el valor ya actualizado), así que dos ventas simultáneas sobre stock límite nunca pueden descontar ambas si no alcanza, sin necesitar SELECT ... FOR UPDATE explícito ni una columna de versión aparte. El stock se descuenta en un loop por ítem (no en el INSERT...SELECT masivo que ya usan venta_items) porque cada UPDATE necesita evaluar su propia condición de suficiencia de forma independiente y devolver su propio saldo_resultante para el movimiento asociado — un UPDATE set-based no puede distinguir 'este ítem sí alcanza, este otro no' fila por fila con la granularidad que pide el Criterio de Aceptación 2. Cuando el UPDATE no afecta ninguna fila, la causa es inequívocamente stock insuficiente (no existencia/pertenencia de tenant, ya validada antes en la misma función con el mismo criterio de conteo que ya traía el RPC) — se levanta el SQLSTATE custom NX001, que confirmarVenta.ts traduce a NX-VTA-001; al ocurrir dentro de la misma invocación PL/pgSQL que ya insertó la venta y los venta_items, el raise exception revierte todo, cumpliendo el Criterio de Aceptación 2 sin necesitar un manejo explícito de rollback en la capa de aplicación. Se verificó en vivo contra el proyecto Supabase real: un pedido de 999 unidades sobre un producto con stock_actual=7 rechazó con NX001 y, tras el ROLLBACK de la transacción de prueba, se confirmó por SQL directo que no quedó ningún residuo (stock sin cambios, cero movimientos nuevos, cero ventas nuevas) — y una venta real de 3 unidades ejecutada desde /mostrador descontó el stock de 7 a 4 y generó el movimientos_stock correcto (tipo salida, cantidad 3, saldo_resultante 4, referencia_venta_id apuntando a la venta real), satisfaciendo literalmente el Criterio de Aceptación 4. tsc --noEmit, eslint --max-warnings 0, vitest (235/235 incluyendo el test nuevo de NX-VTA-001) y next build (con el guardrail postbuild) pasan sin errores. get_advisors (security) sin hallazgos nuevos tras aplicar la migración. Se hizo commit, push y se abrió el PR #32 contra la rama de mc-act-4sls (no contra main, para no mezclar diffs) siguiendo la instrucción permanente del usuario; el merge —primero #31, después este— queda a su cargo tras el CI.

**Archivos Modificados:**
- `supabase/migrations/20260810150000_fn_confirmar_venta_descuento_stock.sql`
- `src/services/ventas/confirmarVenta.ts`
- `src/services/ventas/confirmarVenta.test.ts`
- `src/lib/errores/catalogo.ts`

**Contratos y API signatures:**
- `SQL function public.fn_confirmar_venta(p_idempotency_key text, p_cliente_final_id uuid, p_items jsonb) returns ventas — CREATE OR REPLACE sobre la migración previa, ahora también descuenta productos.stock_actual (bloqueo optimista) e inserta movimientos_stock (tipo salida, referencia_venta_id) por cada ítem, aplicada contra el proyecto real`
- `confirmarVenta ahora también retorna NX-VTA-001 cuando el RPC reporta stock insuficiente (SQLSTATE custom NX001)`
- `CATALOGO_ERRORES['NX-VTA-001']`


--- 

## 🎯 HU: Publicación y despublicación de productos
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero publicar o despublicar productos individuales de mi vidriera para controlar qué artículos ve el público en cada momento.
```

### 📄 [✔ COMPLETADA] Server Action alternarPublicacionProducto
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `alternarPublicacionProducto` (src/services/catalogoWeb/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
El hallazgo más relevante de la estación fue releer la matriz de permisos de docs/ROLES.md §2 en vez de copiar el gate de rol ya usado en actualizarProducto.ts: la fila 'productos — publicar/despublicar' otorga M exclusivamente a comerciante, a diferencia de 'productos — alta/edición/baja' que sí permite empleado. Se documentó explícitamente por qué este chequeo de rol en la Server Action no es defensa en profundidad opcional acá: la política RLS productos_update_tenant no distingue qué columna cambia un UPDATE (empleado puede actualizar productos mientras eliminado_en sea NULL), así que sin este chequeo de aplicación un empleado podría publicar/despublicar en silencio — mismo patrón de restricción a nivel de aplicación ya usado para clientes_finales.saldo_deudor. La asimetría entre publicar y despublicar es la segunda decisión central: solo publicar (publicado: true) exige el módulo catalogo_web activo (NX-WEB-001, cubriendo tanto el caso 'módulo desactivado' como 'el tenant nunca lo contrató', sin fila en tenant_modules — se testearon ambos) y los tres campos completos (NX-WEB-002); despublicar nunca valida ninguna de las dos cosas, porque sacar un producto de la vidriera pública nunca debería poder bloquearse por un estado inconsistente del producto o del plan del tenant — se agregó un test explícito confirmando que un producto incompleto y sin módulo activo igual se puede despublicar. Para 'sin precio' se interpretó precio > 0 en vez de un chequeo de nulidad: precio es NOT NULL con CHECK >= 0 en el esquema, así que 'sin precio' nunca podría dispararse con una comprobación de nulidad — un ítem a $0 no es razonablemente publicable en una vidriera pública, y esa es la lectura de negocio que sí puede fallar en la práctica. Se reutilizó verificarPertenenciaTenant (ya extendido a 'productos' en la estación de edición) como guard IDOR/BOLA y registrarDiff para la auditoría del campo publicado, sin construir ningún mecanismo nuevo. La vidriera pública (/c/[clienteSlug]) ya filtra publicado = true AND eliminado_en IS NULL vía la política RLS productos_lectura_publica existente desde la migración de RLS multi-tenant, así que los Criterios de Aceptación 3 y 4 (aparece/desaparece de la vidriera) quedan satisfechos automáticamente por el UPDATE de este archivo, sin código adicional ni cambios de schema. Sin verificación de navegador: no existe todavía ninguna pantalla de edición de producto (/productos/[productoId] sigue siendo una estación futura según docs/SITEMAP.md) que invoque esta Server Action, mismo criterio ya usado por actualizarProducto.ts y eliminarProducto.ts en sus propias estaciones. tsc --noEmit, eslint --max-warnings 0, vitest (246/246 incluyendo los 12 nuevos) y next build (con el guardrail postbuild) pasan sin errores. Se hizo commit, push y se abrió el PR #33 contra main siguiendo la instrucción permanente del usuario; el merge queda a su cargo tras el CI.

**Archivos Modificados:**
- `src/services/catalogoWeb/alternarPublicacionProducto.ts`
- `src/services/catalogoWeb/alternarPublicacionProducto.test.ts`
- `src/services/catalogoWeb/tipos.ts`
- `src/lib/errores/catalogo.ts`

**Contratos y API signatures:**
- `alternarPublicacionProducto(productoId: string, estadoPrevio: EstadoAlternarPublicacionProducto, formData: FormData): Promise<EstadoAlternarPublicacionProducto> — src/services/catalogoWeb/alternarPublicacionProducto.ts`
- `EstadoAlternarPublicacionProducto { error: string | null; exito: boolean }, ESTADO_ALTERNAR_PUBLICACION_PRODUCTO_INICIAL — src/services/catalogoWeb/tipos.ts`
- `CATALOGO_ERRORES['NX-WEB-001'], ['NX-WEB-002']`


--- 

## 🎯 HU: Personalización visual de la vidriera
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero personalizar el logo y los colores de mi vidriera dentro de los parámetros del sistema de diseño para reflejar la identidad de mi negocio.
```

### 📄 [✔ COMPLETADA] Server Action actualizarIdentidadVisual
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `actualizarIdentidadVisual` (src/services/catalogoWeb/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
El hallazgo central de la estación fue que docs/SCHEMA.md ya documentaba (desde la migración inicial de RLS) que 'el comerciante actualiza únicamente campos de personalización... vía Server Action con columnas explícitas, nunca UPDATE directo de fila completa desde el cliente', pero no existía ninguna política RLS de UPDATE para comerciante sobre clientes (solo clientes_update_admin, exclusiva de admin_nodexa) — verificado leyendo la migración real antes de escribir código. Sumar una política RLS genérica 'comerciante puede actualizar su propia fila' habría resuelto el aislamiento de tenant pero no el aislamiento de columna: RLS filtra filas, no columnas, así que esa política hubiera dejado estado_pago/limite_sku/packs_sku_contratados (reservados a admin_nodexa por docs/ROLES.md §2) editables por cualquier comerciante que llamara a PostgREST directo, sin pasar por la Server Action. Se descartó también usar el cliente service_role (patrón que sí usa crearCliente.ts para el INSERT de clientes): docs/ROLES.md §3.9 restringe explícitamente su uso a 'jobs asíncronos de auditoría' y 'procesos administrativos de admin_nodexa', prohibiéndolo textualmente para 'cualquier ejecución iniciada desde el navegador del cliente' — que es exactamente este caso (un comerciante guardando su propia personalización). La solución fue un RPC SECURITY DEFINER nuevo, mismo patrón arquitectónico ya usado dos veces en el repo (fn_registrar_movimiento_stock, fn_confirmar_venta) pero por primera vez con SECURITY DEFINER en vez de INVOKER: el UPDATE interno de la función menciona literalmente solo logo_url/color_primario en su texto SQL, así que no hay forma de que la función toque otra columna aunque un atacante lograra invocarla con otros argumentos, y la función no acepta ningún cliente_id como parámetro — siempre resuelve auth_cliente_id() de la sesión — por lo que la modificación cruzada de tenant no es un caso que se 'rechace' en tiempo de ejecución, es un input que la función ni siquiera puede recibir (Criterio de Aceptación 4 satisfecho estructuralmente). Al aplicar la migración, get_advisors marcó dos WARN esperables de cualquier función SECURITY DEFINER expuesta vía RPC (ejecutable por anon y por authenticated); se corrigió el de anon con una segunda migración (REVOKE/GRANT explícito, ya que la lógica interna de la función igual rechazaba esas llamadas pero reducir la superficie de privilegios de Postgres es la corrección correcta en vez de confiar solo en el chequeo interno) y se dejó documentado por qué el WARN de authenticated es esperado y no requiere acción (es precisely quién debe poder invocarla). La validación de color (Paso 2) se implementó como z.enum contra una paleta cerrada de 14 tonos Tailwind-500 que excluye explícitamente la familia púrpura completa (violet, purple, indigo, y también fuchsia por pertenecer a la misma familia visual aunque no esté nombrada literalmente en la Directriz de Negación) — un valor fuera de esa lista cae en el NX-SYS-006 genérico ya establecido para fallos de Zod en todo el repo, sin inventar un código nuevo. Se detectó y corrigió durante la verificación en navegador un bug real de Next.js: un archivo con 'use server' solo puede exportar funciones async (Server Actions) — la primera versión exportaba también la constante COLORES_PRIMARIOS_PERMITIDOS desde actualizarIdentidadVisual.ts, que el formulario cliente importaba directamente, y en el bundle de cliente esa constante llegaba como algo distinto a un array (.map is not a function); se resolvió moviendo la constante a su propio módulo sin 'use server' (coloresPrimariosPermitidos.ts), importado tanto por la Server Action como por el componente cliente. Verificado end-to-end en navegador real contra el proyecto Supabase real: un comerciante actualizó su logo_url y color_primario, persistidos correctamente y confirmados por SQL directo sin ningún cambio en estado_pago/limite_sku de esa misma fila; los 14 swatches de color midieron exactamente 44x44px por computed style; un empleado que intentó acceder a /catalogo-web/personalizacion fue redirigido a /dashboard por el gate de rol de la página. tsc --noEmit, eslint --max-warnings 0, vitest (259/259 incluyendo los 13 nuevos) y next build (con el guardrail postbuild) pasan sin errores. Se hizo commit, push y se abrió el PR #34 siguiendo la instrucción permanente del usuario; el merge queda a su cargo tras el CI.

**Archivos Modificados:**
- `src/services/catalogoWeb/actualizarIdentidadVisual.ts`
- `src/services/catalogoWeb/actualizarIdentidadVisual.test.ts`
- `src/services/catalogoWeb/coloresPrimariosPermitidos.ts`
- `src/services/catalogoWeb/tipos.ts`
- `src/app/(app)/catalogo-web/personalizacion/page.tsx`
- `src/app/(app)/catalogo-web/personalizacion/FormularioIdentidadVisual.tsx`
- `supabase/migrations/20260810160000_fn_actualizar_identidad_visual_rpc.sql`
- `supabase/migrations/20260810161000_restringir_ejecucion_fn_actualizar_identidad_visual.sql`

**Contratos y API signatures:**
- `actualizarIdentidadVisual(estadoPrevio: EstadoActualizarIdentidadVisual, formData: FormData): Promise<EstadoActualizarIdentidadVisual> — src/services/catalogoWeb/actualizarIdentidadVisual.ts`
- `EstadoActualizarIdentidadVisual { error: string | null; exito: boolean }, ESTADO_ACTUALIZAR_IDENTIDAD_VISUAL_INICIAL — src/services/catalogoWeb/tipos.ts`
- `COLORES_PRIMARIOS_PERMITIDOS: readonly string[] (14 hex Tailwind-500, excluye púrpura/violeta/índigo/fuchsia) — src/services/catalogoWeb/coloresPrimariosPermitidos.ts`
- `SQL function public.fn_actualizar_identidad_visual(p_logo_url text, p_color_primario text) returns clientes — SECURITY DEFINER, EXECUTE restringido a authenticated, aplicada contra el proyecto real`
- `<FormularioIdentidadVisual logoUrlActual colorPrimarioActual /> — src/app/(app)/catalogo-web/personalizacion/FormularioIdentidadVisual.tsx`
- `Ruta: /catalogo-web/personalizacion`


--- 

## 🎯 HU: Consulta pública del catálogo sin autenticación
*Criterios de Aceptación/Descripción:*
```text
Como cliente final quiero navegar el catálogo publicado de un comercio sin necesidad de crear una cuenta para ver rápidamente los productos disponibles.
```

### 📄 [✔ COMPLETADA] Página estática con ISR de vidriera pública
- **Rol:** Frontend / UX Engineer
- **Componente/Ruta:** `VidrieraPublica` (app/(publico)/c/[clienteSlug]/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
El hallazgo central de la estación, detectado antes de escribir código al releer la migración RLS real: clientes_select solo permite cliente_id = auth_cliente_id() OR es_admin_nodexa() — un visitante anónimo (cliente_final, sin sesión) no cumple ninguna de las dos condiciones, así que la vidriera pública no podía resolver clienteSlug -> cliente_id en absoluto, aunque productos_lectura_publica ya existiera para productos. Se agregó clientes_lectura_publica siguiendo exactamente el mismo patrón que esa política de productos (política permisiva adicional que Postgres combina con OR sobre el mismo comando), filtrando estado_pago = true AND eliminado_en IS NULL — un comercio suspendido no es resoluble por slug desde afuera. La página no distingue 'el slug no existe' de 'el comercio está suspendido': ambos casos simplemente no devuelven fila y disparan notFound() con el mismo NX-WEB-004, mismo criterio de no filtrar existencia de recursos ya usado por verificarPertenenciaTenant (docs/ROLES.md §3.8) — se documentó explícitamente esta decisión porque es la misma filosofía de seguridad aplicada a un contexto nuevo (público en vez de multi-tenant autenticado). Un segundo detalle no trivial: productos_lectura_publica está deliberadamente scopeada solo por fila pública (publicado=true AND eliminado_en IS NULL), sin ningún filtro de tenant — sin agregar cliente_id explícito en la query del repositorio, la vidriera de cualquier comercio hubiera mostrado el catálogo publicado de TODOS los comercios mezclados; se verificó esto leyendo la política real antes de escribir la consulta, no se asumió. El repositorio obtenerClientePublicoPorSlug selecciona explícitamente solo columnas seguras para exponer (nunca packs_sku_contratados, ia_consultas_usadas ni otras columnas administrativas), documentado como defensa en profundidad ya que RLS filtra filas, no columnas. Los Pasos 1 y 3 del checklist (ISR + caché de Edge) no requirieron código nuevo: revalidate=60 ya estaba en el placeholder heredado del Sprint 1, y vercel.json ya traía los headers Cache-Control (s-maxage=60, stale-while-revalidate=300) para exactamente esta ruta dinámica desde la estación de configuración de Vercel — se verificó que ambos siguen vigentes y se documentó la relación entre ambos mecanismos en el comentario de la página en vez de asumirla implícita. Se corrigió también un bug menor heredado del placeholder: RegistradorVistaVidriera recibía clienteSlug como clienteId (dato incorrecto para analítica), ahora recibe el cliente_id real resuelto por la consulta. La paginación server-rendered reutiliza el mismo criterio de desempate por producto_id ya documentado y verificado en obtenerProductosPaginados (varias filas de un mismo lote de seed comparten creado_en literal). Verificado end-to-end en navegador real contra el proyecto Supabase real: la vidriera de Almacén Don Pedro mostró exactamente 16 productos (verificado contra la regla de seed n%3=0 sobre 50 productos, coincide exacto); un slug inexistente devolvió HTTP 404 real (confirmado por read_network_requests) con el mensaje NX-WEB-004; la vidriera de Ferretería El Tornillo (910 productos, ~455 publicados) paginó en 19 páginas sin ningún producto repetido entre la página 1 y 2. No se pudo forzar en vivo el caso de comercio suspendido (un UPDATE estado_pago=false sobre datos de seed compartidos fue bloqueado por el clasificador de seguridad de la sesión, correctamente): ese camino queda cubierto por el test unitario del repositorio, que verifica que el filtro .eq('estado_pago', true) se aplica siempre, y por construcción de la query es imposible que una fila con estado_pago=false la matchee. tsc --noEmit, eslint --max-warnings 0, vitest (267/267 incluyendo los 8 nuevos) y next build (con el guardrail postbuild) pasan sin errores. Se hizo commit, push y se abrió el PR #35 siguiendo la instrucción permanente del usuario; el merge queda a su cargo tras el CI.

**Archivos Modificados:**
- `src/app/(publico)/c/[clienteSlug]/page.tsx`
- `src/app/(publico)/c/[clienteSlug]/not-found.tsx`
- `src/repositories/clientes.ts`
- `src/repositories/clientes.test.ts`
- `src/repositories/productosRepository.ts`
- `src/repositories/productosRepository.test.ts`
- `src/lib/errores/catalogo.ts`
- `supabase/migrations/20260810170000_clientes_lectura_publica_rls.sql`

**Contratos y API signatures:**
- `obtenerClientePublicoPorSlug(supabase, clienteSlug): Promise<ResultadoRepositorio<FilaClientePublico>> — src/repositories/clientes.ts`
- `FilaClientePublico { cliente_id, nombre_comercio, slug, logo_url, color_primario, telefono_whatsapp }`
- `obtenerProductosPublicadosPaginados(supabase, clienteId, pagina, porPagina?): Promise<ResultadoRepositorio<ResultadoProductosPublicosPaginados>> — src/repositories/productosRepository.ts`
- `PRODUCTOS_PUBLICOS_POR_PAGINA = 24, FilaProductoPublico`
- `Ruta: /c/[clienteSlug] (regenerada vía revalidate=60), not-found.tsx propio del segmento`
- `SQL policy clientes_lectura_publica ON clientes FOR SELECT USING (estado_pago = true AND eliminado_en IS NULL) — coexiste con clientes_select vía OR, aplicada contra el proyecto real`
- `CATALOGO_ERRORES['NX-WEB-004']`


--- 

## 🎯 HU: Enlace directo a WhatsApp desde ficha de producto
*Criterios de Aceptación/Descripción:*
```text
Como cliente final quiero iniciar una consulta por WhatsApp directamente desde la ficha de un producto para pedir información o realizar el pedido sin pasos adicionales.
```

### 📄 [✔ COMPLETADA] Componente de CTA WhatsApp en ficha de producto
- **Rol:** Frontend / UX Engineer
- **Componente/Ruta:** `CtaWhatsapp` (app/(publico)/c/[clienteSlug]/producto/[productoId]/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se reescribió la ficha de producto pública (app/(publico)/c/[clienteSlug]/producto/[productoId]/page.tsx) para resolver el cliente vía obtenerClientePublicoPorSlug y el producto vía la nueva función de repositorio obtenerProductoPublicoPorId (filtra producto_id + cliente_id + publicado=true + eliminado_en IS NULL, colapsando 'no existe'/'no publicado'/'otro tenant' en NX-WEB-004 vía notFound(), mismo criterio que verificarPertenenciaTenant). El enlace wa.me se construye con el telefono_whatsapp real del comercio y el nombre real del producto pre-cargado en el mensaje (Paso 2). El CTA solo se renderiza si telefono_whatsapp es truthy; si no, se muestra un mensaje informativo sin código de ERRORS.md (no aplica ninguno del catálogo). BotonWhatsappCta se restyled al tema claro del storefront (bg-emerald-500, coherente con el color 'Éxito' de DESIGN.md y la asociación semántica con WhatsApp) con min-h-11 min-w-11 explícito para el área táctil mínima de 44x44px (Paso 3), reemplazando las clases dark-mode heredadas del template de Next.js. El evento clic_whatsapp (Paso 4) ya existía desde Sprint 1 vía registrarClicWhatsapp -> Nave Nodriza (sustituto explícito de PostHog por decisión previa del usuario), ya incluye cliente_id como propiedad; el fix real fue pasarle el cliente_id real (antes se pasaba el slug por error). Se agregaron 4 tests nuevos para obtenerProductoPublicoPorId siguiendo el patrón de mock chainable ya usado en el archivo (crearBuilderDetalle con maybeSingle). Verificado en navegador contra el proyecto Supabase real: ficha de un producto publicado de 'Bazar Casa Sur' renderiza datos reales, el href de wa.me contiene el teléfono y el nombre del producto codificado, el botón mide 44px de alto (cumple el mínimo), y un producto_id inexistente devuelve la página 404 con NX-WEB-004. tsc --noEmit, eslint --max-warnings 0, vitest run (271/271), next build y el script de fuga de env de cliente pasan sin errores. Commit, push y PR #36 (base main) ya realizados.

**Archivos Modificados:**
- `src/app/(publico)/c/[clienteSlug]/producto/[productoId]/page.tsx`
- `src/components/analytics/boton-whatsapp-cta.tsx`
- `src/repositories/productosRepository.ts`
- `src/repositories/productosRepository.test.ts`

**Contratos y API signatures:**
- `obtenerProductoPublicoPorId(supabase: SupabaseClient, clienteId: string, productoId: string): Promise<ResultadoRepositorio<FilaProductoPublico>>`
- `BotonWhatsappCta(props: { clienteId: string; productoId: string; productoNombre: string; precio?: number; numeroWhatsapp: string; mensaje?: string; className?: string }): JSX.Element`


--- 

## 🎯 HU: Alta de producto por foto de etiqueta
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero subir una foto de la etiqueta de un producto para que la IA autocomplete nombre, precio y categoría y así agilizar la carga de catálogo.
```

### 📄 [✔ COMPLETADA] Route Handler de procesamiento de imagen con OpenAI Vision
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `procesarCargaIa` (app/api/carga-ia/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Route Handler POST /api/carga-ia implementa el Paso 1-4 del checklist: rate limiting por comercio (5/min, @upstash/ratelimit, mismo patrón que authLimiter), extracción con OpenAI gpt-4o-mini Vision vía fetch directo (sin agregar el SDK oficial como dependencia, usando response_format json_schema con strict:true + revalidación Zod como defensa en profundidad — Paso 3), y registro en cargas_ia con resultado_extraido en jsonb (Paso 4). Los guards están ordenados de más barato a más caro: sesión -> rol/tenant -> rate limit -> formato de archivo (NX-IA-004) -> módulo carga_ia activo vía tenant_modules (NX-IA-001) -> cuota mensual (NX-IA-002) -> Cloudinary (NX-PRD-005, reutilizando subirImagenComoWebp existente) -> extracción OpenAI (NX-IA-003). La cuota mensual se consume ANTES de gastar en Cloudinary/OpenAI (fail-fast) vía un RPC atómico nuevo, fn_registrar_consumo_ia, que resetea ia_periodo_actual/ia_consultas_usadas al cambiar de mes y evita condiciones de carrera (mismo criterio que fn_registrar_movimiento_stock: el chequeo de cupo vive en la cláusula WHERE del UPDATE). Hallazgo real durante la verificación en navegador contra el proyecto Supabase real (sesión de marta@ferreteriaeltornillo.com): el diseño inicial del RPC (SECURITY INVOKER) fallaba porque la tabla clientes no tiene ninguna política RLS de UPDATE para comerciante/empleado (solo clientes_update_admin) — el UPDATE afectaba 0 filas y el código lo interpretaba erróneamente como 'cuota agotada' (NX-IA-002) aunque hubiera cupo real (34/40). Se corrigió a SECURITY DEFINER con un UPDATE que menciona literalmente solo ia_consultas_usadas/ia_periodo_actual (nunca estado_pago/limite_sku), más un chequeo de auth_rol() interno y revoke/grant de EXECUTE acotado a authenticated — mismo patrón ya establecido por fn_actualizar_identidad_visual/su migración de restricción. Verificado en vivo: el cupo pasó de 34 a 35 correctamente tras la corrección; la subida a Cloudinary falla con NX-PRD-005 por credenciales placeholder del entorno local (limitación de entorno preexistente, no un bug de esta estación). Se agregó OPENAI_API_KEY al esquema de entorno server-only (obligatoria, mismo criterio que Cloudinary/Upstash), a .env.example, a ci.yml (placeholder) y al script de auditoría de fugas de env de cliente. Se sembraron 34 filas de cargas_ia para Ferretería El Tornillo (único tenant con carga_ia activo) vinculadas a los productos ya marcados origen_alta='ia_vision' del seed volumétrico previo, dejando ia_consultas_usadas=34 sobre cuota_mensual_ia=40 (85%) para probar el aviso de cuota cercana al límite; el contador es un campo propio de clientes, no derivado de un COUNT(*) sobre cargas_ia. 25 tests nuevos (repositorio, rate limiter, extracción OpenAI con mocks de fetch, y el route handler completo cubriendo cada código de error). tsc --noEmit, eslint --max-warnings 0, vitest (303/303), next build y el script de fuga de env pasan sin errores; get_advisors (security) sin hallazgos nuevos tras aplicar las migraciones contra el proyecto real.

**Archivos Modificados:**
- `src/app/api/carga-ia/route.ts`
- `src/app/api/carga-ia/route.test.ts`
- `src/lib/openai/extraerDatosEtiqueta.ts`
- `src/lib/openai/extraerDatosEtiqueta.test.ts`
- `src/lib/rate-limit/cargaIaLimiter.ts`
- `src/lib/rate-limit/cargaIaLimiter.test.ts`
- `src/repositories/cargasIaRepository.ts`
- `src/repositories/cargasIaRepository.test.ts`
- `src/lib/env.ts`
- `src/lib/errores/catalogo.ts`
- `.env.example`
- `.github/workflows/ci.yml`
- `scripts/verificar-fugas-env-cliente.ts`
- `supabase/migrations/20260811100000_fn_registrar_consumo_ia_rpc.sql`
- `supabase/migrations/20260811110000_seed_cargas_ia_volumetrico.sql`

**Contratos y API signatures:**
- `POST /api/carga-ia (multipart: campo 'imagen') -> { cargaIaId, nombre, precio, categoria, imagenUrl } | { codigo, mensaje, ...detalle }`
- `extraerDatosEtiqueta(imagenUrl: string): Promise<ResultadoRepositorio<DatosExtraidosEtiqueta>>`
- `registrarConsumoIa(supabase: SupabaseClient): Promise<ResultadoRepositorio<null>>`
- `registrarCargaIa(supabase: SupabaseClient, datos: DatosNuevaCargaIa): Promise<ResultadoRepositorio<FilaCargaIa>>`
- `verificarCargaIaLimiter(clienteId: string): Promise<ResultadoCargaIaLimiter>`
- `fn_registrar_consumo_ia() RPC (Postgres, SECURITY DEFINER) -> clientes`


--- 

