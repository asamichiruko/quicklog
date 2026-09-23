import pluginVue from "eslint-plugin-vue"
import vitest from "@vitest/eslint-plugin"
import eslintConfigPrettier from "eslint-config-prettier"
import { defineConfigWithVueTs, vueTsConfigs } from "@vue/eslint-config-typescript"

export default defineConfigWithVueTs(
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**"],
  },

  pluginVue.configs["flat/recommended"],
  vueTsConfigs.recommended,

  {
    files: ["**/*.ts", "**/*.vue"],
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-use-before-define": "off",
      "@typescript-eslint/no-use-before-define": [
        "error",
        {
          functions: false,
          classes: true,
          variables: true,
          enums: true,
          typedefs: false,
          ignoreTypeReferences: true,
        },
      ],
    },
  },

  {
    files: ["**/*.{test,spec}.ts", "**/__tests__/**/*.ts"],
    plugins: {
      vitest,
    },
    languageOptions: {
      globals: {
        ...vitest.environments.env.globals,
      },
    },
    rules: {
      ...vitest.configs.recommended.rules,
      "vitest/no-focused-tests": "error",
    },
  },

  eslintConfigPrettier,
)
