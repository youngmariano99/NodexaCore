# Handoffs y Entregables del Sprint - Sprint 7: Cuota de IA, Cuentas Corrientes y Devoluciones

**Objetivo:** Cerrar el módulo de Carga con IA y entregar de forma completa los módulos de Fiados y Devoluciones con Notas de Crédito.
**Capacidad:** 30 Ptos | **Duración:** 2 Semanas
**Estado del Sprint:** COMPLETADO

--- 

## 🎯 HU: Visualización del contador de cargas por IA
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero ver cuántas cargas por IA llevo consumidas sobre mi cuota mensual para planificar cuándo usar esta función.
```

### 📄 [✔ COMPLETADA] Componente de contador de cuota de IA
- **Rol:** Frontend / UX Engineer
- **Componente/Ruta:** `ContadorCuotaIA` (app/(app)/productos/carga-ia/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
obtenerUsoCuotaIA cuenta filas reales de cargas_ia (COUNT filtrado por cliente_id + ia_periodo_actual) como valor de MOSTRAR, separado a propósito del contador incremental ia_consultas_usadas que aplica el bloqueo real de cuota vía fn_registrar_consumo_ia. La página /productos/carga-ia sigue el mismo esqueleto de auth+rol+force-dynamic de dashboard/page.tsx y oculta el contador (mostrando NX-IA-001) cuando tenant_modules.carga_ia no está activo. PR abierto contra la rama de mc-act-5ge0 (aún sin mergear, PR #37) porque depende de cargasIaRepository.ts creado ahí — mismo criterio ya usado en Sprint 6 para el descuento de stock apilado sobre confirmarVenta. Verificado end-to-end en navegador real contra el proyecto Supabase real (34/40 en font-mono para Ferretería El Tornillo; mensaje de módulo no contratado para Almacén Don Pedro). tsc, eslint --max-warnings 0, vitest (307/307) y next build (con el guardrail postbuild) pasan sin errores.

**Archivos Modificados:**
- `src/repositories/cargasIaRepository.ts`
- `src/repositories/cargasIaRepository.test.ts`
- `src/components/productos/ContadorCuotaIA.tsx`
- `src/app/(app)/productos/carga-ia/page.tsx`

**Contratos y API signatures:**
- `obtenerUsoCuotaIA(supabase: SupabaseClient, clienteId: string): Promise<ResultadoRepositorio<UsoCuotaIa>> — src/repositories/cargasIaRepository.ts`
- `UsoCuotaIa { usadas: number; cuotaMensualIa: number }`
- `<ContadorCuotaIA usadas cuotaMensualIa className? /> — src/components/productos/ContadorCuotaIA.tsx`
- `Ruta: /productos/carga-ia`


--- 

## 🎯 HU: Bloqueo y oferta de recarga al agotar la cuota de IA
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero ser notificado de forma amigable al agotar mi cuota mensual de IA y poder contratar un paquete de recarga para seguir usando la función sin esperar al próximo mes.
```

