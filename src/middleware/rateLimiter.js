/**
 * Rate Limiter Middleware
 * Protects API endpoints from excessive requests
 * 
 * AI-generated code for the Residential Proxy Project
 */

/**
 * Create a rate limiter middleware with configurable options
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware
 */
function createRateLimiter(options = {}) {
  const store = new Map();
  const limit = options.limit || 60;
  const windowMs = options.windowMs || 60 * 1000; // Default: 1 minute
  const message = options.message || 'Too many requests, please try again later';
  
  /**
   * Rate limiter middleware
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Function} next - Express next function
   */
  return function rateLimiter(req, res, next) {
    const key = options.keyGenerator 
      ? options.keyGenerator(req)
      : req.ip;
    
    const now = Date.now();
    
    // Get or initialize client's request data
    if (!store.has(key)) {
      store.set(key, {
        count: 0,
        resetTime: now + windowMs
      });
    }
    
    const client = store.get(key);
    
    // Check if window has expired and reset if needed
    if (now > client.resetTime) {
      client.count = 0;
      client.resetTime = now + windowMs;
    }
    
    // Check if client has exceeded rate limit
    if (client.count >= limit) {
      // Calculate time until reset
      const retryAfter = Math.ceil((client.resetTime - now) / 1000);
      
      // Set headers
      res.set('Retry-After', retryAfter.toString());
      res.set('X-RateLimit-Limit', limit.toString());
      res.set('X-RateLimit-Remaining', '0');
      res.set('X-RateLimit-Reset', Math.ceil(client.resetTime / 1000).toString());
      
      // Return rate limit error
      return res.status(429).json({
        error: 'Too many requests',
        message: message,
        retryAfter: retryAfter
      });
    }
    
    // Increment request count
    client.count++;
    
    // Add rate limit info to response headers
    res.set('X-RateLimit-Limit', limit.toString());
    res.set('X-RateLimit-Remaining', (limit - client.count).toString());
    res.set('X-RateLimit-Reset', Math.ceil(client.resetTime / 1000).toString());
    
    next();
  };
}

module.exports = { createRateLimiter };
