import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

/**
 * Hard rule, ported from Amayi Learn (eslint.config.js at ec3496e): only
 * convex/ai/router.ts names openrouter.ai or OPENROUTER_API_KEY in
 * application code.
 */

const openRouterRules = [
  {
    selector: "Literal[value=/openrouter[.]ai/]",
    message: "Only convex/ai/router.ts may reference openrouter.ai. Route the call through internal.ai.router.call.",
  },
  {
    selector: "TemplateElement[value.raw=/openrouter[.]ai/]",
    message: "Only convex/ai/router.ts may reference openrouter.ai. Route the call through internal.ai.router.call.",
  },
  {
    selector: "MemberExpression[property.name='OPENROUTER_API_KEY']",
    message: "Only convex/ai/router.ts may read OPENROUTER_API_KEY.",
  },
  {
    selector: "Literal[value='OPENROUTER_API_KEY']",
    message: "Only convex/ai/router.ts may reference OPENROUTER_API_KEY.",
  },
];

export default tseslint.config(
  {
    ignores: [
      "dist",
      "dev-dist",
      "convex/_generated",
      "convex/data/*.generated.ts",
      "convex/data/generated.ts",
      "node_modules",
      "coverage",
      "playwright-report",
      "test-results",
      ".convex",
      ".cache",
      "src/art.generated.ts",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { ecmaVersion: 2022, globals: { ...globals.browser, ...globals.node } },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      eqeqeq: ["error", "smart"],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },

  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },

  {
    files: ["**/*.{ts,tsx,js,mjs}"],
    ignores: ["convex/ai/router.ts", "eslint.config.js", "scripts/setup-env.mjs", "tests/convex/router.test.ts"],
    rules: { "no-restricted-syntax": ["error", ...openRouterRules] },
  },
  /**
   * The router tests may name the env var, because they delete it to prove a
   * missing credential never leaks. The host name stays forbidden, so tests
   * cannot call the service directly.
   */
  {
    files: ["tests/convex/router.test.ts", "scripts/setup-env.mjs"],
    rules: { "no-restricted-syntax": ["error", openRouterRules[0], openRouterRules[1]] },
  },

  // The Windows junction preload is loaded by NODE_OPTIONS --require, so it is CommonJS.
  {
    files: ["scripts/**/*.cjs"],
    languageOptions: { sourceType: "commonjs", globals: { ...globals.node } },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },

  {
    files: ["tests/**/*.ts", "e2e/**/*.ts", "scripts/**/*.{ts,mjs}", "*.config.{ts,js}"],
    languageOptions: { globals: { ...globals.node } },
    rules: { "no-console": "off", "@typescript-eslint/no-explicit-any": "off" },
  },
);
