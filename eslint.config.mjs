// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import { importX } from 'eslint-plugin-import-x';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import vitest from '@vitest/eslint-plugin';
import globals from 'globals';

export default tseslint.config(
  // Ignore patterns
  {
    ignores: [
      'dist/**',
      '.webpack/**',
      'node_modules/**',
      '*.config.ts',
      '*.config.mjs',
      '*.config.js',
      'forge.config.ts',
      'scripts/**',
      '.dependency-cruiser.js',
    ],
  },

  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript ESLint recommended rules
  ...tseslint.configs.recommended,

  // Import-X recommended + TypeScript config
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,

  // Unicorn recommended rules (100+ quality rules)
  eslintPluginUnicorn.configs.recommended,

  // React flat config
  {
    files: ['**/*.{jsx,tsx}'],
    ...reactPlugin.configs.flat.recommended,
    ...reactPlugin.configs.flat['jsx-runtime'],
    settings: {
      react: {
        version: 'detect',
      },
    },
  },

  // JSX A11y accessibility rules
  {
    files: ['**/*.{jsx,tsx}'],
    ...jsxA11y.flatConfigs.recommended,
  },

  // React Hooks plugin
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: {
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Vitest plugin for test files
  {
    files: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}', 'test/**/*.{ts,tsx}'],
    ...vitest.configs.recommended,
  },

  // Import resolver settings for TypeScript
  {
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
          project: './tsconfig.json',
        }),
      ],
    },
  },

  // Main process (Node.js)
  {
    files: ['src/main/**/*.ts', 'src/preload.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Renderer process (Browser + Node for Electron)
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  // Config files
  {
    files: ['config/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Project-wide rules
  {
    rules: {
      // Relax some rules for Electron development
      '@typescript-eslint/no-require-imports': 'off', // Electron preload uses require
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/prop-types': 'off', // We use TypeScript for props
      'no-unused-vars': 'off', // Let TypeScript handle this
      'unicorn/filename-case': 'off', // Allow camelCase for hooks/components
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],

      // Unicorn rule customizations (some are too strict for Electron)
      'unicorn/prevent-abbreviations': 'off', // Allow common abbreviations like err, props, etc.
      'unicorn/no-null': 'off', // Electron APIs use null
      'unicorn/prefer-module': 'off', // Electron uses CommonJS in main process
      'unicorn/prefer-top-level-await': 'off', // Not always supported in Electron
      'unicorn/prefer-global-this': 'off', // `window` is idiomatic in browser/Electron renderer
      'unicorn/prefer-query-selector': 'off', // getElementById is fine
      'unicorn/no-array-for-each': 'warn', // forEach is fine, just a style preference
      'unicorn/catch-error-name': 'off', // Allow `err` as catch parameter name
      'unicorn/numeric-separators-style': 'off', // Not needed for this project

      // Import rules
      'import-x/order': ['warn', {
        'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        'alphabetize': { order: 'asc', caseInsensitive: true },
      }],
      'import-x/no-unresolved': 'off', // TypeScript handles this
      'import-x/named': 'off', // TypeScript handles this
    },
  },
);
