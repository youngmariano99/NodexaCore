const fs = require('fs');
let c = fs.readFileSync('src/app/(app)/productos/nuevo/FormularioAltaProductoWizard.tsx', 'utf8');

c = c.replace(
  'import { Paso4Resumen } from "./Paso4Resumen";',
  'import { Paso4Resumen } from "./Paso4Resumen";\nimport { Paso2RecetaInsumos, type InsumoReceta } from "./Paso2RecetaInsumos";\nimport { Paso3CostosMargen } from "./Paso3CostosMargen";'
);

c = c.replace(
  'const [errorPaso2, setErrorPaso2] = useState<string | null>(null);',
  'const [errorPaso2, setErrorPaso2] = useState<string | null>(null);\n\n  // Datos Gastronomía\n  const [insumos, setInsumos] = useState<InsumoReceta[]>([]);\n  const [rendimiento, setRendimiento] = useState(1);\n  const [margenMeta, setMargenMeta] = useState(30);'
);

// Paso 1: Button label and action depends on gastronomy
// But Paso1DatosGenerales doesn't accept a prop for button label.
// Wait, I can pass a custom alSiguiente or we can just let Paso 1 handle it?
// Wait, in Paso1DatosGenerales the button text is hardcoded to "Siguiente: Dimensiones".
// Let's modify FormularioAltaProductoWizard to just pass gastronomy to Paso1 if needed?
// No, I'll modify FormularioAltaProductoWizard renderer.

c = c.replace(
  'alSiguiente={() => {\n              if (validarPaso1()) setPaso(2);\n            }}',
  'alSiguiente={() => {\n              if (validarPaso1()) setPaso(2);\n            }}\n            gastronomiaActivo={gastronomiaActivo}'
);

c = c.replace(
  '{paso === 2 && (',
  '{paso === 2 && gastronomiaActivo && (\n          <Paso2RecetaInsumos\n            insumos={insumos}\n            setInsumos={setInsumos}\n            rendimiento={rendimiento}\n            setRendimiento={setRendimiento}\n            alAtras={() => setPaso(1)}\n            alSiguiente={() => setPaso(3)}\n            alFinalizar={() => manejarGuardadoFinal(false)}\n            estaEnviando={estaEnviando}\n          />\n        )}\n\n        {paso === 2 && !gastronomiaActivo && ('
);

c = c.replace(
  '{paso === 3 && (',
  '{paso === 3 && gastronomiaActivo && (\n          <Paso3CostosMargen\n            insumos={insumos}\n            rendimiento={rendimiento}\n            precioVentaActual={precio}\n            margenMeta={margenMeta}\n            setMargenMeta={setMargenMeta}\n            setPrecio={setPrecio}\n            alAtras={() => setPaso(2)}\n            alFinalizar={() => manejarGuardadoFinal(false)}\n            estaEnviando={estaEnviando}\n          />\n        )}\n\n        {paso === 3 && !gastronomiaActivo && ('
);

// On save, append receta if gastronomia
c = c.replace(
  'formData.set("variantes", JSON.stringify(matrizVariantes));\n      }',
  'formData.set("variantes", JSON.stringify(matrizVariantes));\n      }\n\n      if (gastronomiaActivo && insumos.length > 0) {\n        formData.set("insumos", JSON.stringify(insumos));\n        formData.set("rendimiento", rendimiento.toString());\n      }'
);

fs.writeFileSync('src/app/(app)/productos/nuevo/FormularioAltaProductoWizard.tsx', c, 'utf8');
