import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Zonas de la app donde NO se permite tocar datos ni red directamente.
// Solo pueden hablar con los "puertos" (packages/domain/src/ports.ts).
const UI_ZONES = ['apps/mobile/src/features/**/*.{ts,tsx}', 'apps/mobile/src/ui/**/*.{ts,tsx}'];

// Globales prohibidos en el dominio: el dominio es TypeScript puro.
const DOMAIN_FORBIDDEN_GLOBALS = [
  'window',
  'document',
  'navigator',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'fetch',
  'process',
].map((name) => ({
  name,
  message: 'packages/domain debe ser TypeScript puro: sin DOM, red ni almacenamiento.',
}));

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    'apps/mobile/android/**',
    'legacy/**',
  ]),

  js.configs.recommended,
  tseslint.configs.recommended,

  // Reglas generales
  {
    rules: {
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // Entornos
  {
    files: ['apps/mobile/**/*.{ts,tsx,js,jsx}'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['apps/server/**/*.ts', '**/*.config.{js,mjs,cjs,ts}', 'scripts/**/*.{js,mjs,ts}'],
    languageOptions: { globals: globals.node },
  },

  // Dominio puro: sin DOM/red/almacenamiento y sin leer reloj ni azar (reglas deterministas).
  {
    files: ['packages/domain/src/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', ...DOMAIN_FORBIDDEN_GLOBALS],
      'no-restricted-properties': [
        'error',
        {
          object: 'Date',
          property: 'now',
          message: 'El dominio recibe "now" como parámetro (texto ISO); no lee el reloj.',
        },
        {
          object: 'Math',
          property: 'random',
          message: 'El dominio no usa azar; los identificadores llegan ya generados.',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'new Date() sin argumentos lee el reloj. Recibe "now" como parámetro.',
        },
      ],
    },
  },

  // Pantallas y componentes: nada de Dexie, fetch ni carpetas data/ y sync/.
  {
    files: UI_ZONES,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'dexie', message: 'Usa los puertos de @caja/domain, no Dexie directamente.' },
            { name: 'dexie-react-hooks', message: 'Usa los hooks que consumen los puertos.' },
          ],
          patterns: [
            {
              group: ['**/data', '**/data/**', '**/sync', '**/sync/**'],
              message: 'Las pantallas no importan data/ ni sync/. Usa los puertos vía hooks.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Las pantallas no llaman a la red. Usa los puertos.' },
        { name: 'indexedDB', message: 'Las pantallas no tocan la base local. Usa los puertos.' },
      ],
    },
  },

  // Siempre al final: desactiva reglas que chocan con Prettier.
  prettier,
]);
