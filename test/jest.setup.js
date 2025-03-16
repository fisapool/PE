/**
 * Jest setup file
 * Configure test environment
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.API_KEY = 'test-api-key';

// Configure Jest timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise
if (process.env.JEST_SILENT) {
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  };
}

// Add globals for all tests
global.testUtils = require('./utils/testHelpers');

// Fix for axios mock issues
jest.mock('axios');

// Fix for fetch API in tests
global.fetch = jest.fn(() => 
  Promise.resolve({
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    ok: true,
    status: 200,
    headers: new Map()
  })
);

// Mock console to avoid noise during tests
global.console = {
  ...console,
  // Comment these out to debug tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn()
};

// Fix for timing issues
jest.setTimeout(10000); // Increase timeout for all tests

// Fix for localStorage in jsdom
if (typeof window !== 'undefined') {
  // Setup localStorage mock
  if (!window.localStorage) {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      },
      writable: true
    });
  }
  
  // Setup matchMedia mock
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      })),
      writable: true
    });
  }
}

// Silence expected prop-type errors
const originalConsoleError = console.error;
console.error = message => {
  if (message.includes('Warning: Failed prop type') || 
      message.includes('Invalid prop')) {
    return;
  }
  originalConsoleError(message);
};

// Add these to your jest config file
// setupFilesAfterEnv: ['<rootDir>/test/jest.setup.js'] 