import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'], // Include .test.ts files outside __tests__
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  roots: ['<rootDir>'],
};

export default config;
