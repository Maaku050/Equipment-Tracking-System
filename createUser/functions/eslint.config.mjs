import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  // Ignore generated and external files
  {
    ignores: ["lib/**", "node_modules/**"],
  },

  // Base JS rules
  js.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.recommended,

  // Project-specific overrides
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
    },
    rules: {
      // Firebase / Node realities
      "no-console": "off",

      // Firebase error objects are dynamic
      "@typescript-eslint/no-explicit-any": "off",

      // Allow unused error vars in catch blocks
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
];
