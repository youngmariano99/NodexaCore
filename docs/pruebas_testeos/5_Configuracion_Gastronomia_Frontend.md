# 5. Configuración de Gastronomía (Frontend)

## Prerequisitos
- Correr `npm run dev`
- Iniciar sesión con un usuario que tenga permisos (Admin/Dueño).

## Pasos
1. Navegar a `/configuracion/gastronomia`.
2. Escribir "35" en el campo "Margen de Ganancia Meta (%)" y hacer click en "Guardar Margen".
3. Completar el formulario de "Costos Indirectos Adicionales":
   - Nombre: "Fritura"
   - Tipo: "Porcentaje (%)"
   - Valor: 8
4. Click en "Agregar" y verificar que el costo se sume a la lista.
5. Navegar a `/productos/nuevo` (Asegurarse de tener el flag de módulo Gastronomía activo).
6. Avanzar al Paso 3 del Wizard (Costos y Margen).

## Resultado esperado
- Mensaje visible: En la pantalla de Configuración, el costo "Fritura" debe aparecer listado. En el Paso 3 del Wizard, el Margen Meta debe precargarse en 35% y debe mostrarse una lista de "Costos Indirectos Adicionales" donde se puede seleccionar "Fritura". Al tildar "Fritura", el Costo Total por Unidad debe aumentar un 8%.
- Dónde verificar: `/configuracion/gastronomia` y `/productos/nuevo` (Paso 3)
- Código HTTP esperado: N/A
