import js from "@eslint/js";
import astro from "eslint-plugin-astro";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  { ignores: ["dist/", ".astro/", ".wrangler/", ".quality/", ".lighthouseci/", "node_modules/"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  astro.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  // The site is static files: nothing in src/ logs (.claude/rules/coding.md).
  // The scripts report their problems on stderr, so they may.
  {
    files: ["src/**"],
    rules: { "no-console": "error" },
  },
]);
