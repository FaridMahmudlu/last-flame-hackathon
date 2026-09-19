import expo from 'eslint-config-expo/flat.js';

export default [
  ...expo,
  { ignores: ['dist/**', '.expo/**', 'test-results/**', 'playwright-report/**', 'node_modules/**'] },
];
