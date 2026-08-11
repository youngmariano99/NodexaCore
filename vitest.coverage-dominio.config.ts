import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "./vitest.config";

/**
 * Config de cobertura acotada a las funciones puras de dominio cubiertas en
 * esta estación ("Suite Vitest de funciones puras de dominio", Paso 3: "la
 * cobertura de estas funciones puras aporte al 70% de pruebas unitarias de
 * la pirámide de testing" — CLAUDE.md §4 "testing: Pirámide 70% Unitarias
 * (Vitest)"). Deliberadamente separada de `vitest.config.ts` (que sigue
 * corriendo `npm run test` sin coverage, sin cambiar el comportamiento de
 * CI ya verde): imponer acá un umbral del 100% sobre `include` global
 * rompería el build por archivos de otros módulos que no son parte de este
 * ticket. El `include` se limita a los 3 archivos que pide el checklist
 * (Paso 1); no se agregó `carritoReducer.ts` ni el resto de `src/lib/dominio/`
 * — aunque comparten carpeta, ampliar el alcance del gate a módulos no
 * pedidos por esta actividad es responsabilidad de una estación aparte.
 */
export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      coverage: {
        provider: "v8",
        reporter: ["text", "html"],
        include: [
          "src/lib/dominio/ventas/calcularTotalVenta.ts",
          "src/lib/dominio/stock/calcularNuevoSaldo.ts",
          "src/lib/dominio/productos/calcularPorcentajeUsoSku.ts",
        ],
        exclude: ["**/*.test.ts"],
        thresholds: {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
      },
    },
  }),
);
