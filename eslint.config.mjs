import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Diese App lädt Daten client-seitig (SPA-Stil). Das bewusste Zurücksetzen
    // von State beim Param-Wechsel bzw. Setzen von Loading-Flags im Effect ist
    // hier Absicht – daher als Warnung statt Fehler.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
