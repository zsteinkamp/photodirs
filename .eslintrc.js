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
    'space-before-function-paren': 0
  }
}
