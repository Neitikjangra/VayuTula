import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import boundaries from 'eslint-plugin-boundaries';
import prettier from 'eslint-config-prettier/flat';

/** Layer rules from PRD Section 3 and CLAUDE.md. Same-layer imports are always allowed. */
const LAYERS = {
  app: ['app', 'domain', 'engine', 'data', 'ai', 'config', 'i18n', 'ui', 'lib'],
  domain: ['domain'],
  config: ['config', 'domain'],
  engine: ['engine', 'domain', 'config'],
  data: ['data', 'domain', 'config', 'lib'],
  ai: ['ai', 'domain', 'config', 'lib'],
  i18n: ['i18n'],
  ui: ['ui', 'domain', 'engine', 'config', 'i18n', 'lib'],
  lib: ['lib'],
};

const layerPolicies = Object.entries(LAYERS).map(([from, to]) => ({
  from: { element: { type: from } },
  allow: { to: { element: { types: to } } },
}));

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { alwaysTryTypes: true }, node: true },
      'boundaries/elements': Object.keys(LAYERS).map((type) => ({
        type,
        pattern: `src/${type}`,
      })),
    },
    rules: {
      'boundaries/dependencies': [2, { default: 'disallow', policies: layerPolicies }],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'max-lines': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['src/ui/**/*.tsx', 'src/app/**/*.tsx'],
    rules: {
      'react/jsx-no-literals': ['error', { noStrings: true, ignoreProps: true }],
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: { 'max-lines-per-function': 'off' },
  },
  prettier,
];

export default config;
