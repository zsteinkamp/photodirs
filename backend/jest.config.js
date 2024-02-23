export const globals = {
  'ts-jest': {
    tsconfig: 'tsconfig.json',
  },
}
export const moduleFileExtensions = ['ts', 'js']
export const transform = {
  '^.+\\.(ts|tsx)$': 'ts-jest',
}
export const testMatch = ['**/test/**/*.spec.ts']
export const testEnvironment = 'node'
