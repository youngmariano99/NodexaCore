const fs = require('fs');
let c = fs.readFileSync('src/app/(app)/productos/listado-productos.tsx', 'utf8');

c = c.replace(
  'import { MensajeError } from "@/components/errores/MensajeError";',
  'import { MensajeError } from "@/components/errores/MensajeError";\nimport { BadgeEstadoCosteo } from "@/components/dominio/gastronomia/BadgeEstadoCosteo";'
);

fs.writeFileSync('src/app/(app)/productos/listado-productos.tsx', c, 'utf8');
