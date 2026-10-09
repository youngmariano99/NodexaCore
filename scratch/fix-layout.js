const fs = require('fs');

let content = fs.readFileSync('src/components/layout/AppLayoutClient.tsx', 'utf8');

const regex = /\{\s*titulo: modalidadCatalogo === "comandas_realtime" \? "Comandas" : modalidadCatalogo === "pedidos_whatsapp" \? "Landing" : "[^"]+",\s*href: modalidadCatalogo === "comandas_realtime" \? "\/ventas\/comandas" : "\/catalogo-web",\s*icon: Globe,\s*mostrar: modulosActivos\.catalogo_web && rol !== "empleado",\s*\}/g;

const replacement = `{
      titulo: "Comandas",
      href: "/ventas/comandas",
      icon: LayoutDashboard,
      mostrar: modulosActivos.catalogo_web && modalidadCatalogo === "comandas_realtime",
    },
    {
      titulo: "Catálogo Web",
      href: "/catalogo-web",
      icon: Globe,
      mostrar: modulosActivos.catalogo_web && rol !== "empleado",
    }`;

content = content.replace(regex, replacement);

fs.writeFileSync('src/components/layout/AppLayoutClient.tsx', content);
