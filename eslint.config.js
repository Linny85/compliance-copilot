import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";
import norrlandPlugin from "./tools/eslint-plugin-norrland/index.js";

export default tseslint.config(
  { ignores: ["dist", "codemods", "tools"] },
  {
    extends: [
      js.configs.recommended, 
      ...tseslint.configs.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "jsx-a11y": jsxA11y,
      "norrland": norrlandPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      
      // i18n: Warn against hard-coded UI strings in JSX
      "no-restricted-syntax": [
        "warn",
        {
          selector: "JSXText[value=/\\S/]",
          message: "Hard-coded UI string in JSX. Please use i18n t('key') instead."
        }
      ],

      // a11y: Label association
      "jsx-a11y/label-has-associated-control": ["error", {
        depth: 3,
        assert: "either",
      }],

      // Custom form validation rules
      "norrland/input-has-name-or-id": "error",
      "norrland/input-has-autocomplete": "warn",
    },
  },
);
