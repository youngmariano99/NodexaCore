# 4. Trigger de Invalidación de Costos en Cascada (Backend)

## Prerequisitos
- Levantar el entorno local con 
pm run dev y tener la base de datos (Supabase) local o de desarrollo corriendo.
- Contar con un producto de tipo insumo (Ej: Carne picada) cargado en la BD, con un precio asignado (Ej: ).
- Contar con un producto de tipo abricado (Ej: Empanada).
- Contar con una receta (en la tabla ecetas) para la Empanada que tenga estado_costeo = 'actualizado'.
- La receta debe estar vinculada al insumo mediante la tabla eceta_insumos.

## Pasos
1. Conectarse a la base de datos o usar la UI (Supabase Studio / interfaz del sistema).
2. Ejecutar un UPDATE sobre el precio del insumo (ej: subir el precio a ):
   UPDATE productos SET precio = 1200 WHERE nombre = 'Carne picada';
3. Consultar la tabla ecetas para verificar el estado de la receta de la Empanada:
   SELECT estado_costeo FROM recetas WHERE producto_id = (ID_DE_EMPANADA);

## Resultado esperado
- Mensaje visible: N/A (validación en BD).
- Dónde verificar: En la consola SQL o base de datos.
- Código HTTP esperado: N/A. El valor de estado_costeo en la tabla ecetas debe haber cambiado automáticamente de 'actualizado' a 'desactualizado'.
