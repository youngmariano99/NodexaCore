const fs = require('fs');
let c = fs.readFileSync('src/app/(app)/productos/nuevo/page.tsx', 'utf8');

c = c.replace('let catalogoWebActivo = false;', 'let catalogoWebActivo = false;\n  let gastronomiaActivo = false;');

c = c.replace(
  'catalogoWebActivo = !!modulo?.activo;',
  \catalogoWebActivo = !!modulo?.activo;
      const { data: moduloGastro } = await supabase
        .from("tenant_modules")
        .select("activo")
        .eq("cliente_id", solicitante.cliente_id)
        .eq("modulo", "produccion_gastronomica")
        .eq("activo", true)
        .maybeSingle();
      gastronomiaActivo = !!moduloGastro?.activo;\
);

c = c.replace('<FormularioAltaProductoWizard catalogoWebActivo={catalogoWebActivo} />', '<FormularioAltaProductoWizard catalogoWebActivo={catalogoWebActivo} gastronomiaActivo={gastronomiaActivo} />');

fs.writeFileSync('src/app/(app)/productos/nuevo/page.tsx', c, 'utf8');
