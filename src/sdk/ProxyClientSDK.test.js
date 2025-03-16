/**
 * Tests for the ProxyClientSDK
 */

// Mock dependencies first, before requiring the module
const mockAxios = {
  get: jest.fn().mockResolvedValue({ status: 200, data: {} }),
  post: jest.fn().mockResolvedValue({ status: 200, data: {} }),
  default: {
    get: jest.fn().mockResolvedValue({ status: 200, data: {} }),
    post: jest.fn().mockResolvedValue({ status: 200, data: {} })
  }
};

jest.mock('axios', () => mockAxios);

const ProxyClientSDK = require('./ProxyClientSDK');

describe('ProxyClientSDK', () => {
  let sdk;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create SDK instance
    sdk = new ProxyClientSDK({
      appId: 'test-app',
      appKey: 'test-key',
      apiKey: 'test-api-key'
    });
  });
  
  test('should initialize correctly', () => {
    expect(sdk).toBeDefined();
    expect(sdk.options.appId).toBe('test-app');
    expect(sdk.options.appKey).toBe('test-key');
    expect(sdk.apiKey).toBe('test-api-key');
  });
  
  test('should initialize the SDK', async () => {
    mockAxios.get.mockResolvedValueOnce({ status: 200, data: { status: 'ok' } });
    
    await sdk.initialize();
    
    expect(mockAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('/health'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': expect.stringContaining('test-api-key')
        })
      })
    );
  });
  
  test('should handle initialization errors', async () => {
    mockAxios.get.mockRejectedValueOnce(new Error('Connection failed'));
    
    await expect(sdk.initialize()).rejects.toThrow('Connection failed');
  });
  
  // Add more tests as needed
}); 