module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: 'src/.*\\.spec\\.ts$',
  collectCoverageFrom: [
    'src/bookings/**/*.ts',
    '!src/bookings/**/*.module.ts',
    '!src/bookings/**/*.dto.ts',
    '!src/bookings/**/*.spec.ts',
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    './src/bookings/': {
      statements: 50,
      branches: 50,
      functions: 50,
      lines: 50,
    },
  },
};
