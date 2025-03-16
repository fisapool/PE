/**
 * Simple rate limiting utility for API requests
 */
class RateLimiter {
  constructor(maxRequests = 10, timeWindow = 60000) {
    this.maxRequests = maxRequests; // Maximum requests allowed in the time window
    this.timeWindow = timeWindow; // Time window in milliseconds
    this.requestTimestamps = []; // Array to store timestamps of requests
    this.waiting = []; // Queue of waiting promises
  }
  
  /**
   * Check if a request can be made or needs to be throttled
   * @returns {Promise} Resolves when the request can proceed
   */
  async throttle() {
    // Clean up old timestamps
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < this.timeWindow
    );
    
    // If under the limit, allow immediately
    if (this.requestTimestamps.length < this.maxRequests) {
      this.requestTimestamps.push(now);
      return Promise.resolve();
    }
    
    // Otherwise, calculate delay needed
    const oldestTimestamp = this.requestTimestamps[0];
    const timeToWait = this.timeWindow - (now - oldestTimestamp);
    
    // Create a promise that resolves after the required delay
    return new Promise(resolve => {
      const waitPromise = { resolve, timestamp: now };
      this.waiting.push(waitPromise);
      
      // Set a timeout to resolve the promise after the delay
      setTimeout(() => {
        // Remove from waiting queue
        const index = this.waiting.indexOf(waitPromise);
        if (index !== -1) {
          this.waiting.splice(index, 1);
        }
        
        // Add the new timestamp and resolve
        this.requestTimestamps.push(Date.now());
        this.requestTimestamps.shift(); // Remove oldest
        resolve();
      }, timeToWait + 50); // Add 50ms buffer
    });
  }
  
  /**
   * Wraps a function with rate limiting
   * @param {Function} fn Function to wrap
   * @returns {Function} Rate-limited function
   */
  wrap(fn) {
    return async (...args) => {
      await this.throttle();
      return fn(...args);
    };
  }
}

// Create rate limiters for different API endpoints
export const authLimiter = new RateLimiter(5, 60000); // 5 requests per minute
export const proxyRequestLimiter = new RateLimiter(10, 60000); // 10 requests per minute
export const contributionLimiter = new RateLimiter(20, 60000); // 20 requests per minute

// Example usage:
// const limitedFetch = proxyRequestLimiter.wrap(fetch);
// await limitedFetch('https://api.example.com/data'); 
