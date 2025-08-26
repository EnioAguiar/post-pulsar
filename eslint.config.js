import eslintPluginAstro from "eslint-plugin-astro";

export default [
  ...eslintPluginAstro.configs.recommended,
  {
    ignores: ["dist/", ".astro/", "**/*.config.js", "**/*.config.cjs", "*.cjs"],
  },
  {
    rules: {},
  },
];
