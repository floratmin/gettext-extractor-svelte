module.exports = {
  root: true,
  overrides: [
    {
      files: ['./src/**/*.ts'],
      parserOptions: {
        project: ['./src/tsconfig.json'],
      },
    },
    {
      files: ['./tests/**/*.test.ts'],
      parserOptions: {
        project: ['./tests/tsconfig.json'],
      },
      rules: {
        '@typescript-eslint/quotes': 'off',
      },
    },
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig-base.json'],
  },
  plugins: [
    '@typescript-eslint',
    'prettier',
  ],
  extends: [
    'airbnb-typescript',
    'prettier',
  ],
  rules: {
    'prettier/prettier': 2,
    'no-nested-ternary': 'off',
    'max-len': [1, 160],
    '@typescript-eslint/object-curly-spacing': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    'import/extensions': 0,
    'import/no-extraneous-dependencies': 0,
    'react/jsx-filename-extension': 0,
    'no-unused-vars': ['error', { args: 'after-used', argsIgnorePattern: '^_*' }],
    '@typescript-eslint/no-unused-vars': ['error', { args: 'after-used', argsIgnorePattern: '^_*' }],
    'no-unused-expressions': 'off',
    '@typescript-eslint/no-unused-expressions': 'off',
    '@typescript-eslint/quotes': ['error', 'single', { allowTemplateLiterals: true }],
    '@typescript-eslint/keyword-spacing': 'off',
  },
};
