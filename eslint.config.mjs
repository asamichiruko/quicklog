import pluginVue from "eslint-plugin-vue"
import vitest from "@vitest/eslint-plugin"
import eslintConfigPrettier from "eslint-config-prettier"
import { defineConfig } from "eslint/config"
import tseslint from "typescript-eslint"
import vueParser from "vue-eslint-parser"
import stylistic from "@stylistic/eslint-plugin"

const paddedStatements = ["function", "multiline-const", "multiline-let"]

// TypeScript 用の推奨ルールを Vue の script にも適用する。
const typescriptConfigs = tseslint.configs.recommended.map((config) =>
  config.files ? { ...config, files: [...config.files, "**/*.vue"] } : config,
)

export default defineConfig(
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**"],
  },

  pluginVue.configs["flat/recommended"],
  typescriptConfigs,

  {
    files: ["**/*.vue"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".vue"],
        ecmaVersion: 2024,
        ecmaFeatures: { jsx: false },
      },
    },
    rules: {
      "vue/block-lang": ["error", { script: { lang: ["ts"], allowNoLang: false } }],
    },
  },

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
      "@stylistic": stylistic,
    },
    languageOptions: {
      globals: {
        ...vitest.environments.env.globals,
      },
    },
    rules: {
      ...vitest.configs.recommended.rules,
      "vitest/no-focused-tests": "error",
      "@stylistic/padding-line-between-statements": [
        "error",
        {
          blankLine: "always",
          prev: "*",
          next: paddedStatements,
        },
        {
          blankLine: "always",
          prev: paddedStatements,
          next: "*",
        },
      ],
      "vitest/padding-around-before-each-blocks": "error",
      "vitest/padding-around-after-each-blocks": "error",
    },
  },

  eslintConfigPrettier,
)
