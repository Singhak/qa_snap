module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.integration.test.ts'],
  // Setup files for database, API mocks, etc.
  setupFilesAfterEnv: [], // Consider adding a setup file like ['<rootDir>/jest.integration.setup.js']
  // Add other integration test specific configurations here
};