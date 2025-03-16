// Common test helpers and fixes

/**
 * Creates a mock response object for Express handlers
 */
function createMockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  return res;
}

/**
 * Creates a mock request object for Express handlers
 */
function createMockRequest(options = {}) {
  return {
    ip: options.ip || '127.0.0.1',
    path: options.path || '/',
    method: options.method || 'GET',
    headers: options.headers || {},
    query: options.query || {},
    params: options.params || {},
    body: options.body || {},
    cookies: options.cookies || {},
    ...options
  };
}

/**
 * Waits for promises in the event loop to resolve
 * Useful for testing async code that doesn't return promises
 */
async function flushPromises() {
  return new Promise(resolve => setImmediate(resolve));
}

/**
 * Creates mock localStorage for browser tests
 */
function setupMockLocalStorage() {
  const store = {};
  
  const mockLocalStorage = {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => {
        delete store[key];
      });
    }),
    key: jest.fn(idx => Object.keys(store)[idx] || null),
    get length() {
      return Object.keys(store).length;
    }
  };
  
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
  });
  
  return mockLocalStorage;
}

/**
 * Creates a mock DOM element for testing
 */
function createMockElement(tagName = 'div', attributes = {}, children = []) {
  const element = document.createElement(tagName);
  
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'innerHTML') {
      element.innerHTML = value;
    } else {
      element.setAttribute(key, value);
    }
  });
  
  children.forEach(child => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  });
  
  return element;
}

/**
 * Safely access nested properties without throwing
 */
function safeGet(obj, path, defaultValue = undefined) {
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue;
    }
    result = result[key];
  }
  
  return result === undefined ? defaultValue : result;
}

/**
 * Test Helper Functions
 * Utility functions for testing
 */

/**
 * Create mock server for testing
 * @returns {Object} - Mock server
 */
function createMockServer() {
  return {
    listen: jest.fn().mockImplementation((port, callback) => {
      if (callback) callback();
      return this;
    }),
    close: jest.fn().mockImplementation(callback => {
      if (callback) callback();
      return this;
    })
  };
}

/**
 * Wait for specified time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  createMockResponse,
  createMockRequest,
  flushPromises,
  setupMockLocalStorage,
  createMockElement,
  safeGet,
  createMockServer,
  wait
}; 