const fs = require('fs');
let c = fs.readFileSync('src/app/(app)/productos/listado-productos.tsx', 'utf8');

c = c.replace(
  ': (producto.recetas as Record<string, string>)?.estado_costeo ?? null',
  ': ((producto.recetas as Record<string, string>)?.estado_costeo as "actualizado" | "desactualizado" | undefined) ?? null'
);

fs.writeFileSync('src/app/(app)/productos/listado-productos.tsx', c, 'utf8');
