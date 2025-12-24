import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores([
    'node_modules',
    'coverage',
    'dist',
    'storybook-static',
    'packages/**/dist/**',
    'examples/**/dist/**',
  ]),
  ...tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
      files: [
        'packages/**/*.{ts,tsx,js,jsx}',
        'examples/**/*.{ts,tsx,js,jsx}',
        'stories/**/*.{ts,tsx,js,jsx}',
      ],
      languageOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        globals: {
          ...globals.browser,
          ...globals.node,
        },
      },
      plugins: {
        'react-hooks': reactHooks,
      },
      rules: {
        ...reactHooks.configs.recommended.rules,
        // Allow some advanced patterns in our library hooks that intentionally
        // read from refs and call setState inside effects to bridge to
        // external stores and mutations. These patterns are safe and
        // thoroughly tested here.
        'react-hooks/refs': 'off',
        'react-hooks/set-state-in-effect': 'off',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      },
    },
  ),
]);

