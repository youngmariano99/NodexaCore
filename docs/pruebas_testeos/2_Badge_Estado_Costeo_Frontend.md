# 2. Badge de Estado de Costeo (Frontend)

## Prerequisitos
- Levantar el entorno local con 
pm run dev.
- Contar con al menos 3 productos de tipo 'fabricado' en la base de datos:
  1. Un producto con receta estado_costeo en 'actualizado'.
  2. Un producto con receta estado_costeo en 'desactualizado' y un costo calculado.
  3. Un producto sin receta definida (estado 
ull).

## Pasos
1. Ingresar al listado de productos de gestión de cocina (donde se monte el componente).
2. Observar los diferentes estados (semaforización) en cada uno de los 3 productos de prueba.
3. Para el producto 'desactualizado', verificar que se sugiera un nuevo precio y presionar el botón "Recalcular Sugerencia".

## Resultado esperado
- Mensaje visible: El producto 'actualizado' muestra un badge verde "Costeo al día". El producto sin receta muestra alerta naranja "Receta incompleta". El producto desactualizado muestra alerta amarilla "Insumos encarecidos" con un precio sugerido y botón para accionar.
- Dónde verificar: En el panel principal del listado de productos de cocina.
- Código HTTP esperado: 200 (si interactúa con la API al confirmar el recálculo).
