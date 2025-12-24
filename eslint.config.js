const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');

module.exports = [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // Member ordering for classes
      '@typescript-eslint/member-ordering': [
        'error',
        {
          default: [
            // Static fields
            'public-static-field',
            'protected-static-field',
            'private-static-field',

            // Instance fields
            'public-instance-field',
            'protected-instance-field',
            'private-instance-field',

            // Constructors
            'constructor',

            // Getters/Setters
            'public-get',
            'public-set',
            'protected-get',
            'protected-set',
            'private-get',
            'private-set',

            // Public methods
            'public-instance-method',

            // Protected methods
            'protected-instance-method',

            // Private methods
            'private-instance-method',

            // Static methods
            'public-static-method',
            'protected-static-method',
            'private-static-method',
          ],
        },
      ],
    },
  },
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  },
];
