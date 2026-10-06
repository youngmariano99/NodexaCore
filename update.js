const fs = require('fs');
let c = fs.readFileSync('src/repositories/productosRepository.ts', 'utf8');

c = c.replace(
  'imagen_url?: string | null;\n}',
  'imagen_url?: string | null;\n  tipo_producto?: "estandar" | "fabricado" | "insumo";\n  recetas?: { estado_costeo: "actualizado" | "desactualizado" } | { estado_costeo: "actualizado" | "desactualizado" }[] | null;\n}'
);

c = c.replace(
  '.select("producto_id, sku, nombre, categoria, precio, stock_actual, publicado, imagen_url", { count: "exact" })',
  '.select("producto_id, sku, nombre, categoria, precio, stock_actual, publicado, imagen_url, tipo_producto, recetas(estado_costeo)", { count: "exact" })'
);

fs.writeFileSync('src/repositories/productosRepository.ts', c, 'utf8');
console.log('Done');
