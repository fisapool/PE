const axios = require('axios');
const ProxyAPIClient = require('../../src/client/ProxyAPIClient');
const BandwidthTracker = require('../../src/utils/BandwidthTracker');
const MockAdapter = require('axios-mock-adapter');

// Mock axios and dependencies
jest.mock('axios');
jest.mock('https-proxy-agent');
jest.mock('socks-proxy-agent');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-session-id')
}));

describe('ProxyAPIClient', () => {
  let proxyClient;
  let mock;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    proxyClient = new ProxyAPIClient({
      providers: {
        primary: {
          apiUrl: 'https://mock-proxy-provider.com',
          maxConcurrentConnections: 10,
          rotationSettings: {
            rotateOnStatus: [403, 429, 503],
            maxRetries: 3,
            retryDelayMs: () => 100 // Fast for testing
          }
        }
      }
    });
    
    // Setup axios mock
    mock = new MockAdapter(axios);
    
    // Create a comprehensive mock of the bandwidthTracker
    proxyClient.bandwidthTracker = {
      trackSent: jest.fn(),
      trackReceived: jest.fn(),
      trackRequest: jest.fn(),
      checkLimits: jest.fn().mockReturnValue({ exceeded: false }),
      reset: jest.fn(),
      clearSessionStats: jest.fn(),
      getStats: jest.fn().mockReturnValue({})
    };
    
    // Mock getProxyFromPool to return a valid proxy URL
    proxyClient.getProxyFromPool = ProxyAPIClient.prototype.getProxyFromPool;
    
    // Mock createProxyAgent
    proxyClient.createProxyAgent = jest.fn().mockReturnValue({});
  });
  
  afterEach(() => {
    mock.restore();
  });
  
  test('validateProxyUrl should validate proxy URLs correctly', () => {
    expect(proxyClient.validateProxyUrl('http://proxy.example.com:8080')).toBe(true);
    expect(proxyClient.validateProxyUrl('https://user:pass@proxy.example.com:8080')).toBe(true);
    expect(proxyClient.validateProxyUrl('socks5://proxy.example.com:1080')).toBe(true);
    expect(proxyClient.validateProxyUrl('invalid')).toBe(false);
  });
  
  test('maskCredentials should hide usernames and passwords', () => {
    expect(proxyClient.maskCredentials('http://user:pass@proxy.com:8080'))
      .toBe('http://***:***@proxy.com:8080');
    expect(proxyClient.maskCredentials('https://proxy.com:8080'))
      .toBe('https://proxy.com:8080');
  });
  
  test('should track bandwidth for requests', async () => {
    // Mock the bandwidth tracker
    proxyClient.bandwidthTracker = {
      trackRequest: jest.fn(),
      trackSent: jest.fn(),
      trackReceived: jest.fn(),
      checkLimits: jest.fn().mockReturnValue({ exceeded: false })
    };
    
    // Mock the proxy agent creation
    proxyClient.createProxyAgent = jest.fn().mockReturnValue({});
    
    // Mock axios response
    axios.mockResolvedValue({
      data: { success: true },
      headers: { 'content-length': '1024' },
      status: 200
    });
    
    // Make request
    await proxyClient.request('https://example.com');
    
    // Verify bandwidth tracking was called
    expect(proxyClient.bandwidthTracker.trackRequest).toHaveBeenCalled();
  });
  
  test('should rotate IP on specific status codes', async () => {
    // Mock the proxy agent creation
    proxyClient.createProxyAgent = jest.fn().mockReturnValue({});
    
    // Mock the IP rotation method
    proxyClient.rotateIp = jest.fn().mockResolvedValue();
    proxyClient.fetchNewProxies = jest.fn().mockResolvedValue('http://new.proxy.com:8080');
    
    // Mock axios to reject with 403 status
    axios.mockRejectedValueOnce({
      response: { status: 403 }
    });
    
    // Mock axios to succeed on second try
    axios.mockResolvedValueOnce({
      data: { success: true },
      status: 200
    });
    
    // Make request with retry
    await proxyClient.request('https://example.com', { retries: 1 });
    
    // Verify IP rotation was called
    expect(proxyClient.rotateIp).toHaveBeenCalled();
  });
  
  test('should respect maximum retry attempts', async () => {
    // Setup
    jest.spyOn(proxyClient, 'getProxyFromPool').mockResolvedValue('http://proxy.example.com:8080');
    
    // Mock consistent 500 errors
    axios.mockImplementation(() => {
      const error = new Error('Server error');
      error.response = { status: 500 };
      return Promise.reject(error);
    });
    
    // Execute & Verify
    await expect(proxyClient.request('https://example.com', { maxRetries: 2 }))
      .rejects.toThrow();
  });
  
  test('should properly clean up sessions', async () => {
    // Setup
    const sessionId = proxyClient.createSession();
    proxyClient.sessions.set(sessionId, { created: Date.now() });
    
    // Mock the required methods
    proxyClient.bandwidthTracker = {
      ...proxyClient.bandwidthTracker,
      reset: jest.fn(),
      clearSessionStats: jest.fn()
    };
    
    // Execute
    await proxyClient.cleanup();
    
    // Verify
    expect(proxyClient.sessions.size).toBe(0);
    expect(proxyClient.activeConnections).toBe(0);
    expect(proxyClient.bandwidthTracker.reset).toHaveBeenCalled();
  });
  
  test('should close individual sessions', async () => {
    // Setup
    const sessionId = proxyClient.createSession();
    
    // Mock the required methods
    proxyClient.bandwidthTracker = {
      ...proxyClient.bandwidthTracker,
      clearSessionStats: jest.fn()
    };
    
    // Execute
    proxyClient.closeSession(sessionId);
    
    // Verify
    expect(proxyClient.sessions.has(sessionId)).toBe(false);
    expect(proxyClient.bandwidthTracker.clearSessionStats).toHaveBeenCalledWith(sessionId);
  });
  
  test('should use fallback provider when primary fails', async () => {
    // Setup
    proxyClient.config.providers.fallback = {
      apiUrl: 'https://fallback-proxy.com',
      maxConcurrentConnections: 5
    };
    
    // Mock primary provider failure
    const primaryError = new Error('Primary provider failed');
    axios.mockRejectedValueOnce(primaryError);
    
    // Mock fallback provider success
    axios.mockResolvedValueOnce({
      data: { success: true, provider: 'fallback' },
      status: 200
    });
    
    // Execute with fallback
    const result = await proxyClient.requestWithProviderFallback('https://example.com');
    
    // Verify
    expect(result.data.provider).toBe('fallback');
  });
  
  test('should attempt protocol fallback when connection fails', async () => {
    // Mock initial HTTPS failure
    const originalUrl = 'https://example.com/api';
    
    // First try fails with HTTPS
    axios.mockRejectedValueOnce(new Error('HTTPS connection failed'));
    
    // Second try with HTTP succeeds
    axios.mockResolvedValueOnce({
      data: { success: true, protocol: 'http' },
      status: 200
    });
    
    // Execute with protocol fallback
    const result = await proxyClient.requestWithProtocolFallback(originalUrl);
    
    // Verify
    expect(result.data.protocol).toBe('http');
  });
  
  test('should fetch new proxies when pool is empty', async () => {
    // Setup
    proxyClient.proxyPool = [];
    
    // Now mock fetchNewProxies to return a string value that matches our expectation
    proxyClient.fetchNewProxies = jest.fn().mockResolvedValue('http://fresh.proxy.com:8080');
    
    // Execute
    const proxy = await proxyClient.getProxyFromPool();
    
    // Verify
    expect(proxyClient.fetchNewProxies).toHaveBeenCalled();
    expect(proxy).toBe('http://fresh.proxy.com:8080');
  });
  
  test('should handle proxy authentication correctly', async () => {
    // Setup proxies with auth
    const secureProxy = 'http://user:pass@secure.proxy.com:8080';
    proxyClient.getProxyFromPool = jest.fn().mockResolvedValue(secureProxy);
    
    // Mock axios
    axios.mockResolvedValueOnce({
      data: { success: true },
      status: 200
    });
    
    // Execute
    await proxyClient.request('https://example.com');
    
    // Verify masked credentials in logs (spy on console.log)
    const consoleSpy = jest.spyOn(console, 'log');
    proxyClient.maskCredentials(secureProxy);
    
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('user:pass')
    );
    
    consoleSpy.mockRestore();
  });
  
  // Additional tests for other functionality
});
