module.exports = {
  extends: [
    //"eslint:recommended",
    //"plugin:@typescript-eslint/recommended",
    'plugin:prettier/recommended',
    //'prettier',
  ],
  ignorePatterns: ['**/node_modules/', '/dist/', '/lib/'],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
  },
  rules: {
    /*
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    */
    'prettier/prettier': 'error',
  },
  plugins: ['prettier'],
  root: true,
}
