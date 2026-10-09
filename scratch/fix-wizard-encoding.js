const fs = require('fs');

let content = fs.readFileSync('src/app/(app)/productos/nuevo/FormularioAltaProductoWizard.tsx', 'latin1');
// Actually, it might be utf-8 with weird bytes. Let's just do text replacements.
content = fs.readFileSync('src/app/(app)/productos/nuevo/FormularioAltaProductoWizard.tsx', 'utf8');

content = content.replace(/Carg\u01ED/g, 'Cargá');
content = content.replace(/opci\uFFFDn/g, 'opción');
content = content.replace(/dimensi\uFFFDn/g, 'dimensión');
content = content.replace(/cat\u01EDlogo/g, 'catálogo');
content = content.replace(/Gu\uFFFDas/g, 'Guías');
content = content.replace(/Gastron\uFFFDmica/g, 'Gastronómica');

// Fix step headers properly
const step4Regex = /\{gastronomiaActivo \|\| paso === 4 \? \(\s*<>\s*<div className="h-px flex-1 bg-\[\#222A27\] mx-4" \/>\s*<div className="flex items-center gap-2">\s*<span[\s\S]*?>\s*4\s*<\/span>\s*<span className="text-xs font-semibold text-slate-300">\{gastronomiaActivo \? "Matriz Gastronómica" : "Resumen"\}<\/span>\s*<\/div>\s*<\/>\s*\) : null\}/;
content = content.replace(step4Regex, `{!gastronomiaActivo && paso === 4 ? (
          <>
            <div className="h-px flex-1 bg-[#222A27] mx-4" />
            <div className="flex items-center gap-2">
              <span
                className={\`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold \${
                  paso >= 4 ? "bg-[#16D39A] text-[#090B0B]" : "bg-slate-800 text-slate-400"
                }\`}
              >
                4
              </span>
              <span className="text-xs font-semibold text-slate-300">Resumen</span>
            </div>
          </>
        ) : null}`);

fs.writeFileSync('src/app/(app)/productos/nuevo/FormularioAltaProductoWizard.tsx', content, 'utf8');
