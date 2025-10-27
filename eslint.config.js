import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Warn against hard-coded UI strings in JSX
      "no-restricted-syntax": [
        "warn",
        {
          selector: "JSXText[value=/\\S/]",
          message: "Hard-coded UI string in JSX. Please use i18n t('key') instead."
        },
        {
          selector: "JSXAttribute[name.name='key'][value.expression.name='lng']",
          message: "Avoid key={lng} remounts."
        },
        {
          selector: "JSXAttribute[name.name='key'][value.expression.property.name='language']",
          message: "Avoid key={i18n.language} remounts."
        },
        {
          selector: "CallExpression[callee.name='tx'] > Literal[value=/^(dashboard|documents|controls|checks|admin|training|assistant|aiSystems|evidence|scope|nav)\\./]",
          message: "Use t('namespace:key') with useTranslation(['namespace']) instead of tx('namespace.key') for JSON translations."
        },
        {
          selector: "CallExpression[callee.name='tx'] > TemplateLiteral[quasis.0.value.cooked=/^(dashboard|documents|controls|checks|admin|training|assistant|aiSystems|evidence|scope|nav)\\./]",
          message: "Use t('namespace:key') with useTranslation(['namespace']) instead of tx(`namespace.${...}`) for JSON translations."
        }
      ],
      "no-restricted-imports": ["error", {
        "paths": [
          { 
            "name": "i18next-http-backend", 
            "message": "Use local resources only." 
          },
          { 
            "name": "i18next-browser-languagedetector", 
            "message": "Do not auto-detect language." 
          }
        ]
      }]
    },
  },
);
