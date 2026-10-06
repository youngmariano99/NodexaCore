const fs = require('fs');
let c = fs.readFileSync('src/app/(app)/productos/listado-productos.tsx', 'utf8');

c = c.replace(
  'Array.isArray(producto.recetas) \n                            ? producto.recetas[0]?.estado_costeo ?? null\n                            : ((producto.recetas as Record<string, string>)?.estado_costeo as "actualizado" | "desactualizado" | undefined) ?? null',
  'Array.isArray(producto.recetas) \n                            ? (producto.recetas[0]?.estado_costeo as "actualizado" | "desactualizado" | undefined) ?? null\n                            : ((producto.recetas as Record<string, string>)?.estado_costeo as "actualizado" | "desactualizado" | undefined) ?? null'
);

fs.writeFileSync('src/app/(app)/productos/listado-productos.tsx', c, 'utf8');
