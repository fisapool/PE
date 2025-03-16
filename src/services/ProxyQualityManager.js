/**
 * Proxy Quality Manager Service
 * Monitors and rates proxy quality to optimize selections
 * 
 * AI-generated code for the Residential Proxy Project
 */

class ProxyQualityManager {
  constructor(options = {}) {
    this.proxyRatings = new Map();
    this.minSuccessRate = options.minSuccessRate || 0.7;
    this.degradationThreshold = options.degradationThreshold || 0.2;
    this.measurementWindow = options.measurementWindow || 100;
    this.qualityMetrics = new Map();
  }

  /**
   * Track successful proxy request
   * @param {string} proxyId - Proxy identifier
   * @param {number} responseTime - Response time in ms
   */
  trackSuccess(proxyId, responseTime) {
    const metrics = this._getOrCreateMetrics(proxyId);
    metrics.successes++;
    metrics.totalRequests++;
    metrics.responseTimesMs.push(responseTime);
    
    // Limit history to the measurement window
    if (metrics.responseTimesMs.length > this.measurementWindow) {
      metrics.responseTimesMs.shift();
    }
    
    this._updateRating(proxyId);
  }

  /**
   * Track failed proxy request
   * @param {string} proxyId - Proxy identifier
   * @param {string} errorType - Type of error encountered
   */
  trackFailure(proxyId, errorType) {
    const metrics = this._getOrCreateMetrics(proxyId);
    metrics.failures++;
    metrics.totalRequests++;
    metrics.errors.push({ time: Date.now(), type: errorType });
    
    // Limit error history
    if (metrics.errors.length > this.measurementWindow) {
      metrics.errors.shift();
    }
    
    this._updateRating(proxyId);
  }

  /**
   * Get proxy quality rating
   * @param {string} proxyId - Proxy identifier
   * @returns {number} Quality rating from 0-1
   */
  getProxyRating(proxyId) {
    return this.proxyRatings.get(proxyId) || 0.5;
  }

  /**
   * Get all proxy ratings
   * @returns {Map<string, number>} Map of proxy IDs to ratings
   */
  getAllRatings() {
    return new Map(this.proxyRatings);
  }

  /**
   * Get proxies above quality threshold
   * @param {number} threshold - Quality threshold (0-1)
   * @returns {Array<string>} Array of proxy IDs
   */
  getQualityProxies(threshold = 0.7) {
    const qualityProxies = [];
    
    for (const [proxyId, rating] of this.proxyRatings.entries()) {
      if (rating >= threshold) {
        qualityProxies.push(proxyId);
      }
    }
    
    return qualityProxies;
  }

  /**
   * Check if proxy quality has degraded
   * @param {string} proxyId - Proxy identifier
   * @returns {boolean} True if quality degraded below threshold
   */
  hasQualityDegraded(proxyId) {
    const metrics = this.qualityMetrics.get(proxyId);
    if (!metrics || metrics.totalRequests < 10) return false;
    
    // Calculate recent success rate (last 10 requests)
    const recentSuccessRate = this._calculateRecentSuccessRate(metrics);
    const overallSuccessRate = metrics.successes / metrics.totalRequests;
    
    // Quality has degraded if recent success rate is significantly lower than overall
    return (overallSuccessRate - recentSuccessRate) > this.degradationThreshold;
  }

  /**
   * Get or create metrics for a proxy
   * @private
   * @param {string} proxyId - Proxy identifier
   * @returns {Object} Metrics object
   */
  _getOrCreateMetrics(proxyId) {
    if (!this.qualityMetrics.has(proxyId)) {
      this.qualityMetrics.set(proxyId, {
        successes: 0,
        failures: 0,
        totalRequests: 0,
        responseTimesMs: [],
        errors: [],
        lastUpdated: Date.now()
      });
    }
    
    return this.qualityMetrics.get(proxyId);
  }

  /**
   * Update proxy quality rating
   * @private
   * @param {string} proxyId - Proxy identifier
   */
  _updateRating(proxyId) {
    const metrics = this.qualityMetrics.get(proxyId);
    if (!metrics) return;
    
    const successRate = metrics.successes / metrics.totalRequests;
    const avgResponseTime = this._calculateAverageResponseTime(metrics);
    
    // Calculate rating: 70% based on success rate, 30% based on speed
    let rating = (successRate * 0.7) + (this._normalizeResponseTime(avgResponseTime) * 0.3);
    
    // Ensure rating is between 0 and 1
    rating = Math.max(0, Math.min(1, rating));
    
    this.proxyRatings.set(proxyId, rating);
    metrics.lastUpdated = Date.now();
  }

  /**
   * Calculate recent success rate
   * @private
   * @param {Object} metrics - Proxy metrics
   * @returns {number} Recent success rate
   */
  _calculateRecentSuccessRate(metrics) {
    const recentWindow = 10;
    const recentTotal = Math.min(recentWindow, metrics.totalRequests);
    const recentSuccesses = metrics.successes - (metrics.totalRequests - recentTotal);
    
    return recentSuccesses / recentTotal;
  }

  /**
   * Calculate average response time
   * @private
   * @param {Object} metrics - Proxy metrics
   * @returns {number} Average response time in ms
   */
  _calculateAverageResponseTime(metrics) {
    if (metrics.responseTimesMs.length === 0) return 1000;
    
    const sum = metrics.responseTimesMs.reduce((total, time) => total + time, 0);
    return sum / metrics.responseTimesMs.length;
  }

  /**
   * Normalize response time to a 0-1 scale
   * @private
   * @param {number} responseTime - Response time in ms
   * @returns {number} Normalized value (faster = higher value)
   */
  _normalizeResponseTime(responseTime) {
    // Fastest possible response (e.g., 50ms) would be 1.0
    // Very slow response (e.g., 5000ms+) would be close to 0.0
    const maxExpectedTime = 5000;
    return Math.max(0, 1 - (responseTime / maxExpectedTime));
  }
}

module.exports = ProxyQualityManager;

