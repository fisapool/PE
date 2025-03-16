/**
 * Configuration tests
 */

const proxyConfig = require('../src/config/proxyConfig');

describe('Proxy Configuration', () => {
  test('should have required configuration properties', () => {
    expect(proxyConfig).toBeDefined();
    expect(proxyConfig.providers).toBeDefined();
  });
  
  test('should load environment variables if available', () => {
    // This is a basic test - in a real test you might mock process.env
    expect(proxyConfig.providers.primary).toBeDefined();
  });
});
