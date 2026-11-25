import expoConfig from 'eslint-config-expo/flat.js';
import prettierConfig from 'eslint-config-prettier';

const config = [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.expo/**',
      '**/.turbo/**',
      'apps/app/android/**',
      'design/**',
    ],
  },
  ...expoConfig,
  prettierConfig,
];

export default config;
