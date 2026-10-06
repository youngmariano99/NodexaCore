const fs = require('fs');
let c = fs.readFileSync('src/app/(app)/productos/listado-productos.tsx', 'utf8');

c = c.replace(
  'publicado: boolean;\n}',
  'publicado: boolean;\n  tipo_producto?: "estandar" | "fabricado" | "insumo";\n  recetas?: { estado_costeo: "actualizado" | "desactualizado" } | { estado_costeo: "actualizado" | "desactualizado" }[] | null;\n}'
);

fs.writeFileSync('src/app/(app)/productos/listado-productos.tsx', c, 'utf8');
