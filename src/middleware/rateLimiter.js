/**
 * Rate Limiter Middleware
 * Protects API endpoints from excessive requests
 * 
 * AI-generated code for the Residential Proxy Project
 */

const RateLimiter = require('../utils/rate-limiter');

// Create separate limiters for different endpoints
const authLimiter = new RateLimiter(5, 60000); // 5 requests/minute
const proxyLimiter = new RateLimiter(10, 60000); // 10 requests/minute

const createRateLimiterMiddleware = (limiter) => {
  return async (req, res, next) => {
    try {
      await limiter.throttle();
      next();
    } catch (error) {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(error.timeToWait / 1000)
      });
    }
  };
};

module.exports = {
  authRateLimiter: createRateLimiterMiddleware(authLimiter),
  proxyRateLimiter: createRateLimiterMiddleware(proxyLimiter)
};