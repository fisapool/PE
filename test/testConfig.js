// Test configuration helper

// Mock environment variables for tests
process.env.PROXY_API_KEY = 'test-api-key';
process.env.MAX_RETRIES = '3';
process.env.MAX_CONCURRENT = '5';

// Mock common dependencies
const mockAxios = require('jest-mock-axios').default;

// Helper to create response mocks
const createMockResponse = (status = 200, data = {}, headers = {}) => ({
  status,
  data,
  headers
});

// Helper to create error mocks
const createMockError = (message, status = 500, code = null) => {
  const error = new Error(message);
  if (status) {
    error.response = { status };
  }
  if (code) {
    error.code = code;
  }
  return error;
};

// Reset all mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
  mockAxios.reset();
});

module.exports = {
  mockAxios,
  createMockResponse,
  createMockError
}; 