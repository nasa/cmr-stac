module.exports = {
  root: true,
  env: {
    node: true,
    es6: true,
  },
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: { project: ["./tsconfig.json"] },
  plugins: ["@typescript-eslint"],
  ignorePatterns: ["src/**/*.spec.ts"],
  rules: {
    "@typescript-eslint/no-explicit-any": ["off"],
  },
};
