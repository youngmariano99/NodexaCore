const fs = require('fs');
let c = fs.readFileSync('src/app/(app)/productos/nuevo/Paso1DatosGenerales.tsx', 'utf8');
c = c.replace(
  'agregarMarca: (m: Marca) => void;',
  'agregarMarca: (m: Marca) => void;\n  gastronomiaActivo?: boolean;'
);
c = c.replace(
  'agregarMarca,',
  'agregarMarca,\n  gastronomiaActivo,'
);
c = c.replace(
  'Siguiente: Dimensiones',
  '{gastronomiaActivo ? "Siguiente: Receta" : "Siguiente: Dimensiones"}'
);
fs.writeFileSync('src/app/(app)/productos/nuevo/Paso1DatosGenerales.tsx', c, 'utf8');
