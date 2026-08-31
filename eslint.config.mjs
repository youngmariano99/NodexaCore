import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "supabase/**",
    ],
  },
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Formaliza la convención ya usada en todo el repo (_estadoPrevio,
      // _formData) para parámetros de Server Actions que el contrato de
      // useActionState/bind() exige declarar aunque no se usen.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { args: "after-used", argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
