/**
 * Tests for proxy configuration module
 */

// Mock environment before importing the module
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

describe('Proxy Configuration', () => {
  let originalEnv;
  
  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Reset modules between tests
    jest.resetModules();
  });
  
  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });
  
  test('should load default configuration values', () => {
    // Set minimal env variables
    process.env.NODE_ENV = 'test';
    
    // Import the module
    const proxyConfig = require('../../../src/config/proxyConfig');
    
    // Check critical default values
    expect(proxyConfig).toBeDefined();
    expect(proxyConfig.port).toBeDefined();
    expect(proxyConfig.providers).toBeDefined();
    expect(proxyConfig.providers.primary).toBeDefined();
  });
  
  test('should override defaults with environment variables', () => {
    // Set custom env variables
    process.env.NODE_ENV = 'test';
    process.env.PORT = '9999';
    process.env.PROXY_PRIMARY_URL = 'https://custom-proxy.example.com';
    process.env.PROXY_MAX_CONNECTIONS = '25';
    
    // Import the module
    const proxyConfig = require('../../../src/config/proxyConfig');
    
    // Check that env variables were applied
    expect(proxyConfig.port).toBe(9999);
    expect(proxyConfig.providers.primary.url).toBe('https://custom-proxy.example.com');
    expect(proxyConfig.providers.primary.maxConnections).toBe(25);
  });
  
  test('should load environment-specific configurations', () => {
    // Test production config
    process.env.NODE_ENV = 'production';
    
    // Import the module
    const productionConfig = require('../../../src/config/proxyConfig');
    
    // Should have production-specific settings
    expect(productionConfig.logLevel).toBe('info');
    
    // Reset modules
    jest.resetModules();
    
    // Test development config
    process.env.NODE_ENV = 'development';
    
    // Import the module again
    const devConfig = require('../../../src/config/proxyConfig');
    
    // Should have development-specific settings
    expect(devConfig.logLevel).toBe('debug');
  });
  
  test('should validate configuration values', () => {
    // Set invalid env variables
    process.env.NODE_ENV = 'test';
    process.env.PROXY_MAX_CONNECTIONS = 'not-a-number';
    
    // Import should throw or fix the invalid value
    const proxyConfig = require('../../../src/config/proxyConfig');
    
    // Check that validation was applied
    expect(typeof proxyConfig.providers.primary.maxConnections).toBe('number');
  });
}); 