# Handoffs y Entregables del Sprint - Sprint 3: Onboarding de Comercios y Trazabilidad Base

**Objetivo:** Habilitar el alta comercial de comercios por el Administrador NODEXA y dejar lista la capa transversal de auditoría y manejo de errores antes de construir funcionalidades de negocio.
**Capacidad:** 30 Ptos | **Duración:** 2 Semanas
**Estado del Sprint:** COMPLETADO

--- 

## 🎯 HU: Alta de nuevo comercio por el Administrador NODEXA
*Criterios de Aceptación/Descripción:*
```text
Como administrador NODEXA quiero crear el registro de un nuevo cliente con su cliente_id único para iniciar formalmente el onboarding de un comercio.
```

### 📄 [✔ COMPLETADA] Server Action de alta comercial de cliente
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `crearCliente` (src/services/admin/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
crearCliente sigue la matriz de ROLES.md §2 (clientes: alta exclusiva de admin_nodexa) con chequeo de rol contra la tabla usuarios como defensa (aquí es la única barrera posible: docs/ROLES.md §3.6 no define política RLS de INSERT sobre clientes, solo SELECT/UPDATE, así que el INSERT usa el cliente service_role, uso explícitamente habilitado para 'alta de clientes' por ROLES.md §3.9). estado_pago=true y limite_sku=1000 se setean explícitos en el insert (coinciden con los DEFAULT de SCHEMA.md, pero se declaran igual para que el criterio de aceptación sea verificable sin depender de defaults implícitos de la columna). El slug duplicado no se pre-chequea con un SELECT (evita una ventana de carrera TOCTOU): se deja que el UNIQUE constraint de la tabla falle y se mapea el código de error de Postgres 23505 a NX-ADM-001 — ya definido en docs/ERRORS.md, no se inventó. Igual que en crearUsuario.ts, la auditoría se registra vía after() con registrarDiffAuditoria ya existente; como admin_nodexa tiene cliente_id NULL (auditoria_diffs.cliente_id es NOT NULL), el diff usa el cliente_id del comercio recién creado (el registro afectado), no el del admin solicitante — consistente con que auditoria_diffs es de lectura global para admin_nodexa (ROLES.md §2). Se agregó test unitario (TDD, mockeando ambos clientes Supabase) cubriendo los 4 criterios de aceptación más el caso de violación de unicidad. La migración de seed (3 clientes de docs/SEED.md §1-2: bajo uso / ~90% umbral / sobre-límite) quedó escrita pero SIN aplicar contra el proyecto Supabase real, siguiendo el mismo criterio que la estación de creación de usuarios empleados: es una escritura sobre infraestructura compartida y requiere confirmación explícita tuya antes de aplicarla vía MCP o que la corras manualmente. tsc --noEmit, eslint --max-warnings 0, vitest (39/39 incluyendo los 5 nuevos) y next build (con el guardrail postbuild de fuga de service_role) pasan sin errores. No se hizo commit ni push: los archivos quedaron en el working tree de la rama feature/mc-act-wpkp-server-action-de-alta-comercial-de-cliente para que decidas el mensaje de commit.

**Archivos Modificados:**
- `src/services/admin/crearCliente.ts`
- `src/services/admin/tipos.ts`
- `src/services/admin/crearCliente.test.ts`
- `src/lib/errores/catalogo.ts`
- `supabase/migrations/20260809140000_seed_clientes_volumetrico.sql`

**Contratos y API signatures:**
- `crearCliente(estadoPrevio: EstadoCrearCliente, formData: FormData): Promise<EstadoCrearCliente> — src/services/admin/crearCliente.ts`
- `EstadoCrearCliente { error: string | null; exito: boolean }, ESTADO_CREAR_CLIENTE_INICIAL — src/services/admin/tipos.ts`
- `CATALOGO_ERRORES['NX-ADM-001']`
- `Migración seed_clientes_volumetrico: 3 clientes (a1111111.../b2222222.../c3333333..., mismos UUID que docs/SEED.md) — NO aplicada aún contra el proyecto real, pendiente de confirmación`


--- 

## 🎯 HU: Activación de módulos contratados en el alta
*Criterios de Aceptación/Descripción:*
```text
Como administrador NODEXA quiero activar los módulos contratados mediante tenant_modules al momento del alta para que el comercio disponga de las funcionalidades pagas desde el primer día.
```

### 📄 [✔ COMPLETADA] Server Action de activación de tenant_modules en onboarding
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `activarModulosIniciales` (src/services/admin/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
activarModulosIniciales usa ResultadoRepositorio<T> en vez del patrón EstadoX de las Server Actions ligadas a formularios (crearUsuario/crearCliente), porque su firma recibe cliente_id + arreglo tipado directamente, no FormData — no hay useActionState involucrado. A diferencia de clientes, la tabla tenant_modules sí tiene política RLS de INSERT (tenant_modules_insert_admin, WITH CHECK es_admin_nodexa()), así que el insert corre con el cliente de sesión (RLS), no con service_role — se verificó contra la migración init_enums_y_tablas_core.sql antes de decidir esto. El paso 2 del checklist (respetar UNIQUE(cliente_id, modulo) sin romper la operación) se resolvió con upsert(..., { onConflict: 'cliente_id,modulo', ignoreDuplicates: true }) en vez de un INSERT simple envuelto en try/catch de 23505: ignoreDuplicates genera un INSERT ... ON CONFLICT DO NOTHING real, evitando además pisar accidentalmente activado_en o un activo=false que el comerciante haya seteado manualmente después del alta (un upsert con merge sí lo pisaría). El arreglo de módulos de entrada se deduplica antes de armar el payload para no enviar filas repetidas a la misma query. El paso 4 (el Core sigue funcionando con un módulo desactivado) no requirió código nuevo: no existe en el repo ninguna lectura de productos/ventas/mostrador condicionada a tenant_modules, así que el desacoplamiento se sostiene por ausencia de dependencia — se documentó explícitamente en el comentario del archivo en vez de inventar un chequeo que no tiene contraparte funcional todavía. El diff de auditoría usa el cliente_id del tenant activado (no el del admin, que es NULL) y usuario_id del admin solicitante, igual que en crearCliente.ts de la estación anterior. La migración de seed (9 filas de docs/SEED.md §1-3, mismos cliente_id que la siembra de clientes ya escrita) quedó sin aplicar contra el proyecto real por el mismo criterio de infraestructura compartida. tsc --noEmit, eslint --max-warnings 0, vitest (46/46 incluyendo los 7 nuevos) y next build (con el guardrail postbuild de fuga de service_role) pasan sin errores.

**Archivos Modificados:**
- `src/services/admin/activarModulosIniciales.ts`
- `src/services/admin/activarModulosIniciales.test.ts`
- `src/services/admin/tipos.ts`
- `supabase/migrations/20260809150000_seed_tenant_modules_volumetrico.sql`

**Contratos y API signatures:**
- `activarModulosIniciales(clienteId: string, modulos: ModuloNodexa[]): Promise<ResultadoRepositorio<{ modulosActivados: ModuloNodexa[] }>> — src/services/admin/activarModulosIniciales.ts`
- `ModuloNodexa = 'catalogo_web' | 'carga_ia' | 'fiados' | 'devoluciones' | 'bot_whatsapp', MODULOS_NODEXA — src/services/admin/tipos.ts`
- `Migración seed_tenant_modules_volumetrico: 9 filas de tenant_modules sobre los 3 tenants de docs/SEED.md — NO aplicada aún contra el proyecto real, pendiente de confirmación`


--- 

## 🎯 HU: Ampliación del límite de SKU contratado
*Criterios de Aceptación/Descripción:*
```text
Como administrador NODEXA quiero modificar el limite_sku de un comercio tras una ampliación confirmada para reflejar el nuevo tope de catálogo acordado.
```

### 📄 [✔ COMPLETADA] Server Action de ampliación de limite_sku
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `ampliarLimiteSku` (src/services/admin/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
ampliarLimiteSku sigue el patrón de activarModulosIniciales (ResultadoRepositorio<T>, no EstadoX de formulario) porque recibe cliente_id + valor tipado directo. El UPDATE corre con el cliente de sesión porque clientes_update_admin ya autoriza es_admin_nodexa() sobre limite_sku, sin necesitar service_role (a diferencia del INSERT de crearCliente.ts, que sí carece de política RLS). NX-ADM-003 se valida comparando contra un COUNT dinámico sobre productos (cliente_id + eliminado_en IS NULL, mismo criterio que el índice idx_productos_cliente_activos de docs/SCHEMA.md), fuera del esquema Zod porque Zod no puede conocer un valor que depende de otra tabla en el momento de la llamada — se documentó explícitamente esta decisión en el comentario del archivo para que no se lea como un descuido del checklist ('Validar con Zod'). El hallazgo más relevante de la estación: el Paso 4 ('sumar el valor del pack al próximo período de facturación') no tiene ninguna entidad de respaldo en docs/SCHEMA.md — no existe tabla de planes, precios ni abono base, solo estado_pago (booleano) en clientes. En vez de inventar una tabla de facturación completa (fuera del alcance de este ticket) o ignorar el criterio de aceptación, se agregó la columna mínima packs_sku_contratados (contador, no monto) que persiste evidencia de cada pack contratado — msu valor es 1 pack = 1000 SKU adicionales, constante derivada de docs/SEED.md (Bazar Casa Sur: limite_sku=2000 = 1000 base + 1 pack) y de NX-PRD-001 ('Pack de Catálogo Extendido'). Los packs solo se suman ante un aumento real del límite (nunca se restan en una reducción, que se asume gestionada por un flujo de cancelación aparte, fuera de alcance). Esto es un cambio de esquema (ALTER TABLE), documentado en docs/SCHEMA.md y con backfill a 1 para el tenant ya seedeado con limite_sku=2000 — igual que las migraciones de datos de estaciones previas, quedó escrita pero SIN aplicar contra el proyecto real, pendiente de tu confirmación por ser una alteración sobre infraestructura compartida. Se agregó test unitario (TDD) cubriendo los 4 criterios de aceptación más el caso de cliente inexistente y el caso de reducción sin sumar packs. tsc --noEmit, eslint --max-warnings 0, vitest (54/54 incluyendo los 8 nuevos) y next build (con el guardrail postbuild de fuga de service_role) pasan sin errores. Se hizo commit, push y se abrió el PR #12 siguiendo la instrucción permanente del usuario; el merge queda a su cargo tras el CI.

**Archivos Modificados:**
- `src/services/admin/ampliarLimiteSku.ts`
- `src/services/admin/ampliarLimiteSku.test.ts`
- `src/lib/errores/catalogo.ts`
- `docs/SCHEMA.md`
- `supabase/migrations/20260809160000_add_packs_sku_contratados_a_clientes.sql`

**Contratos y API signatures:**
- `ampliarLimiteSku(clienteId: string, nuevoLimiteSku: number): Promise<ResultadoRepositorio<{ limiteSku: number; packsSkuContratados: number; packsAgregados: number }>> — src/services/admin/ampliarLimiteSku.ts`
- `CATALOGO_ERRORES['NX-SYS-004'], CATALOGO_ERRORES['NX-ADM-003']`
- `clientes.packs_sku_contratados integer NOT NULL DEFAULT 0 CHECK >= 0 — nueva columna, docs/SCHEMA.md §2`
- `Migración add_packs_sku_contratados_a_clientes — NO aplicada aún contra el proyecto real, pendiente de confirmación`


--- 

## 🎯 HU: Panel de listado y detalle de comercios
*Criterios de Aceptación/Descripción:*
```text
Como administrador NODEXA quiero consultar el listado de comercios dados de alta con su estado_pago y módulos activos para tener visibilidad general de la cartera de clientes.
```

### 📄 [✔ COMPLETADA] Vista paginada de comercios en /admin/clientes
- **Rol:** Frontend / UX Engineer
- **Componente/Ruta:** `ListadoComercios` (app/(admin)/admin/clientes/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
listarClientesPaginado usa .range() + count:'exact' (nunca SELECT sin LIMIT, CLAUDE.md §4) y embebe tenant_modules vía la FK ya existente en una sola query en vez de N+1 por fila. Ambas páginas repiten el chequeo de rol admin_nodexa contra la tabla usuarios como defensa en profundidad (docs/ROLES.md §3.8) aunque el proxy global (src/proxy.ts) ya bloquea /admin/:path* a nivel de middleware con NX-SYS-003 — se verificó ese bloqueo real en navegador con comerciante.demo@nodexa.app. Se siguió el patrón visual ya establecido en login-form.tsx/login page.tsx (bg-slate-950, text-slate-50/text-slate-400, bordes rojo/verde semánticos con ícono además de color, min-h-11 para touch targets) en vez de las clases aspiracionales de docs/DESIGN.md que todavía no están cableadas en el proyecto (ej. font-display no existe en globals.css, se usa text-2xl font-semibold como en el resto del código real). Durante la verificación manual en navegador (obligatoria para tickets de frontend) se detectó que el detalle de un comercio real devolvía NX-SYS-004 en vez de sus datos: la causa fue que clientes.packs_sku_contratados (agregado en la estación de ampliarLimiteSku) nunca se había aplicado contra el proyecto Supabase real, y mi query de detalle la selecciona — Postgres rechazaba la consulta y el código mapeaba ese error genéricamente a 'no encontrado', enmascarando el problema real. Se preguntó al usuario antes de tocar infraestructura compartida; con su autorización se aplicaron las 3 migraciones pendientes (ALTER TABLE + 2 seeds) contra el proyecto real vía MCP de Supabase. Al aplicarlas en un orden distinto al de sus timestamps (ALTER antes que el seed de clientes), el backfill de packs_sku_contratados=1 para Bazar Casa Sur no encontró la fila todavía y quedó en 0; se corrigió con un UPDATE puntual verificado con retorno de fila. get_advisors (security) no mostró hallazgos nuevos, solo el WARN preexistente de Auth ya conocido de Sprint 2. Verificado extremo a extremo: login real como admin_nodexa y como comerciante, listado con los 4 comercios reales, detalle de Bazar Casa Sur mostrando correctamente carga_ia desactivado, y confirmación por computed style de que limite_sku renderiza en Geist Mono (font-mono) como exige el checklist. tsc --noEmit, eslint --max-warnings 0 y vitest (60/60 incluyendo los 6 nuevos del repositorio) pasan sin errores; next build genera ambas rutas correctamente. Se hizo commit, push y se abrió el PR #13 siguiendo la instrucción permanente del usuario; el merge queda a su cargo tras el CI.

**Archivos Modificados:**
- `src/app/(admin)/admin/clientes/page.tsx`
- `src/app/(admin)/admin/clientes/[clienteId]/page.tsx`
- `src/repositories/clientes.ts`
- `src/repositories/clientes.test.ts`
- `src/services/admin/tipos.ts`

**Contratos y API signatures:**
- `listarClientesPaginado(supabase, pagina): Promise<ResultadoRepositorio<{ clientes: FilaClienteListado[]; total: number; porPagina: number }>> — src/repositories/clientes.ts`
- `obtenerClientePorId(supabase, clienteId): Promise<ResultadoRepositorio<FilaClienteDetalle>> — src/repositories/clientes.ts`
- `CLIENTES_POR_PAGINA = 20`
- `NOMBRE_MODULO_NODEXA: Record<ModuloNodexa, string> — src/services/admin/tipos.ts`
- `Rutas: /admin/clientes, /admin/clientes/[clienteId]`
- `Migraciones aplicadas contra el proyecto Supabase real (pkfxdbfrvbradmzangek): add_packs_sku_contratados_a_clientes, seed_clientes_volumetrico, seed_tenant_modules_volumetrico`


--- 

## 🎯 HU: Registro asíncrono de diffs de auditoría
*Criterios de Aceptación/Descripción:*
```text
Como administrador NODEXA quiero que toda alta, modificación o baja crítica quede registrada como diff en background para poder auditar cambios sin afectar el rendimiento de la operación.
```

### 📄 [✔ COMPLETADA] Helper de auditoría asíncrona con after()
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `registrarDiff` (src/lib/auditoria/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
El cambio central es arquitectónico: registrarDiff ahora encapsula after() adentro suyo en vez de que cada llamador lo importe y lo envuelva a mano — esto elimina una duplicación que ya se repetía idéntica en 5 archivos distintos (crearCliente, crearUsuario, activarModulosIniciales, ampliarLimiteSku, verificarPertenenciaTenant) y es exactamente lo que pedía el Paso 1 ('Crear registrarDiff.ts utilizando after()'). Como consecuencia, src/repositories/auditoria.ts quedó completamente superseded y se eliminó (no se dejó un re-export de compatibilidad, siguiendo la regla del proyecto contra hacks de backwards-compat); se migraron todos sus 5 llamadores reales al nuevo helper, incluyendo el registro de intentos IDOR/BOLA en verificarPertenenciaTenant, que pasó de estar awaited de forma bloqueante a ser fire-and-forget también, sin cambiar su contrato público. El Paso 3 nombra tres funciones (actualizarProducto, confirmarVenta, registrarDevolucion) que no existen en el repo — verificado explícitamente por grep antes de escribir código: Core Productos/Ventas/Devoluciones son módulos sin construir todavía (docs/SITEMAP.md las lista como estaciones futuras: /productos/nuevo, /mostrador, /devoluciones/nueva). En vez de fabricar esos tres módulos completos como efecto colateral de un ticket de infraestructura de auditoría (scope creep severo, además de invadir tickets futuros ya reservados), se integró el helper en las tres mutaciones tenant-scoped que sí existen hoy y que tenían un vacío real: actualizarEstadoVenta, actualizarEstadoDevolucion y actualizarClienteFinal nunca auditaban su propia escritura exitosa (solo el guard de pertenencia auditaba el camino de rechazo). Cada una ahora hace una lectura mínima del estado previo antes del UPDATE para que valor_anterior refleje un valor real, no un placeholder null. El Paso 4 se probó de forma concreta y no trivial en registrarDiff.test.ts: se mockea after() para retener el callback en vez de ejecutarlo, se llama registrarDiff() con un insert deliberadamente lento (una Promise que se resuelve manualmente), y se verifica que la función ya retornó (sincrónicamente, sin await) antes de que ese insert se resuelva — demuestra el no-bloqueo a nivel de control de flujo, ya que medir latencia de wall-clock HTTP real no es determinístico en un test de Vitest. Al escribir el seed de 120 auditoria_diffs se encontró un bloqueo real de datos: usuario_id tiene FK NOT NULL a usuarios, y los 3 tenants volumétricos (creados en la estación de crearCliente) nunca tuvieron un comerciante sembrado — solo el tenant demo-nodexa de la estación de login tiene usuarios reales. registro_id en cambio no tiene FK (es polimórfico según tabla_afectada, confirmado leyendo el DDL real), así que no fue necesario esperar al lote volumétrico de productos/ventas (~2280 filas, todavía sin construir) para poblar auditoria_diffs: se usó gen_random_uuid() ahí. Se preguntó al usuario cómo resolver el bloqueo de usuario_id; con su autorización se sembró un comerciante real por tenant (mismo patrón de auth.users + auth.identities vía crypt()/gen_salt('bf') que la estación de login de Sprint 1) y luego se aplicaron ambas migraciones contra el proyecto Supabase real, verificado con conteo exacto (100+20=120) y get_advisors sin hallazgos de seguridad nuevos. tsc --noEmit, eslint --max-warnings 0, vitest (66/66) y next build (con el guardrail postbuild de fuga de service_role) pasan sin errores.

**Archivos Modificados:**
- `src/lib/auditoria/registrarDiff.ts`
- `src/lib/auditoria/registrarDiff.test.ts`
- `src/repositories/auditoria.ts (eliminado)`
- `src/repositories/base/verificarPertenenciaTenant.ts`
- `src/repositories/base/verificarPertenenciaTenant.test.ts`
- `src/repositories/ventas.ts`
- `src/repositories/devoluciones.ts`
- `src/repositories/clientesFinales.ts`
- `src/services/admin/crearCliente.ts`
- `src/services/admin/crearCliente.test.ts`
- `src/services/admin/activarModulosIniciales.ts`
- `src/services/admin/activarModulosIniciales.test.ts`
- `src/services/admin/ampliarLimiteSku.ts`
- `src/services/admin/ampliarLimiteSku.test.ts`
- `src/services/usuarios/crearUsuario.ts`
- `src/services/usuarios/crearUsuario.test.ts`
- `supabase/migrations/20260809165000_seed_usuarios_comerciantes_multi_tenant.sql`
- `supabase/migrations/20260809170000_seed_auditoria_diffs_volumetrico.sql`

**Contratos y API signatures:**
- `registrarDiff(diff: DiffAuditoria): void — src/lib/auditoria/registrarDiff.ts (encapsula after(), no retorna Promise, fire-and-forget)`
- `DiffAuditoria { clienteId, usuarioId, tablaAfectada, registroId, campoModificado, valorAnterior?, valorNuevo? } — movida desde src/repositories/auditoria.ts`
- `actualizarEstadoVenta / actualizarEstadoDevolucion / actualizarClienteFinal ahora registran diff propio en éxito (antes solo el guard IDOR auditaba)`
- `Usuarios sembrados: pedro@almacendonpedro.com, marta@ferreteriaeltornillo.com, andres@bazarcasasur.com (comerciantes, password NodexaDemo123!, aplicado contra el proyecto real)`
- `120 filas en auditoria_diffs (proyecto real): 100 productos/precio + 20 ventas/estado`


--- 

## 🎯 HU: Mapeo de errores a mensajes normalizados
*Criterios de Aceptación/Descripción:*
```text
Como usuario del sistema quiero ver siempre un mensaje claro y orientado a la solución cuando ocurre un error para entender qué pasó sin ver detalles técnicos.
```

### 📄 [✔ COMPLETADA] Capa de manejo de errores normalizados por ERRORS.md
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `mapearError` (src/lib/errores/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
mapearError es un helper de traducción, no un reemplazo de la lógica de negocio ya existente en cada Server Action: los servicios de src/services/ ya usan safeParse() y devuelven códigos NX-* directamente como valor de retorno (nunca lanzan), así que no había ZodError propagándose realmente hoy en el repo — se dejó el patrón safeParse intacto en todo lo ya construido para no arriesgar un refactor grande y no relacionado, y mapearError queda disponible como la capa de traducción para casos que sí lancen (código nuevo, Route Handlers, helpers anidados) sin duplicar lógica de catálogo. Se agregó ErrorDeDominio como complemento natural: una excepción tipada que ya trae su código validado contra el catálogo, para lanzar en vez de retornar cuando conviene. La regla más importante del criterio 2 (nunca exponer SQL crudo) se resolvió con un catch-all: cualquier objeto con forma de error de Supabase/Postgres, o cualquier valor no reconocido explícitamente, cae en NX-SYS-001 sin inspeccionar campos específicos como error.code — el mapeo a códigos de negocio específicos (ej. NX-ADM-001 por slug duplicado en crearCliente.ts) sigue viviendo en el llamador que conoce esa semántica, mapearError no la duplica ni la adivina. MensajeError se diseñó sin hooks para poder reusarse tanto en el único formulario Fail-Fast real hoy (login-form.tsx, cliente) como en los estados de error a nivel de página de /admin/clientes (Server Component) — se refactorizaron los 3 bloques duplicados que ya existían con el mismo patrón ícono+texto+rojo antes de este ticket, en vez de dejarlos inconsistentes con el nuevo componente compartido. Verificado en navegador real (no solo unit tests): login con credenciales inválidas mostrando el mensaje de NX-SYS-006 con el borde/ícono correctos, y el detalle de un comercio con UUID inexistente mostrando NX-SYS-004 con el mismo componente. tsc --noEmit, eslint --max-warnings 0, vitest (72/72 incluyendo los 6 nuevos) y next build pasan sin errores.

**Archivos Modificados:**
- `src/lib/errores/mapearError.ts`
- `src/lib/errores/mapearError.test.ts`
- `src/components/errores/MensajeError.tsx`
- `src/components/auth/login-form.tsx`
- `src/app/(admin)/admin/clientes/page.tsx`
- `src/app/(admin)/admin/clientes/[clienteId]/page.tsx`

**Contratos y API signatures:**
- `mapearError(error: unknown): { codigo: CodigoError; mensaje: string } — src/lib/errores/mapearError.ts`
- `class ErrorDeDominio extends Error { readonly codigo: CodigoError } — src/lib/errores/mapearError.ts`
- `<MensajeError codigo={string | null | undefined} className?={string} /> — src/components/errores/MensajeError.tsx`


--- 

## 🎯 HU: Captura de errores técnicos en Sentry
*Criterios de Aceptación/Descripción:*
```text
Como equipo de desarrollo quiero capturar los errores técnicos en Sentry sin exponer datos sensibles para poder diagnosticar problemas rápidamente en producción.
```

### 📄 [✔ COMPLETADA] Boundary de errores con captura en Sentry
- **Rol:** Frontend / UX Engineer
- **Componente/Ruta:** `ErrorBoundary` (app/(app)/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Ambos archivos son Client Components ('use client') siguiendo el contrato de Next.js App Router para error.tsx, con Sentry.captureException(error) en useEffect replicando exactamente el patrón ya establecido en src/app/global-error.tsx de Sprint 1 — no se inventó un patrón nuevo de captura. El criterio 'no incluye trazas de SQL ni nombres de columnas' se satisface por diseño de Next.js, no por lógica nueva en este ticket: en producción, cualquier excepción lanzada dentro de un Server Component o Server Action de estos grupos de rutas llega al cliente ya sanitizada (mensaje genérico + digest), y el componente de todas formas nunca renderiza error.message en la UI bajo ningún escenario — se documentó esta decisión inline en ambos archivos en vez de dejarla implícita, incluyendo por qué no se tocó el pipeline global de beforeSend (filtrarDatosSensibles.ts) para scrubbear exception.value: sería un cambio de alcance mucho más amplio (afecta todas las capturas de Sentry del sistema) no pedido explícitamente por el checklist de esta estación, que solo pide crear los dos archivos error.tsx. El aislamiento entre boundaries (criterio 3) es una garantía nativa de App Router (cada error.tsx cubre únicamente su segmento), verificada en vivo forzando un throw real dentro de admin/clientes/page.tsx y confirmando en la consola del navegador el mensaje explícito de React: 'It was handled by the ErrorBoundaryHandler error boundary' — no se dejó como una afirmación sin comprobar. Se ofrecen ambas acciones de recuperación (reintentar vía reset() y volver vía Link) en vez de solo una, para una UX más completa sin salirse del criterio. El grupo (app) no tenía ningún archivo todavía — es Core sin construir (dashboard, mostrador, etc. son estaciones futuras según docs/SITEMAP.md) — así que se creó la carpeta solo con este error.tsx, infraestructura lista para cuando esas páginas existan; no se fabricó ningún layout ni página adicional para no exceder el alcance del ticket. No se agregó test unitario: no hay testing-library ni entorno jsdom instalados en el proyecto, y ningún otro componente .tsx del repo (login-form.tsx, MensajeError.tsx) tiene test de render — se verificó en navegador real en su lugar, igual que las estaciones de UI previas. tsc --noEmit, eslint --max-warnings 0, vitest (72/72, sin regresiones) y next build pasan sin errores.

**Archivos Modificados:**
- `src/app/(app)/error.tsx`
- `src/app/(admin)/error.tsx`

**Contratos y API signatures:**
- `ErrorBoundaryApp({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) — src/app/(app)/error.tsx`
- `ErrorBoundaryAdmin({ error, reset }) — src/app/(admin)/error.tsx`


--- 

