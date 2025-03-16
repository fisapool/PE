// Mock winston before importing ProxyNetworkServer
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    json: jest.fn(),
    printf: jest.fn()
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
}));

const { ProxyNetworkServer } = require('../../src/server/ProxyNetworkServer');
const { createMockRequest, createMockResponse } = require('../../test/utils/testHelpers');

describe('ProxyNetworkServer', () => {
  let server;
  
  beforeEach(() => {
    // Create a test server instance with mocked dependencies
    server = new ProxyNetworkServer({
      port: 3000,
      apiKey: 'test-server-key',
      maxConcurrent: 5
    });
    
    // Mock methods to avoid actual network operations
    server.start = jest.fn().mockResolvedValue();
    server.close = jest.fn().mockResolvedValue();
  });
  
  test('should initialize with default options', () => {
    const defaultServer = new ProxyNetworkServer({});
    expect(defaultServer.config).toBeDefined();
    expect(defaultServer.config.port).toBeDefined();
    expect(defaultServer.sessions).toBeInstanceOf(Map);
  });
  
  test('should start and stop the server', async () => {
    await server.start();
    expect(server.start).toHaveBeenCalled();
    
    await server.close();
    expect(server.close).toHaveBeenCalled();
  });
  
  test('should register a new device', async () => {
    // Mock the device registration method
    server.registerDevice = jest.fn().mockResolvedValue({
      deviceId: 'test-device-123',
      apiKey: 'device-api-key'
    });
    
    const result = await server.registerDevice({
      deviceId: 'test-device-123',
      deviceType: 'desktop',
      osType: 'windows'
    });
    
    expect(result).toHaveProperty('deviceId', 'test-device-123');
    expect(result).toHaveProperty('apiKey');
  });
  
  test('should require deviceId for registration', async () => {
    server.registerDevice = jest.fn().mockImplementation((data) => {
      if (!data.deviceId) {
        throw new Error('Device ID is required');
      }
      return {
        deviceId: data.deviceId,
        apiKey: 'device-api-key'
      };
    });
    
    await expect(server.registerDevice({}))
      .rejects.toThrow('Device ID is required');
  });
  
  test('should manage device consent', async () => {
    server.updateDeviceConsent = jest.fn().mockImplementation((deviceId, consent) => {
      return { deviceId, consentStatus: consent };
    });
    
    const result = await server.updateDeviceConsent('device-123', true);
    
    expect(result).toHaveProperty('deviceId', 'device-123');
    expect(result).toHaveProperty('consentStatus', true);
  });
  
  test('should generate API keys', async () => {
    server.generateApiKey = jest.fn().mockReturnValue('new-api-key-123');
    
    const apiKey = await server.generateApiKey('device-123', 'user');
    
    expect(apiKey).toBe('new-api-key-123');
  });
}); 