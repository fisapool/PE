/**
 * Tests for rate limiter middleware
 */

const { createRateLimiter } = require('../../../src/middleware/rateLimiter');
const { createMockRequest, createMockResponse } = require('../../../test/utils/testHelpers');

// Add fake timers setup 
jest.useFakeTimers();

describe('Rate Limiter Middleware', () => {
  let rateLimiter;
  let req;
  let res;
  let next;

  beforeEach(() => {
    // Create a rate limiter with a limit of 5 requests per minute
    rateLimiter = createRateLimiter({ 
      limit: 5, 
      windowMs: 60 * 1000, // 1 minute
      message: 'You have exceeded the rate limit'
    });
    
    req = createMockRequest({
      ip: '127.0.0.1',
      path: '/api/test'
    });
    
    res = createMockResponse();
    next = jest.fn();
  });

  test('should allow requests under the rate limit', () => {
    // Make requests up to the limit
    for (let i = 0; i < 5; i++) {
      rateLimiter(req, res, next);
    }
    
    expect(next).toHaveBeenCalledTimes(5);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should block requests over the rate limit', () => {
    // Make requests up to the limit
    for (let i = 0; i < 5; i++) {
      rateLimiter(req, res, next);
    }
    
    // Last request should be blocked
    rateLimiter(req, res, next);
    
    expect(next).toHaveBeenCalledTimes(5); // Only the first 5 calls succeed
    expect(res.status).toHaveBeenCalledWith(429);
    // Fix the expectation to match the actual structure
    expect(res.json).toHaveBeenCalledWith({
      error: "Too many requests", 
      message: "You have exceeded the rate limit", 
      retryAfter: 60
    });
  });

  test('should apply different limits to different endpoints', () => {
    const apiLimiter = createRateLimiter({ 
      limit: 3, 
      windowMs: 60 * 1000,
      message: 'API rate limit exceeded'
    });
    
    const adminLimiter = createRateLimiter({ 
      limit: 10, 
      windowMs: 60 * 1000,
      message: 'Admin rate limit exceeded' 
    });
    
    const apiReq = createMockRequest({ ip: '127.0.0.1', path: '/api' });
    const adminReq = createMockRequest({ ip: '127.0.0.1', path: '/admin' });
    
    // Make API requests up to limit
    for (let i = 0; i < 3; i++) {
      apiLimiter(apiReq, res, next);
    }
    
    // Next API request should be blocked
    apiLimiter(apiReq, res, next);
    expect(res.status).toHaveBeenCalledWith(429);
    
    // Reset mock
    res.status.mockClear();
    res.json.mockClear();
    
    // Admin requests should still work up to admin limit
    for (let i = 0; i < 10; i++) {
      adminLimiter(adminReq, res, next);
    }
    
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should reset rate limits after window expires', () => {
    // Make requests up to the limit
    for (let i = 0; i < 5; i++) {
      rateLimiter(req, res, next);
    }
    
    // Should be blocked now
    rateLimiter(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);
    
    // Reset mocks
    next.mockClear();
    res.status.mockClear();
    res.json.mockClear();
    
    // Fast-forward time past rate limit window
    jest.advanceTimersByTime(60 * 1000 + 1000); // Add 1s buffer
    
    // Should be allowed again
    rateLimiter(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
}); 