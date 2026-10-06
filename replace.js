const fs = require('fs');
let c = fs.readFileSync('src/app/(app)/layout.tsx', 'utf8');
c = c.replace('select("nombre_comercio")', 'select("nombre_comercio, configuracion_plantilla")');
c = c.replace('const nombreComercio = cliente?.nombre_comercio || "Mi Comercio";', 'const nombreComercio = cliente?.nombre_comercio || "Mi Comercio";\n  const modalidadCatalogo = (cliente?.configuracion_plantilla as any)?.modalidad_catalogo || "vidriera";');
c = c.replace('modulosActivos={modulosActivos}', 'modulosActivos={modulosActivos}\n        modalidadCatalogo={modalidadCatalogo}');
fs.writeFileSync('src/app/(app)/layout.tsx', c, 'utf8');
