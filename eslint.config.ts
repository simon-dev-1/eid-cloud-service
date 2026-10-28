import importPlugin from 'eslint-plugin-import';
import eslintUnusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const baseConfig = [
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  { languageOptions: { globals: globals.node } },
  ...tseslint.configs.recommended,
  {
    plugins: {
      import: importPlugin,
      'unused-imports': eslintUnusedImports,
    },
    rules: {
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: ['variable', 'function', 'parameter'],
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: ['typeLike'],
          format: ['PascalCase'],
        },
        {
          selector: ['variable'],
          modifiers: ['const', 'readonly', 'global'],
          format: ['UPPER_CASE'],
        },
        {
          selector: ['property'],
          format: null,
        },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/array-type': ['error', { default: 'array' }],
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling'],
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'linebreak-style': ['error', 'unix'],
      curly: ['error', 'all'],
      'unused-imports/no-unused-imports': 'error',
    },
  },
  {
    files: ['src/**/*.{js,mjs,cjs,ts}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportDeclaration[source.value=/\\.ts$/]',
          message:
            'Importing with file extension .ts in src files is not allowed. Use .js instead.',
        },
      ],
    },
  },
  {
    files: ['tests/**/*.{js,mjs,cjs,ts}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportDeclaration[source.value=/\\.js$/]',
          message:
            'Importing with file extension .js in test files is not allowed. Use .ts instead.',
        },
      ],
    },
  },
  { ignores: ['dist', 'reports', 'coverage', 'node_modules'] },
];

export default baseConfig;
