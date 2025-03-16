/**
 * Proxy API Client for managing residential proxies
 * AI-generated code for the Residential Proxy Project
 */

const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { URL } = require('url');
const proxyConfig = require('../config/proxyConfig');
const { v4: uuidv4 } = require('uuid');
const BandwidthTracker = require('../utils/BandwidthTracker');
const RotatingProxyList = require('../utils/RotatingProxyList');

class ProxyAPIClient {
  constructor(options = {}) {
    this.config = {
      ...proxyConfig,
      ...options
    };
    
    this.activeConnections = 0;
    this.proxyPool = [];
    this.healthyProxies = new Map();
    this.bandwidthTracker = new BandwidthTracker();
    this.sessions = new Map();
  }
  
  /**
   * Validates a proxy URL before use
   * @param {string} proxyUrl - The proxy URL to validate
   * @returns {boolean} - Whether the URL is valid
   */
  validateProxyUrl(proxyUrl) {
    try {
      const url = new URL(proxyUrl);
      return ['http:', 'https:', 'socks5:'].includes(url.protocol);
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Creates a proxy agent for making requests
   * @param {string} proxyUrl - The proxy URL
   * @returns {HttpsProxyAgent} - The proxy agent
   */
  createProxyAgent(proxyUrl) {
    if (!this.validateProxyUrl(proxyUrl)) {
      throw new Error('Invalid proxy URL format');
    }
    
    return new HttpsProxyAgent(proxyUrl);
  }
  
  /**
   * Creates a new session for tracking requests
   * @returns {string} - Session ID
   */
  createSession() {
    const sessionId = uuidv4();
    this.sessions.set(sessionId, {
      created: Date.now(),
      lastActivity: Date.now(),
      proxyUrl: null,
      requestCount: 0
    });
    return sessionId;
  }
  
  /**
   * Makes a request through the proxy with fallback and retry logic
   * @param {string} url - The target URL
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - The response
   */
  async request(url, options = {}) {
    // Create a session ID if not provided
    const sessionId = options.sessionId || this.createSession();
    
    try {
      this.activeConnections++;
      
      // Get a proxy from the pool
      const proxy = await this.getProxyFromPool();
      
      if (!proxy) {
        throw new Error('No proxy available');
      }
      
      // Set default retry options
      const retrySettings = {
        maxRetries: options.maxRetries || this.config.providers.primary.rotationSettings?.maxRetries || 3,
        retryStatuses: options.retryStatuses || this.config.providers.primary.rotationSettings?.rotateOnStatus || [403, 429, 500, 502, 503, 504],
        retryDelay: options.retryDelay || this.config.providers.primary.rotationSettings?.retryDelayMs || (() => 1000)
      };
      
      // Attempt the request with retries
      for (let attempt = 0; attempt <= retrySettings.maxRetries; attempt++) {
        try {
          // Create an agent for the proxy
          const agent = this.createProxyAgent(proxy);
          
          // Prepare request data
          const method = options.method || 'GET';
          const headers = options.headers || {};
          const requestData = options.data || null;
          
          // Track outgoing bandwidth
          const requestSize = !requestData ? 0 
            : typeof requestData === 'string' 
              ? Buffer.byteLength(requestData, 'utf8')
              : Buffer.byteLength(JSON.stringify(requestData), 'utf8');
          
          // Use the trackRequest method which handles both sent and received
          this.bandwidthTracker.trackRequest(sessionId, 
            { data: requestData }, 
            {} // Empty response object for now
          );
          
          // Implement request with proxy
          const response = await axios({
            url,
            method,
            headers,
            data: requestData,
            httpsAgent: agent,
            httpAgent: agent,
            ...options.axiosOptions
          });
          
          // Track incoming bandwidth
          const responseSize = response.data
            ? (typeof response.data === 'string'
              ? Buffer.byteLength(response.data, 'utf8')
              : Buffer.byteLength(JSON.stringify(response.data), 'utf8'))
            : 0;
          
          // Update the response size in our bandwidth tracker
          this.bandwidthTracker.trackRequest(sessionId, 
            {}, // Empty request object since we already tracked the request
            { data: response.data }
          );
          
          // Check if bandwidth limits have been exceeded
          const limits = this.bandwidthTracker.checkLimits(sessionId);
          if (limits.exceeded) {
            console.warn(`Bandwidth limit exceeded for session ${sessionId}`);
          }
          
          return response;
        } catch (error) {
          // Check if the error status code requires IP rotation
          if (error.response && retrySettings.retryStatuses.includes(error.response.status)) {
            if (attempt < retrySettings.maxRetries) {
              console.log(`Rotating IP due to status ${error.response.status} (attempt ${attempt + 1}/${retrySettings.maxRetries})`);
              await this.rotateIp();
              
              // Apply delay before retry
              const delay = typeof retrySettings.retryDelay === 'function'
                ? retrySettings.retryDelay(attempt)
                : retrySettings.retryDelay;
              
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          }
          
          // No more retries or not a retry-able error
          throw error;
        }
      }
    } finally {
      this.activeConnections--;
      
      // Periodically clean up old sessions
      if (Math.random() < 0.1) { // ~10% chance to run cleanup
        this.cleanup();
      }
    }
  }
  
  /**
   * Masks credentials in proxy URLs for logging and display
   * @param {string} proxyUrl - The full proxy URL with credentials
   * @returns {string} - URL with masked credentials
   */
  maskCredentials(proxyUrl) {
    if (!proxyUrl) return proxyUrl;
    try {
      const url = new URL(proxyUrl);
      if (url.username || url.password) {
        return proxyUrl.replace(/\/\/(.*):(.*)@/, '//***:***@');
      }
      return proxyUrl;
    } catch (error) {
      return proxyUrl;
    }
  }
  
  /**
   * Gets a proxy from the pool or requests a new one
   * @returns {Promise<string>} - A proxy URL
   */
  async getProxyFromPool() {
    // Implementation would get a proxy from pool or fetch new one
    // This is a simplified placeholder
    if (this.proxyPool.length > 0) {
      // Choose a healthy proxy if available
      const healthyProxies = [...this.proxyPool].filter(proxy => 
        this.healthyProxies.has(proxy)
      );
      
      if (healthyProxies.length > 0) {
        return healthyProxies[Math.floor(Math.random() * healthyProxies.length)];
      }
      
      return this.proxyPool[Math.floor(Math.random() * this.proxyPool.length)];
    }
    
    // Fetch new proxies (implementation would call proxy provider API)
    return this.fetchNewProxies();
  }
  
  /**
   * Fetches new proxies from the provider
   * @returns {Promise<string>} - A new proxy URL
   */
  async fetchNewProxies() {
    // This would make an API call to your proxy provider
    // Simplified placeholder for illustration
    return "http://username:password@residential-proxy.example.com:8080";
  }
  
  /**
   * Rotates to a new IP address
   * @returns {Promise<void>}
   */
  async rotateIp() {
    // Implementation would request new IP from provider
    // This is a simplified placeholder
    const newProxy = await this.fetchNewProxies();
    this.proxyPool.push(newProxy);
  }
  
  /**
   * Gets bandwidth usage statistics
   * @returns {Object} - Bandwidth usage stats
   */
  getBandwidthStats() {
    return this.bandwidthTracker.getStats();
  }
  
  /**
   * Properly closes all proxy sessions
   * @returns {Promise<void>}
   */
  async cleanup() {
    // Implement session cleanup logic
    this.proxyPool = [];
    this.healthyProxies.clear();
    this.sessions.clear();
    this.bandwidthTracker.reset();
    this.activeConnections = 0;
  }
  
  /**
   * Closes a specific session
   * @param {string} sessionId - The session to close
   */
  closeSession(sessionId) {
    if (!sessionId) return;
    this.sessions.delete(sessionId);
    this.bandwidthTracker.clearSessionStats(sessionId);
  }

  /**
   * Attempts to create a connection with protocol fallback
   * @param {string} url - The URL to request
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - The response
   */
  async requestWithProtocolFallback(url, options = {}) {
    const protocols = ['https', 'http', 'socks5'];
    const originalUrl = url;
    let lastError = null;
    
    // Try each protocol in sequence
    for (const protocol of protocols) {
      try {
        // Skip if URL already has this protocol
        const urlObj = new URL(url);
        if (urlObj.protocol === `${protocol}:`) continue;
        
        // Replace protocol in URL
        const modifiedUrl = url.replace(/^(https?|socks5):\/\//, `${protocol}://`);
        
        console.log(`Attempting connection with ${protocol} protocol: ${this.maskCredentials(modifiedUrl)}`);
        
        return await this.request(modifiedUrl, options);
      } catch (error) {
        console.warn(`Failed with ${protocol} protocol:`, error.message);
        lastError = error;
        // Continue to next protocol
      }
    }
    
    // If all protocols failed, throw the last error
    throw new Error(`All protocol attempts failed for ${originalUrl}: ${lastError.message}`);
  }

  /**
   * Implements provider-level fallback for proxy requests
   * @param {string} url - The URL to request
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - The response
   */
  async requestWithProviderFallback(url, options = {}) {
    try {
      // Try primary provider first
      return await this.request(url, options);
    } catch (primaryError) {
      console.warn('Primary proxy provider failed:', primaryError.message);
      
      // Switch to fallback provider if available
      if (this.config.providers.fallback && this.config.providers.fallback.apiUrl) {
        console.log('Attempting fallback proxy provider');
        
        // Store current provider config
        const primaryConfig = { ...this.config.providers.primary };
        
        try {
          // Switch to fallback provider
          this.config.providers.primary = this.config.providers.fallback;
          
          // Clear proxy pool to force using fallback provider's proxies
          this.proxyPool = [];
          
          return await this.request(url, options);
        } finally {
          // Restore primary provider configuration
          this.config.providers.primary = primaryConfig;
        }
      }
      
      // Re-throw original error if no fallback or fallback also failed
      throw primaryError;
    }
  }

  // Add test coverage for connection methods
  async connect(server, options = {}) {
    try {
      // Implement validation before connection
      this.validateServerUrl(server.url);
      
      // Add retry logic with randomized delays (max 5 retries)
      return await this.executeWithRetry(() => this.createProxySession(server), 5);
    } catch (error) {
      // Mask any credentials in error messages
      const maskedError = this.maskSensitiveData(error.message);
      throw new Error(`Connection failed: ${maskedError}`);
    }
  }
  
  // Add proper session cleanup
  async disconnect() {
    if (this.session) {
      try {
        await this.closeProxySession(this.session);
      } finally {
        this.session = null;
      }
    }
  }
  
  // Add helper for retry logic with variable delays
  async executeWithRetry(fn, maxRetries = 5) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Implement randomized delay between retries
        const delay = Math.floor(1000 + Math.random() * 2000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
}

module.exports = ProxyAPIClient; 