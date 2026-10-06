const fs = require('fs');
let c = fs.readFileSync('src/app/(app)/productos/listado-productos.tsx', 'utf8');

const target = '<td className="px-4 py-3 font-medium text-[#F3F5F4]">{producto.nombre}</td>';
const replacement = 
<td className="px-4 py-3">
  <div className="font-medium text-[#F3F5F4] mb-1">{producto.nombre}</div>
  <BadgeEstadoCosteo
    esFabricado={producto.tipo_producto === 'fabricado'}
    estadoCosteo={
      Array.isArray(producto.recetas) 
        ? producto.recetas[0]?.estado_costeo ?? null
        : producto.recetas?.estado_costeo ?? null
    }
    costoTotalCalculado={0}
    margenMetaSugerido={30}
    onRecalcularSugerencia={async (nuevoPrecio) => {
      alert('Sugerencia aceptada: ' + nuevoPrecio + '. (Implementación real actualizaría la BD)');
    }}
  />
</td>
.trim();

c = c.replace(target, replacement);
fs.writeFileSync('src/app/(app)/productos/listado-productos.tsx', c, 'utf8');
