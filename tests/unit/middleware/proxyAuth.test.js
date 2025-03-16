/**
 * Tests for proxy authentication middleware
 */

const proxyAuth = require('../../../src/middleware/proxyAuth');
const jwt = require('jsonwebtoken');

// Mock request and response objects
const mockRequest = (headers = {}, body = {}) => ({
  headers,
  body
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Mock next function
const mockNext = jest.fn();

describe('ProxyAuth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('should pass if valid JWT token is provided', () => {
    // Mock JWT verification
    jest.spyOn(jwt, 'verify').mockImplementation(() => ({
      userId: 'user123',
      exp: Math.floor(Date.now() / 1000) + 3600
    }));
    
    const req = mockRequest({ authorization: 'Bearer valid-token' });
    const res = mockResponse();
    
    proxyAuth(req, res, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.userId).toBe('user123');
  });
  
  test('should return 401 if no authorization header is provided', () => {
    const req = mockRequest({});
    const res = mockResponse();
    
    proxyAuth(req, res, mockNext);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.any(String)
    }));
    expect(mockNext).not.toHaveBeenCalled();
  });
  
  test('should return 401 if token is invalid', () => {
    // Mock JWT verification to throw error
    jest.spyOn(jwt, 'verify').mockImplementation(() => {
      throw new Error('Invalid token');
    });
    
    const req = mockRequest({ authorization: 'Bearer invalid-token' });
    const res = mockResponse();
    
    proxyAuth(req, res, mockNext);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.any(String)
    }));
    expect(mockNext).not.toHaveBeenCalled();
  });
  
  test('should return 401 if token is expired', () => {
    // Mock JWT verification to throw TokenExpiredError
    jest.spyOn(jwt, 'verify').mockImplementation(() => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';
      throw error;
    });
    
    const req = mockRequest({ authorization: 'Bearer expired-token' });
    const res = mockResponse();
    
    proxyAuth(req, res, mockNext);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('expired')
    }));
    expect(mockNext).not.toHaveBeenCalled();
  });
  
  test('should handle API key authentication if JWT is not present', () => {
    // If your auth middleware also supports API keys, test that here
    const req = mockRequest({
      'x-api-key': 'valid-api-key'
    });
    const res = mockResponse();
    
    // Mock API key validation logic
    // This depends on your implementation
    
    proxyAuth(req, res, mockNext);
    
    // Assert based on your implementation
  });
}); 