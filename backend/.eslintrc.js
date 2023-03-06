module.exports = {
  env: {
    browser: false,
    commonjs: true,
    es2021: true,
    mocha: true
  },
  extends: [
    'standard'
  ],
  parserOptions: {
    ecmaVersion: 12
  },
  rules: {
    semi: [2, 'always'],
    'space-before-function-paren': 0,
    'spaced-comment': 0,
    'no-unused-vars': 'warn',
    'prefer-regex-literals': 0
  }
}
