# Suite de integración (RLS + Server Actions contra Supabase local)

Pruebas de integración (20% de la pirámide de testing, CLAUDE.md §4) que
ejercitan Postgres/PostgREST/GoTrue **reales** de una instancia local de
Supabase — a diferencia de `src/**/*.test.ts` (70% Unitarias), que mockean
el cliente Supabase y nunca invocan una política RLS de verdad.

## Cómo correrla

Requiere Docker corriendo y el CLI de Supabase (`npx supabase`, no hace
falta instalarlo global).

```bash
npx supabase start   # primera vez: descarga imágenes, puede tardar varios minutos
npm run test:integracion
npx supabase stop    # opcional, libera los contenedores
```

Si `supabase start` ya estaba corriendo de una sesión anterior y se
modificó `supabase/config.toml` (ej. el hook de auth), hace falta
reiniciar para que tome el cambio:

```bash
npx supabase stop
npx supabase start
```

Si algo no cuadra después de aplicar migraciones nuevas o cambiar
`auto_expose_new_tables`, `npx supabase db reset` recrea la base desde cero
aplicando todas las migraciones — más lento, pero es la única forma
confiable de que los `GRANT` por defecto de PostgREST se recalculen.

## Qué cubre

- **`rls-multitenant.test.ts`** (Paso 2): autentica usuarios reales de dos
  tenants (`pedro@almacendonpedro.com`, `marta@ferreteriaeltornillo.com`,
  password `NodexaDemo123!` — mismos usuarios demo que documenta
  `docs/SEED.md`) y confirma que ninguna lectura/escritura cruzada de datos
  privados tiene éxito, sobre `productos`, `ventas` y `clientes`. Documenta
  explícitamente los dos carve-outs de lectura pública ya existentes
  (`productos_lectura_publica`, `clientes_lectura_publica`) como
  comportamiento intencional, no como fugas.
- **`validacion-inputs-maliciosos.test.ts`** (Paso 3): confirma que un
  intento de inyección SQL nunca se ejecuta, en dos capas:
  - Zod (`crearProducto`, `confirmarVenta`): rechaza el formato antes de
    tocar Supabase.
  - El Query Builder de `supabase-js` (`insertarProducto`): un string que sí
    pasa Zod (`sku`/`nombre` libres) se guarda como dato inerte, nunca se
    interpreta como SQL — verificado con una sesión real.

## Notas de configuración local

- `supabase/config.toml` habilita `[auth.hook.custom_access_token]` y
  `auto_expose_new_tables = true`: el proyecto cloud real
  (`pkfxdbfrvbradmzangek`) ya tiene ambos activos (el primero vía Dashboard
  manual, el segundo por ser el comportamiento legado con el que se
  escribieron todas las migraciones), pero `supabase start` con la config
  por defecto del CLI no replica ninguno de los dos. Sin ellos, las pruebas
  fallarían en falso negativo (JWT sin `rol`/`cliente_id`, o
  `permission denied` antes de evaluar RLS) — no porque la app tenga un bug,
  sino porque el entorno local no coincidía con el real.
- `tests/integracion/stubs/server-only.ts` + el alias en
  `vitest.integracion.config.ts` reproducen el no-op que Next.js ya aplica
  al paquete `server-only` en su propio runtime de servidor; el paquete real
  lanza una excepción incondicional fuera del bundler de Next.
- Las credenciales en `tests/integracion/helpers/entornoSupabaseLocal.ts`
  son las claves DEMO públicas y fijas que Supabase CLI genera siempre para
  cualquier proyecto local — nunca apuntan al proyecto cloud real.
