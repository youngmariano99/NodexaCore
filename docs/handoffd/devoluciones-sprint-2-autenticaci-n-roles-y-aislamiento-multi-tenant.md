# Handoffs y Entregables del Sprint - Sprint 2: Autenticación, Roles y Aislamiento Multi-Tenant

**Objetivo:** Completar el modelo de seguridad transversal: middleware de sesión, roles de usuario, políticas RLS y defensas contra accesos indebidos.
**Capacidad:** 30 Ptos | **Duración:** 2 Semanas
**Estado del Sprint:** PLANIFICADO

--- 

## 🎯 HU: Middleware global de validación de sesión JWT
*Criterios de Aceptación/Descripción:*
```text
Como administrador de seguridad quiero que un middleware valide el token JWT en cada solicitud a rutas protegidas para que ninguna vista sensible quede accesible sin sesión vigente.
```

### 📄 [✔ COMPLETADA] Implementar middleware de autenticación en Next.js
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `middleware` (/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se migró src/middleware.ts a src/proxy.ts (export renombrado de middleware a proxy) usando el codemod oficial 'npx @next/codemod@canary middleware-to-proxy', porque Next.js 16.3 deprecó la convención middleware.ts en favor de proxy.ts (PROXY_FILENAME='proxy' confirmado en node_modules/next/dist/lib/constants.js). El codemod solo tocó firma/nombre de archivo; la lógica de negocio (revalidación de sesión con getUser(), decodificación de claims, chequeo de antigüedad <=1h, bloqueo de /admin por rol) quedó intacta. Se ajustó únicamente la redacción de dos comentarios JSDoc ('middleware' -> 'proxy') para que la terminología del código coincida con la nueva convención. Re-verificado end-to-end en navegador limpiando cookies entre pruebas (el primer intento post-migración dio falso positivo porque la sesión de admin_nodexa de la verificación anterior seguía viva en el mismo tab): sin sesión -> NX-SYS-002 a /login, comerciante a /admin -> NX-SYS-003 a /dashboard, admin_nodexa a /admin -> acceso permitido. tsc --noEmit, eslint --max-warnings 0 y next build (sin warning de deprecación esta vez) pasan sin errores. No se hizo ningún commit ni push: el usuario pidió el paso a paso para hacerlo manualmente.

**Archivos Modificados:**
- `src/proxy.ts`
- `src/lib/auth/decodificar-jwt.ts`
- `src/lib/auth/rutas-por-rol.ts`
- `src/services/autenticacion/tipos.ts`
- `src/services/autenticacion/iniciarSesion.ts`
- `src/lib/errores/catalogo.ts`
- `src/app/(publico)/login/page.tsx`
- `src/components/auth/login-form.tsx`

**Contratos y API signatures:**
- `proxy(request: NextRequest): Promise<NextResponse> — src/proxy.ts (antes middleware(), archivo antes en src/middleware.ts)`
- `config.matcher: ['/dashboard/:path*','/mostrador/:path*','/productos/:path*','/stock/:path*','/ventas/:path*','/devoluciones/:path*','/clientes/:path*','/catalogo-web/:path*','/whatsapp-bot/:path*','/configuracion/:path*','/ayuda/:path*','/admin/:path*']`
- `decodificarClaimsSesion(accessToken: string): ClaimsSesion | null`
- `RUTA_POR_ROL: Record<RolUsuario, string>`
- `RolUsuario = 'admin_nodexa' | 'comerciante' | 'empleado'`
- `ClaimsSesion { sub, cliente_id, rol, iat, exp }`
- `LoginForm({ codigoErrorInicial?: string })`
- `LoginPage({ searchParams: Promise<{ error?: string }> })`


--- 

## 🎯 HU: Alta de usuarios con roles diferenciados
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero dar de alta usuarios empleados dentro de mi comercio para delegar el uso del mostrador sin compartir mis propias credenciales.
```

### 📄 [✔ COMPLETADA] Server Action de creación de usuario empleado
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `crearUsuario` (src/services/usuarios/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
crearUsuario sigue la matriz de permisos de ROLES.md §2 (usuarios: alta exclusiva de comerciante dentro de su tenant): el chequeo de rol en la Server Action es defensa en profundidad, la autoridad final es la política RLS usuarios_insert_comerciante ya existente en la migración inicial. Se usó auth.admin.inviteUserByEmail en vez de createUser+password: el custom_access_token_hook (estación de login) deriva rol/cliente_id leyendo la tabla usuarios por auth_user_id, no de app_metadata, así que no hace falta setear app_metadata en el alta — el empleado define su propia contraseña por mail, evitando manejar contraseñas temporales en texto plano (regla de CLAUDE.md sobre credenciales). El insert en usuarios usa el cliente ligado a la sesión (RLS), nunca el service_role, respetando el aislamiento de ROLES.md §3.9; el service_role se reserva exclusivamente para auditoria_diffs vía after() (permitido explícitamente para jobs asíncronos por esa misma sección) y para la Admin API de invitación. Ante fallo del insert en usuarios se revierte el alta en Auth (auth.admin.deleteUser) para no dejar usuarios huérfanos que bloqueen reintentos por email duplicado. No existe en ERRORS.md un código específico para 'email ya registrado' en usuarios (solo NX-ADM-001 para clientes); se usó el fallback genérico NX-SYS-001 ya establecido como patrón en iniciarSesion.ts, sin inventar un código nuevo. Se agregó test unitario (TDD, mockeando Supabase y after()) cubriendo los 4 criterios de aceptación más el caso de rollback. La migración de seed (2 empleados en el tenant demo-nodexa, mismo patrón que 20260807231822_seed_usuarios_demo.sql) quedó escrita pero SIN aplicar: el modo automático bloqueó la escritura directa en auth.users del proyecto real por ser una acción sobre infraestructura compartida; queda pendiente de confirmación explícita del usuario para aplicarla vía MCP o que la corra manualmente. tsc --noEmit, eslint --max-warnings 0, vitest (12/12 incluyendo los 5 nuevos) y next build (con el guardrail postbuild de fuga de service_role) pasan sin errores.

**Archivos Modificados:**
- `src/services/usuarios/crearUsuario.ts`
- `src/services/usuarios/tipos.ts`
- `src/services/usuarios/crearUsuario.test.ts`
- `src/repositories/auditoria.ts`
- `supabase/migrations/20260809120000_seed_empleados_adicionales_demo_tenant.sql`

**Contratos y API signatures:**
- `crearUsuario(estadoPrevio: EstadoCrearUsuario, formData: FormData): Promise<EstadoCrearUsuario> — src/services/usuarios/crearUsuario.ts`
- `EstadoCrearUsuario { error: string | null; exito: boolean }, ESTADO_CREAR_USUARIO_INICIAL`
- `registrarDiffAuditoria(diff: DiffAuditoria): Promise<void> — src/repositories/auditoria.ts`
- `DiffAuditoria { clienteId, usuarioId, tablaAfectada, registroId, campoModificado, valorAnterior?, valorNuevo? }`
- `Migración seed_empleados_adicionales_demo_tenant: 2 empleados (empleado2.demo@nodexa.app, empleado3.demo@nodexa.app, password NodexaDemo123!) en el tenant demo-nodexa — NO aplicada aún contra el proyecto real, pendiente de confirmación del usuario`


--- 

## 🎯 HU: Políticas RLS por cliente_id en todas las tablas de negocio
*Criterios de Aceptación/Descripción:*
```text
Como arquitecto de seguridad quiero aplicar Row Level Security por cliente_id en cada tabla de negocio para garantizar que ningún comercio pueda leer ni modificar datos de otro tenant.
```

### 📄 [✔ COMPLETADA] Migración de políticas RLS multi-tenant
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `rls_policies` (supabase/migrations/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
El ticket asumía que las tablas de negocio ya existían; en la base real solo estaban clientes/usuarios/tenant_modules (estación inicial), así que se creó primero crear_tablas_negocio.sql (1:1 con SCHEMA.md §5-16, en orden de dependencia de FKs) como prerrequisito de enable_rls_policies.sql. Las políticas siguen ROLES.md literalmente, incluyendo los dos casos con reglas de negocio embebidas en la política (productos: empleado no soft-deletea; clientes_finales: solo comerciante actualiza saldo_deudor) tomados verbatim de ROLES.md §3.4. venta_items, devolucion_items y movimientos_cuenta_corriente no tienen columna cliente_id propia, así que su aislamiento es vía EXISTS contra la tabla padre en vez del filtro directo. Las tablas append-only (movimientos_stock, venta_items, devolucion_items, movimientos_cuenta_corriente, auditoria_diffs) no reciben política UPDATE a propósito: sin política permisiva, Postgres deniega por defecto, que es la semántica de 'append-only' de SCHEMA.md. clientes/usuarios/tenant_modules no se tocaron: ya tenían RLS especializado (no genérico) desde la migración inicial y no formaba parte del alcance de esta actividad. Se aplicaron ambas migraciones contra el proyecto Supabase real (no quedaron solo escritas) y se corrió get_advisors (security): cero hallazgos sobre USING(true) en mutaciones o RLS faltante, solo un WARN preexistente de Auth ajeno a esta actividad. Los 4 criterios de aceptación se verificaron con pruebas reales (SET LOCAL ROLE + request.jwt.claims simulando comerciante y anon) dentro de una transacción con ROLLBACK, sin dejar datos de prueba residuales en la base compartida.

**Archivos Modificados:**
- `supabase/migrations/20260809130000_crear_tablas_negocio.sql`
- `supabase/migrations/20260809130100_enable_rls_policies.sql`

**Contratos y API signatures:**
- `Tablas nuevas (docs/SCHEMA.md §5-16): productos, movimientos_stock, ventas, venta_items, clientes_finales, movimientos_cuenta_corriente, devoluciones, devolucion_items, notas_credito, cargas_ia, configuracion_bot_whatsapp, auditoria_diffs`
- `RLS + políticas <tabla>_select_tenant / <tabla>_insert_tenant / <tabla>_update_tenant en las 12 tablas anteriores`
- `productos_lectura_publica ON productos FOR SELECT USING (publicado = true AND eliminado_en IS NULL)`
- `auth_cliente_id(): uuid, auth_rol(): rol_usuario, es_admin_nodexa(): boolean — redeclaradas, sin cambio de firma`


--- 

## 🎯 HU: Verificación de propiedad de recursos (IDOR/BOLA)
*Criterios de Aceptación/Descripción:*
```text
Como arquitecto de seguridad quiero que cada Server Action valide que el recurso solicitado pertenece al cliente_id del token para evitar accesos indebidos entre comercios.
```

### 📄 [✔ COMPLETADA] Implementar guard de pertenencia de recurso en repositorios
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `verificarPertenenciaTenant` (src/repositories/base/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
verificarPertenenciaTenant hace una única query (id + cliente_id en el WHERE) para no distinguir 'no existe' de 'es de otro tenant', evitando filtrar existencia de recursos ajenos (mismo criterio que ROLES.md §3.8). Es defensa en profundidad explícita en el repositorio, independiente de la RLS ya aplicada en la estación anterior. Se aplicó en los 3 repositorios pedidos (ventas, devoluciones, clientesFinales), los únicos de ese grupo con columna cliente_id propia; cada mutación llama al guard antes de construir el UPDATE y corta en NX-SYS-007 sin tocar la base si no pasa. Trazabilidad dual: Sentry.captureMessage siempre (nivel warning, tag codigo_error=NX-SYS-007), más un registro en auditoria_diffs (reutilizando registrarDiffAuditoria ya existente) cuando el contexto trae usuarioId — las 3 repos lo exigen como campo obligatorio de su Contexto*, así que en la práctica siempre queda registrado en ambos canales. clientesFinales.ts deja saldo_deudor fuera de los campos editables a propósito: ese valor solo se modifica vía movimientos_cuenta_corriente. La prueba de integración (Paso 4) no mockea verificarPertenenciaTenant: solo stubea el cliente Supabase y ejercita el guard ya integrado dentro de las 3 mutaciones reales, verificando con toHaveBeenCalledTimes/not.toHaveBeenCalled() sobre la cadena .update() que la mutación nunca se arma cuando el recurso es de otro tenant. NX-SYS-007 ya estaba en docs/ERRORS.md (no se inventó), se agregó a catalogo.ts porque esta es la primera estación que lo maneja en código. tsc, eslint, vitest (19/19) y next build pasan sin errores; PR #8 abierto con CI en verde, pendiente de tu merge.

**Archivos Modificados:**
- `src/repositories/base/verificarPertenenciaTenant.ts`
- `src/repositories/base/tipos.ts`
- `src/repositories/base/verificarPertenenciaTenant.test.ts`
- `src/repositories/ventas.ts`
- `src/repositories/devoluciones.ts`
- `src/repositories/clientesFinales.ts`
- `src/lib/errores/catalogo.ts`

**Contratos y API signatures:**
- `verificarPertenenciaTenant(recursoId: string, clienteIdJwt: string | null, opciones: { supabase: SupabaseClient; tabla: 'ventas'|'devoluciones'|'clientes_finales'; usuarioId?: string }): Promise<{ perteneceAlTenant: boolean; error: 'NX-SYS-007' | null }>`
- `ResultadoRepositorio<T> = { ok: true; data: T } | { ok: false; error: string } — src/repositories/base/tipos.ts`
- `actualizarEstadoVenta(ventaId, nuevoEstado: EstadoVenta, contexto): Promise<ResultadoRepositorio<{venta_id,estado}>>`
- `actualizarEstadoDevolucion(devolucionId, nuevoEstado: EstadoDevolucion, contexto): Promise<ResultadoRepositorio<{devolucion_id,estado}>>`
- `actualizarClienteFinal(clienteFinalId, cambios: {nombre?,telefono?}, contexto): Promise<ResultadoRepositorio<{cliente_final_id,nombre,telefono}>>`
- `CATALOGO_ERRORES['NX-SYS-007']`


--- 

## 🎯 HU: Rate limiting en rutas de autenticación
*Criterios de Aceptación/Descripción:*
```text
Como administrador de seguridad quiero limitar la cantidad de intentos de inicio de sesión mediante Upstash Redis para reducir el riesgo de ataques de fuerza bruta.
```

### 📄 [✔ COMPLETADA] Configurar Upstash Redis rate limit en login
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `authLimiter` (src/lib/rate-limit/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Verificación post-merge del PR #9 (feat/mc-act-4oqr, ya mergeado a main): el usuario cargó credenciales reales de Upstash Redis en .env.local. Se corrió el flujo completo en el navegador contra el dev server real: 6 intentos de login fallidos con el mismo email devolvieron NX-SYS-005 exactamente en el 6to intento (los 5 previos devuelven el error de credenciales normal, consumiendo cupo de la ventana), y un segundo usuario (comerciante.demo@nodexa.app) logueándose correctamente desde la misma IP mientras el primero seguía bloqueado confirmó el aislamiento por clave compuesta IP+email — los 3 criterios de aceptación verificables sin esperar 15 minutos reales quedaron confirmados contra Upstash real, no solo contra los mocks de los tests unitarios. Sin errores en los logs del servidor durante la prueba. El criterio de 'reintentar tras esperar la ventana' no se verificó en vivo (15 min reales); queda cubierto por el test unitario que valida el cálculo de reintentarEnSegundos a partir del TTL real de Redis, comportamiento estándar de slidingWindow. No hubo cambios de código en esta estación, solo verificación end-to-end de lo ya mergeado.

**Archivos Modificados:**
- `src/lib/rate-limit/authLimiter.ts`
- `src/lib/rate-limit/obtenerIpSolicitante.ts`
- `src/lib/rate-limit/authLimiter.test.ts`
- `src/services/autenticacion/recuperarContrasena.ts`
- `src/services/autenticacion/recuperarContrasena.test.ts`
- `src/services/autenticacion/iniciarSesion.ts`
- `src/services/autenticacion/iniciarSesion.test.ts`
- `src/services/autenticacion/tipos.ts`
- `src/lib/env.ts`
- `src/lib/errores/catalogo.ts`
- `scripts/verificar-fugas-env-cliente.ts`
- `.env.example`
- `package.json`
- `package-lock.json`

**Contratos y API signatures:**
- `verificarAuthLimiter(ip: string, email: string): Promise<{ permitido: boolean; restantes: number; reintentarEnSegundos: number }>`
- `obtenerIpSolicitante(): Promise<string>`
- `recuperarContrasena(estadoPrevio: EstadoRecuperarContrasena, formData: FormData): Promise<EstadoRecuperarContrasena>`
- `EstadoRecuperarContrasena { error: string | null; enviado: boolean }, ESTADO_RECUPERAR_CONTRASENA_INICIAL`
- `env UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (obligatorias, server-only)`
- `CATALOGO_ERRORES['NX-SYS-005']`


--- 

