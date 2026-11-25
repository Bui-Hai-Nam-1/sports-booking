module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$',
  collectCoverageFrom: ['src/venues/venues.service.ts'],
  coverageThreshold: {
    './src/venues/venues.service.ts': {
      statements: 50,
    },
  },
};
