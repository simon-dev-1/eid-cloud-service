import { createDefaultEsmPreset } from 'ts-jest';

const presetConfig = createDefaultEsmPreset({
  babelConfig: './babel.config.json',
  tsconfig: 'tsconfig.jest.json',
});

const jestConfig = {
  ...presetConfig,
  testMatch: '**/tests/**/*.test.ts',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  moduleFileExtensions: ['ts', 'js'],
  testEnvironment: 'node',
  coverageDirectory: 'reports/coverage',
  collectCoverageFrom: ['src/**/*.{ts,js}', '!**/node_modules/**'],
  collectCoverage: true,
  coverageReporters: ['clover', 'json', 'lcov', 'text', 'text-summary'],
  coveragePathIgnorePatterns: ['src/index.ts'],
};

export default jestConfig;
