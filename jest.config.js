module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],
  testPathIgnorePatterns: [
    '/node_modules/'
  ],
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  setupFilesAfterEnv: ['./test/jest.setup.js'],
  moduleFileExtensions: ['js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx', 'json', 'node'],
  testTimeout: 10000,
  // Added to fix timer issues
  fakeTimers: {
    enableGlobally: true
  },
  // Added to ensure test helpers are available
  moduleDirectories: [
    'node_modules',
    'test',
    'src'
  ]
}; 