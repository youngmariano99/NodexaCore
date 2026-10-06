# 3. Wizard de Gastronomía (Frontend)

## Prerequisitos
- Levantar el entorno local con `npm run dev`.
- Contar con un usuario comerciante en un tenant que tenga el módulo `produccion_gastronomica` ACTIVO.
- Tener un par de productos tipo `insumo` creados en la base de datos para ese tenant (ej. "Harina", "Huevos").

## Pasos
1. Ingresar a `/productos/nuevo`.
2. Completar los datos generales en el "Paso 1" y presionar "Siguiente: Receta".
3. En el "Paso 2: Receta / Insumos", definir el rendimiento y usar el buscador para agregar insumos.
4. Presionar "Siguiente: Costos".
5. En el "Paso 3: Costos y Margen", visualizar el costo unitario, definir un margen y aplicar el precio de venta sugerido.
6. Finalizar y visualizar el "Paso 4: Resumen".

## Resultado esperado
- Mensaje visible: Las etiquetas de los pasos (Paso 2: Receta / Insumos, Paso 3: Costos y Margen). Los costos parciales deben calcularse correctamente en la tabla de la receta.
- Dónde verificar: `/productos/nuevo`
- Código HTTP esperado: 200 al buscar insumos y al finalizar guardado.
