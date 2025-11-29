import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['node_modules', '.next/**', 'spacetime-server/**', 'src/spacetime_module_bindings/**']
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module'
    },
    rules: {}
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    },
    rules: {}
  }
];