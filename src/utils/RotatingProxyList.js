/**
 * RotatingProxyList - Manages a list of proxies with rotation capability
 * AI-generated code for the Residential Proxy Project
 */

class RotatingProxyList {
  constructor(options = {}) {
    this.proxies = options.proxies || [];
    this.currentIndex = 0;
    this.rotationStrategy = options.rotationStrategy || 'sequential';
    this.refreshInterval = options.refreshInterval || null;
    this.lastRefresh = new Date();
    
    if (this.refreshInterval) {
      this.startAutoRefresh();
    }
  }
  
  /**
   * Get the current proxy from the list
   * @returns {Object|null} - Current proxy or null if empty
   */
  getCurrent() {
    if (this.proxies.length === 0) {
      return null;
    }
    
    return this.proxies[this.currentIndex];
  }
  
  /**
   * Rotate to the next proxy in the list
   * @returns {Object|null} - Next proxy or null if empty
   */
  rotate() {
    if (this.proxies.length === 0) {
      return null;
    }
    
    if (this.rotationStrategy === 'random') {
      this.currentIndex = Math.floor(Math.random() * this.proxies.length);
    } else {
      // Sequential rotation (default)
      this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
    }
    
    return this.getCurrent();
  }
  
  /**
   * Add a proxy to the list
   * @param {Object} proxy - Proxy to add
   */
  addProxy(proxy) {
    this.proxies.push(proxy);
  }
  
  /**
   * Remove a proxy from the list
   * @param {Object|string} proxyOrId - Proxy or proxy ID to remove
   * @returns {boolean} - Whether removal was successful
   */
  removeProxy(proxyOrId) {
    const id = typeof proxyOrId === 'string' ? proxyOrId : proxyOrId.id;
    const initialLength = this.proxies.length;
    
    this.proxies = this.proxies.filter(p => p.id !== id);
    
    if (this.proxies.length < initialLength && this.currentIndex >= this.proxies.length) {
      this.currentIndex = 0;
    }
    
    return this.proxies.length < initialLength;
  }
  
  /**
   * Set the entire proxy list
   * @param {Array} proxies - Array of proxy objects
   */
  setProxies(proxies) {
    this.proxies = proxies || [];
    this.currentIndex = 0;
  }
  
  /**
   * Start automatic proxy list refresh
   * @private
   */
  startAutoRefresh() {
    if (this.refreshInterval && typeof this.refreshCallback === 'function') {
      this.refreshTimer = setInterval(() => {
        this.refreshCallback()
          .then(proxies => {
            this.setProxies(proxies);
            this.lastRefresh = new Date();
          })
          .catch(error => {
            console.error('Failed to refresh proxy list:', error);
          });
      }, this.refreshInterval);
    }
  }
  
  /**
   * Stop automatic proxy list refresh
   */
  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
  
  /**
   * Set a callback to refresh the proxy list
   * @param {Function} callback - Async function that returns a list of proxies
   */
  setRefreshCallback(callback) {
    this.refreshCallback = callback;
    
    if (this.refreshInterval && !this.refreshTimer) {
      this.startAutoRefresh();
    }
  }
}

module.exports = RotatingProxyList; 