### 📄 [✔ COMPLETADA] Validación de cuota mensual de IA antes de invocar OpenAI
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `validarCuotaIa` (app/api/carga-ia/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
cuotaIaAgotada es una funcion pura reutilizada en server (Fail-Fast en route.ts, aditivo al RPC fn_registrar_consumo_ia que sigue siendo autoritativo bajo concurrencia) y en cliente (deshabilitar boton). FormularioCargaIa es la primera UI real de subida para /api/carga-ia: arranca con cuotaAgotadaInicial calculado server-side y se re-deshabilita en caliente ante un 429 NX-IA-002 tardio (condicion de carrera). ModalCuotaAgotadaIa replica el patron visual de ModalBloqueoSku (acento azul, nunca rojo) con el CTA de +40 consultas. PR apilado sobre mc-act-5ge0 porque toca route.ts/page.tsx de esa linea, misma rama que quedo con el commit huerfano de mc-act-x908 (PR #39, abierto en esta misma sesion). Verificado en navegador real: con autorizacion explicita del usuario se puso ia_consultas_usadas=40/40 en Ferreteria El Tornillo, se confirmo boton deshabilitado, modal con CTA, y un POST directo a /api/carga-ia devolviendo 429 NX-IA-002 sin tocar Cloudinary/OpenAI; el dato se restauro a 34 al terminar. tsc, eslint --max-warnings 0, vitest (313/313) y next build (con el guardrail postbuild) pasan sin errores.

**Archivos Modificados:**
- `src/lib/dominio/cargaIa/validarCuotaIa.ts`
- `src/lib/dominio/cargaIa/validarCuotaIa.test.ts`
- `src/app/api/carga-ia/route.ts`
- `src/app/api/carga-ia/route.test.ts`
- `src/app/(app)/productos/carga-ia/page.tsx`
- `src/app/(app)/productos/carga-ia/FormularioCargaIa.tsx`
- `src/components/productos/ModalCuotaAgotadaIa.tsx`

**Contratos y API signatures:**
- `cuotaIaAgotada(iaConsultasUsadas: number, cuotaMensualIa: number): boolean — src/lib/dominio/cargaIa/validarCuotaIa.ts`
- `POST /api/carga-ia ahora retorna 429 NX-IA-002 con { iaConsultasUsadas, cuotaMensualIa } en la capa Fail-Fast, antes de invocar registrarConsumoIa`
- `<FormularioCargaIa cuotaAgotadaInicial /> — src/app/(app)/productos/carga-ia/FormularioCargaIa.tsx`
- `<ModalCuotaAgotadaIa abierto onCerrar /> — src/components/productos/ModalCuotaAgotadaIa.tsx`


--- 

## 🎯 HU: Registro de cliente final
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero registrar los datos básicos de contacto de mis clientes habituales para poder ofrecerles cuenta corriente.
```

### 📄 [✔ COMPLETADA] Server Action crearClienteFinal
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `crearClienteFinal` (src/services/fiados/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
crearClienteFinal valida con Zod (telefono opcional normalizado a NULL), verifica sesion/rol (comerciante o empleado, docs/ROLES.md), corta con NX-FIA-001 si el modulo fiados no esta activo, e inserta via insertarClienteFinal sin exponer saldo_deudor (usa el DEFAULT 0 de la columna, mismo criterio que actualizarClienteFinal). NX-FIA-005 se resuelve con un indice UNIQUE parcial nuevo (idx_clientesfinales_telefono_unico) en vez de un SELECT previo, evitando la ventana de carrera TOCTOU — mismo patron ya usado por productos(cliente_id, sku); un telefono NULL nunca colisiona. Se sembraron 25 clientes_finales (docs/SEED.md §6, literal) contra el proyecto Supabase real con autorizacion explicita del usuario, y se verificaron los 4 criterios de aceptacion: insert con saldo_deudor=0, rechazo NX-FIA-001 sin modulo activo (via tests), rechazo real 23505 ante telefono duplicado (verificado con INSERT+ROLLBACK contra el proyecto real), y recuperacion de filas con el mismo filtro que usaria un listado futuro (no existe pagina /clientes todavia, es una estacion de UI separada segun docs/SITEMAP.md). get_advisors sin hallazgos nuevos. tsc, eslint --max-warnings 0, vitest (319/319) y next build (con el guardrail postbuild) pasan sin errores.

**Archivos Modificados:**
- `src/services/fiados/crearClienteFinal.ts`
- `src/services/fiados/crearClienteFinal.test.ts`
- `src/services/fiados/tipos.ts`
- `src/repositories/clientesFinales.ts`
- `src/repositories/clientesFinales.test.ts`
- `src/lib/errores/catalogo.ts`
- `supabase/migrations/20260811130000_clientes_finales_telefono_unico.sql`
- `supabase/migrations/20260811131000_seed_clientes_finales.sql`
- `docs/SCHEMA.md`

**Contratos y API signatures:**
- `crearClienteFinal(estadoPrevio: EstadoCrearClienteFinal, formData: FormData): Promise<EstadoCrearClienteFinal> — src/services/fiados/crearClienteFinal.ts`
- `EstadoCrearClienteFinal { error: string | null; exito: boolean }, ESTADO_CREAR_CLIENTE_FINAL_INICIAL — src/services/fiados/tipos.ts`
- `insertarClienteFinal(supabase, datos: DatosNuevoClienteFinal): Promise<ResultadoRepositorio<FilaClienteFinal>> — src/repositories/clientesFinales.ts`
- `CATALOGO_ERRORES['NX-FIA-001'], ['NX-FIA-005']`
- `idx_clientesfinales_telefono_unico UNIQUE (cliente_id, telefono) WHERE telefono IS NOT NULL AND eliminado_en IS NULL — docs/SCHEMA.md §9`
- `25 filas en clientes_finales (proyecto real): 15 Almacén Don Pedro + 10 Bazar Casa Sur`


--- 

## 🎯 HU: Venta asociada a cuenta corriente
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero asociar una venta a la cuenta corriente de un cliente registrado para que su saldo deudor se actualice automáticamente.
```

### 📄 [✔ COMPLETADA] Extensión de fn_confirmar_venta para cargo a cuenta corriente
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `fn_confirmar_venta_fiado` (supabase/migrations/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
fn_confirmar_venta genera un movimiento tipo='cargo' e incrementa clientes_finales.saldo_deudor exactamente en v_total cuando la venta trae cliente_final_id, dentro de la misma transacción PL/pgSQL (rollback total ante cualquier fallo posterior, incluido stock insuficiente ya validado antes en la misma función). El incremento de saldo_deudor se aisló en fn_incrementar_saldo_deudor (SECURITY DEFINER) porque clientes_finales_update_tenant bloquea con RLS cualquier UPDATE de un empleado — confirmado en vivo (42501) — mientras que ventas/movimientos_cuenta_corriente sí permiten ambos roles; el resto de fn_confirmar_venta sigue SECURITY INVOKER. Verificado end-to-end contra el proyecto Supabase real dentro de transacciones con ROLLBACK: cargo+saldo exactos, atomicidad ante stock insuficiente (sin residuos), venta de contado sin movimientos, y el camino específico de empleado (bloqueo RLS directo confirmado, éxito vía RPC confirmado). get_advisors detectó y se corrigió un WARN real (anon con EXECUTE por un grant explícito de Supabase no cubierto por REVOKE ALL FROM PUBLIC); sin hallazgos nuevos tras el fix. Sin cambios de TypeScript (ticket puramente de supabase/migrations/); next build sin errores.

**Archivos Modificados:**
- `supabase/migrations/20260811140000_fn_confirmar_venta_cargo_cuenta_corriente.sql`

**Contratos y API signatures:**
- `SQL function public.fn_confirmar_venta(p_idempotency_key text, p_cliente_final_id uuid, p_items jsonb) returns ventas — CREATE OR REPLACE, ahora también genera cargo a cuenta corriente cuando p_cliente_final_id no es NULL, aplicada contra el proyecto real`
- `SQL function public.fn_incrementar_saldo_deudor(p_cliente_final_id uuid, p_monto numeric) returns void — SECURITY DEFINER, EXECUTE restringido a authenticated (revocado de anon y public), aplicada contra el proyecto real`


--- 

## 🎯 HU: Registro de pagos parciales o totales
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero registrar pagos parciales o totales de un cliente para reducir su saldo deudor a medida que va cancelando la cuenta.
```

### 📄 [✔ COMPLETADA] Server Action registrarPagoCuentaCorriente
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `registrarPagoCuentaCorriente` (src/services/fiados/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
registrarPagoCuentaCorriente valida monto>0 con Zod (NX-FIA-004) y delega la logica critica (monto<=saldo_deudor, descuento atomico, insert del movimiento) a fn_registrar_pago_cuenta_corriente, que corre SECURITY DEFINER porque clientes_finales_update_tenant bloquea con RLS un UPDATE de empleado -- rol explicitamente habilitado por docs/ROLES.md para 'solo registrar pagos'. El chequeo de saldo suficiente vive en el WHERE del mismo UPDATE que descuenta (bloqueo optimista, sin ventana de carrera entre pagos concurrentes); una lectura de diagnostico posterior distingue NX003 (monto excede la deuda, mapeado a NX-FIA-003) de P0002 (cliente final de otro tenant, mapeado a NX-FIA-002 en vez del generico NX-SYS-007, por ser mas especifico y ya estar en el catalogo). El seed requirio un paso previo no pedido literalmente pero necesario: como no existia deuda real (las 300 ventas volumetricas de Sprint 5 son anteriores a Fiados), se genero un cargo inicial sintetico por cliente final (venta_id NULL, interpretado como saldo migrado al alta del comercio) antes de aplicar los 20 pagos pedidos. Verificado end-to-end contra el proyecto Supabase real dentro de transacciones con ROLLBACK: pago parcial exacto, rechazo por monto excedido, pago exitoso via rol empleado; seed real aplicado y confirmado (25 cargos + 20 pagos, todos con venta_id NULL). get_advisors sin hallazgos nuevos. tsc, eslint --max-warnings 0, vitest (330/330) y next build (con el guardrail postbuild) pasan sin errores.

**Archivos Modificados:**
- `src/services/fiados/registrarPagoCuentaCorriente.ts`
- `src/services/fiados/registrarPagoCuentaCorriente.test.ts`
- `src/services/fiados/tipos.ts`
- `src/lib/errores/catalogo.ts`
- `supabase/migrations/20260811150000_fn_registrar_pago_cuenta_corriente_rpc.sql`
- `supabase/migrations/20260811160000_seed_pagos_cuenta_corriente.sql`

**Contratos y API signatures:**
- `registrarPagoCuentaCorriente(estadoPrevio: EstadoRegistrarPagoCuentaCorriente, formData: FormData): Promise<EstadoRegistrarPagoCuentaCorriente> — src/services/fiados/registrarPagoCuentaCorriente.ts`
- `EstadoRegistrarPagoCuentaCorriente { error: string | null; exito: boolean }, ESTADO_REGISTRAR_PAGO_CUENTA_CORRIENTE_INICIAL — src/services/fiados/tipos.ts`
- `SQL function public.fn_registrar_pago_cuenta_corriente(p_cliente_final_id uuid, p_monto numeric) returns movimientos_cuenta_corriente — SECURITY DEFINER, EXECUTE restringido a authenticated (revocado de anon y public), aplicada contra el proyecto real`
- `CATALOGO_ERRORES['NX-FIA-002'], ['NX-FIA-003'], ['NX-FIA-004']`
- `25 cargos iniciales + 20 pagos en movimientos_cuenta_corriente (proyecto real)`


--- 

## 🎯 HU: Consulta de estado de cuenta corriente
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero consultar el estado de cuenta de un cliente con su historial de cargos y pagos para saber cuánto me debe en cualquier momento.
```

### 📄 [✔ COMPLETADA] Vista de historial de cuenta corriente por cliente
- **Rol:** Frontend / UX Engineer
- **Componente/Ruta:** `EstadoCuentaCorriente` (app/(app)/clientes/[clienteFinalId]/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
obtenerMovimientosCuentaCorrientePaginados pagina por cliente_final_id + creado_en DESC (idx_movcc_clientefinal), con movimiento_cc_id como desempate ante filas de un mismo lote de seed con creado_en identico. La pagina /clientes/[clienteFinalId] verifica pertenencia de tenant con verificarPertenenciaTenant (ya extendido a clientes_finales en una estacion previa) antes de leer nada -- un cliente final de otro comercio corta con NX-SYS-007, auditado via Sentry/registrarDiff por el propio helper. saldo_deudor se muestra directo de clientes_finales (destacado, font-mono), sin recomputo local: las estaciones de cargo/pago ya lo mantienen atomicamente correcto junto con cada movimiento. Verificado en navegador real contra el proyecto Supabase real: saldo exacto (cargo - pago), font-mono confirmado por computed style, y bloqueo NX-SYS-007 ante un cliente_final_id real de otro tenant. tsc, eslint --max-warnings 0, vitest (336/336) y next build pasan sin errores.

**Archivos Modificados:**
- `src/repositories/movimientosCuentaCorrienteRepository.ts`
- `src/repositories/movimientosCuentaCorrienteRepository.test.ts`
- `src/app/(app)/clientes/[clienteFinalId]/page.tsx`

**Contratos y API signatures:**
- `obtenerMovimientosCuentaCorrientePaginados(supabase, clienteFinalId, pagina, porPagina?): Promise<ResultadoRepositorio<ResultadoMovimientosCuentaCorrientePaginados>> — src/repositories/movimientosCuentaCorrienteRepository.ts`
- `MOVIMIENTOS_CUENTA_CORRIENTE_POR_PAGINA = 25, FilaMovimientoCuentaCorrienteListado, TipoMovimientoCuenta`
- `Ruta: /clientes/[clienteFinalId]`


--- 

## 🎯 HU: Registro de devolución de venta
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero registrar la devolución total o parcial de una venta confirmada para reflejar correctamente los productos que el cliente devolvió.
```

### 📄 [✔ COMPLETADA] Server Action registrarDevolucion
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `registrarDevolucion` (src/services/devoluciones/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
registrarDevolucion restringe la ejecucion a comerciante (unico rol habilitado por docs/ROLES.md), valida forma con Zod y el modulo activo antes de invocar fn_registrar_devolucion. El RPC hace atomico todo el evento de negocio: inserta devoluciones+devolucion_items, valida cantidad contra lo vendido menos lo ya devuelto acumulado (NX-DEV-002, sin lectura previa en la Server Action), rechaza sobre ventas devuelta_total (NX-DEV-003), restaura stock via movimientos_stock con referencia_devolucion_id, genera la nota de credito 1:1 (NX-DEV-004 ante fallo, capturado con BEGIN/EXCEPTION) y recalcula ventas.estado comparando el total devuelto acumulado contra el total vendido de la venta. Se detecto y corrigio en vivo un bug real de tipado (CASE sin cast a estado_venta) durante la verificacion contra el proyecto Supabase real. Verificado con ROLLBACK: monto_total exacto en devolucion parcial, NX-DEV-002 ante exceso, NX-DEV-003 tras devolucion total, y el seed real de 20 devoluciones/40 items/20 notas de credito confirmado por SQL directo. get_advisors sin hallazgos nuevos. tsc, eslint --max-warnings 0, vitest (348/348) y next build pasan sin errores.

**Archivos Modificados:**
- `src/services/devoluciones/registrarDevolucion.ts`
- `src/services/devoluciones/registrarDevolucion.test.ts`
- `src/services/devoluciones/tipos.ts`
- `src/lib/errores/catalogo.ts`
- `supabase/migrations/20260811170000_fn_registrar_devolucion_rpc.sql`
- `supabase/migrations/20260811171000_seed_devoluciones_volumetrico.sql`

**Contratos y API signatures:**
- `registrarDevolucion(estadoPrevio: EstadoRegistrarDevolucion, formData: FormData): Promise<EstadoRegistrarDevolucion> — src/services/devoluciones/registrarDevolucion.ts`
- `EstadoRegistrarDevolucion { error, exito, devolucionId }, ESTADO_REGISTRAR_DEVOLUCION_INICIAL — src/services/devoluciones/tipos.ts`
- `SQL function public.fn_registrar_devolucion(p_venta_id uuid, p_motivo text, p_items jsonb) returns devoluciones — SECURITY INVOKER, aplicada contra el proyecto real`
- `CATALOGO_ERRORES['NX-DEV-001'..'NX-DEV-004'], ['NX-VTA-004']`
- `20 devoluciones + 40 devolucion_items + 20 notas_credito (proyecto real)`


--- 

## 🎯 HU: Generación de nota de crédito
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero que se genere automáticamente una nota de crédito al procesar una devolución sin alterar el registro original de la venta.
```

### 📄 [✔ COMPLETADA] Función RPC de generación de nota de crédito
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `fn_generar_nota_credito` (supabase/migrations/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
fn_registrar_devolucion se reemplaza unicamente en como arma numero_comprobante: nextval() atomico sobre una secuencia global nueva (notas_credito_correlativo_seq) en vez del hash derivado del devolucion_id de la estacion anterior, produciendo el formato NC-{cliente_id_corto}-{correlativo} pedido por el checklist. El resto de la funcion (insercion en notas_credito dentro de la misma transaccion, UNIQUE(devolucion_id)/UNIQUE(numero_comprobante) como garantia final, NX-DEV-004 ante fallo sin dejar devolucion huerfana, venta original intacta salvo estado) ya estaba resuelto en la estacion de registrarDevolucion y se revalido explicitamente con datos reales: nota de credito real con formato correcto y venta sin alteraciones, bloqueo real de UNIQUE(devolucion_id) ante un segundo intento, y 0 devoluciones huerfanas tras forzar una colision de numero_comprobante. get_advisors sin hallazgos nuevos. Sin cambios de TypeScript (ticket puramente de supabase/migrations/); tsc, eslint --max-warnings 0, vitest (348/348) y next build pasan sin errores.

**Archivos Modificados:**
- `supabase/migrations/20260811180000_fn_generar_nota_credito_secuencial.sql`
- `docs/SCHEMA.md`

**Contratos y API signatures:**
- `SQL sequence public.notas_credito_correlativo_seq — nueva, aplicada contra el proyecto real`
- `SQL function public.fn_registrar_devolucion(p_venta_id uuid, p_motivo text, p_items jsonb) returns devoluciones — CREATE OR REPLACE, numero_comprobante ahora formato NC-{cliente_id_corto}-{correlativo} via nextval, aplicada contra el proyecto real`


--- 

## 🎯 HU: Reintegro automático de stock por devolución
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero que el stock del producto devuelto se reintegre automáticamente para no tener que ajustarlo manualmente después de cada devolución.
```

### 📄 [✔ COMPLETADA] Reintegro de stock dentro de la transacción de devolución
- **Rol:** Backend / DB Engineer
- **Componente/Ruta:** `fn_reintegro_stock_devolucion` (supabase/migrations/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Los 4 criterios de aceptacion del ticket (Paso 1-3: insertar movimientos_stock tipo='entrada' con referencia_devolucion_id, actualizar productos.stock_actual por devolucion_item, atomicidad con la nota de credito) ya estaban completamente implementados en fn_registrar_devolucion desde las estaciones mc-act-24db y mc-act-lp9y (PRs #47 y #48, ya mergeados a main). No se creo una funcion fn_reintegro_stock_devolucion separada porque no hay ningun otro llamador ni restriccion de RLS por rol que lo justifique (a diferencia de fn_incrementar_saldo_deudor, que si necesito SECURITY DEFINER separado en una estacion previa) -- extraerla solo agregaria una llamada anidada sin beneficio real, violando el principio de no introducir abstraccion sin necesidad. Se verificaron los 4 criterios exactos de este ticket contra el proyecto Supabase real, dentro de transacciones con ROLLBACK: incremento exacto de stock_actual (+3 y +2 en una devolucion multi-item), movimientos_stock con tipo='entrada' y referencia_devolucion_id correctos, reintegro independiente y correcto por producto, y reversion completa del stock (vuelta al valor original) al forzar un fallo de nota de credito (NX-DEV-004). Sin residuos en ninguna prueba. No hubo cambios de codigo: git status quedo limpio, no se abrio PR.


--- 

