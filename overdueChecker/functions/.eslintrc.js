module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
  },
  ignorePatterns: ["/lib/**/*", "/generated/**/*"],
  plugins: ["@typescript-eslint", "import"],
  rules: {
    indent: ["error", 2],
    "max-len": [
      "error",
      {
        code: 80,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreComments: true,
      },
    ],
    "require-jsdoc": 0,
    "object-curly-spacing": ["error", "always"],
    "comma-dangle": ["error", "always-multiline"],
    quotes: ["error", "double"],
    "import/no-unresolved": 0,
    "@typescript-eslint/no-inferrable-types": 0,
    "@typescript-eslint/no-explicit-any": 1,
    "@typescript-eslint/no-unused-vars": [
      1,
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
  },
};
