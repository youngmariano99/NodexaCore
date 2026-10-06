# 6. Migración SQL Estructura BOM y Costos (Backend)

## Prerequisitos
- Tener Supabase CLI instalado.
- Ejecutar \supabase start\ o aplicar migraciones a base de datos.

## Pasos
1. Ejecutar \supabase migration up\ para aplicar la Migración \20261005000000_crear_modulo_gastronomia.sql\.
2. Conectarse a la base de datos (por ej: con dbeaver o \supabase db psql\).
3. Verificar la existencia de las tablas: \configuracion_costos\, \ecetas\, \eceta_insumos\, \eceta_costos_indirectos\ y \costos_indirectos\.
4. Insertar un producto y verificar que la columna \	ipo_producto\ tiene valor por defecto 'estandar'.

## Resultado esperado
- Mensaje visible: Las tablas y RLS policies se crean correctamente sin errores de sintaxis.
- Dónde verificar: pgAdmin o consola psql de Supabase local.
- Código HTTP esperado: N/A

