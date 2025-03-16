const request = require('supertest');
const app = require('./index');
const { ProxyNetworkServer } = require('./ProxyNetworkServer');

// Use jest.mock to mock the ProxyNetworkServer module
jest.mock('./ProxyNetworkServer');

describe('Server Index', () => {
  beforeEach(() => {
    // Clear mocks between tests
    jest.clearAllMocks();
  });
  
  test('should initialize ProxyNetworkServer with config', () => {
    // Verify the ProxyNetworkServer constructor was called
    expect(ProxyNetworkServer).toHaveBeenCalledWith(
      expect.objectContaining({
        port: expect.any(Number)
      })
    );
  });
  
  test('should start the server on initialization', () => {
    // Get the mocked instance
    const mockServer = ProxyNetworkServer.mock.instances[0];
    
    // Verify start was called
    expect(mockServer.start).toHaveBeenCalled();
  });

  describe('Server initialization', () => {
    test('should initialize server with config from environment', () => {
      // Mock process.env
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        PORT: '3001',
        PROXY_API_KEY: 'test-env-key',
        MAX_CONCURRENT: '5'
      };
      
      // Re-require the module to pick up new env vars
      jest.resetModules();
      const freshIndex = require('./index');
      
      expect(ProxyNetworkServer).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 3001,
          apiKey: 'test-env-key',
          maxConcurrent: 5
        })
      );
      
      // Restore env
      process.env = originalEnv;
    });
  });

  describe('API routes', () => {
    test('should return server status', async () => {
      // Mock server.getStatus method
      ProxyNetworkServer.mock.instances[0].getStatus = jest.fn().mockReturnValue({
        uptime: 3600,
        sessions: 5,
        activeRequests: 2
      });
      
      const response = await request(app).get('/api/status');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('uptime', 3600);
      expect(response.body).toHaveProperty('sessions', 5);
    });
    
    test('should create new sessions', async () => {
      // Mock createProxySession method
      ProxyNetworkServer.mock.instances[0].createProxySession = jest.fn().mockResolvedValue({
        sessionId: 'new-api-session',
        proxyUrl: 'http://proxy:8080'
      });
      
      const response = await request(app)
        .post('/api/sessions')
        .send({ country: 'US' });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('sessionId', 'new-api-session');
      expect(ProxyNetworkServer.mock.instances[0].createProxySession)
        .toHaveBeenCalledWith(expect.objectContaining({ country: 'US' }));
    });
    
    test('should close sessions', async () => {
      // Mock closeProxySession method
      ProxyNetworkServer.mock.instances[0].closeProxySession = jest.fn().mockResolvedValue({
        success: true
      });
      
      const response = await request(app)
        .delete('/api/sessions/session-to-close-via-api');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(ProxyNetworkServer.mock.instances[0].closeProxySession)
        .toHaveBeenCalledWith('session-to-close-via-api');
    });
    
    test('should handle proxy requests', async () => {
      // This is more complex to test - basic structure shown
      const mockResponse = {
        data: 'proxy response',
        headers: { 'content-type': 'text/plain' },
        status: 200
      };
      
      ProxyNetworkServer.mock.instances[0].executeRequest = jest.fn().mockResolvedValue(mockResponse);
      
      const response = await request(app)
        .post('/api/proxy')
        .send({
          sessionId: 'test-session',
          url: 'https://example.com',
          method: 'GET'
        });
      
      expect(response.status).toBe(200);
      expect(ProxyNetworkServer.mock.instances[0].executeRequest)
        .toHaveBeenCalledWith('test-session', expect.any(Object));
    });
    
    test('should handle errors gracefully', async () => {
      // Mock method to throw error
      ProxyNetworkServer.mock.instances[0].createProxySession = jest.fn().mockRejectedValue(
        new Error('API key invalid')
      );
      
      const response = await request(app)
        .post('/api/sessions')
        .send({ country: 'US' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      // Ensure credentials are masked
      expect(response.body.error).not.toContain('API key');
    });
  });
}); 