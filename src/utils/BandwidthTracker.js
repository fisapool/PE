/**
 * BandwidthTracker - Tracks bandwidth usage for proxy connections
 * AI-generated code for the Residential Proxy Project
 */

class BandwidthTracker {
  constructor(options = {}) {
    this.usageLog = new Map();
    this.sessionStats = new Map();
    this.dailyLimit = options.dailyLimit || 500; // MB
    this.sessionLimit = options.sessionLimit || 100; // MB
    this.alertThreshold = options.alertThreshold || 0.8; // 80% of limit
    this.callbacks = {
      onLimitReached: options.onLimitReached || (() => {}),
      onThresholdReached: options.onThresholdReached || (() => {})
    };
  }
  
  /**
   * Track data sent through proxy
   * @param {string} sessionId - Session identifier
   * @param {number} bytes - Number of bytes sent
   */
  trackSent(sessionId, bytes) {
    this._trackUsage(sessionId, 'sent', bytes);
  }
  
  /**
   * Track data received through proxy
   * @param {string} sessionId - Session identifier
   * @param {number} bytes - Number of bytes received
   */
  trackReceived(sessionId, bytes) {
    this._trackUsage(sessionId, 'received', bytes);
  }
  
  /**
   * Track request (combines sent and received)
   * @param {string} sessionId - Session identifier
   * @param {Object} request - Request details
   * @param {Object} response - Response details
   */
  trackRequest(sessionId, request = {}, response = {}) {
    // Get request size
    const requestSize = request.data ? 
      (typeof request.data === 'string' ? Buffer.byteLength(request.data, 'utf8') : 
        Buffer.byteLength(JSON.stringify(request.data), 'utf8')) : 0;
        
    // Get response size
    const responseSize = response.data ?
      (typeof response.data === 'string' ? Buffer.byteLength(response.data, 'utf8') :
        Buffer.byteLength(JSON.stringify(response.data), 'utf8')) : 0;
    
    // Track both directions
    this.trackSent(sessionId, requestSize);
    this.trackReceived(sessionId, responseSize);
    
    return {
      sent: requestSize,
      received: responseSize,
      total: requestSize + responseSize
    };
  }
  
  /**
   * Internal method to track usage in a specific direction
   * @private
   * @param {string} sessionId - Session identifier
   * @param {string} direction - 'sent' or 'received'
   * @param {number} bytes - Number of bytes
   */
  _trackUsage(sessionId, direction, bytes) {
    if (!sessionId) return;
    
    const bytesInMB = bytes / (1024 * 1024);
    const today = new Date().toISOString().split('T')[0];
    
    // Update daily statistics
    if (!this.usageLog.has(today)) {
      this.usageLog.set(today, {
        sent: 0,
        received: 0,
        total: 0,
        sessions: new Map()
      });
    }
    
    const dayStats = this.usageLog.get(today);
    dayStats[direction] += bytesInMB;
    dayStats.total = dayStats.sent + dayStats.received;
    
    if (!dayStats.sessions.has(sessionId)) {
      dayStats.sessions.set(sessionId, { sent: 0, received: 0, total: 0 });
    }
    
    const sessionDayStats = dayStats.sessions.get(sessionId);
    sessionDayStats[direction] += bytesInMB;
    sessionDayStats.total = sessionDayStats.sent + sessionDayStats.received;
    
    // Update session statistics
    if (!this.sessionStats.has(sessionId)) {
      this.sessionStats.set(sessionId, { sent: 0, received: 0, total: 0 });
    }
    
    const sessionStats = this.sessionStats.get(sessionId);
    sessionStats[direction] += bytesInMB;
    sessionStats.total = sessionStats.sent + sessionStats.received;
  }
  
  /**
   * Check if any bandwidth limits have been exceeded
   * @param {string} sessionId - Optional session ID to check
   * @returns {Object} - Limit status
   */
  checkLimits(sessionId) {
    const today = new Date().toISOString().split('T')[0];
    const dayStats = this.usageLog.get(today) || { total: 0 };
    
    const result = {
      exceeded: false,
      threshold: false,
      daily: {
        usage: dayStats.total,
        limit: this.dailyLimit,
        percent: (dayStats.total / this.dailyLimit) * 100
      }
    };
    
    // Check daily limits
    if (dayStats.total >= this.dailyLimit) {
      result.exceeded = true;
      this.callbacks.onLimitReached('daily', dayStats.total);
    } else if (dayStats.total >= this.dailyLimit * this.alertThreshold) {
      result.threshold = true;
      this.callbacks.onThresholdReached('daily', dayStats.total);
    }
    
    // Check session limits if a session ID is provided
    if (sessionId && this.sessionStats.has(sessionId)) {
      const sessionStats = this.sessionStats.get(sessionId);
      
      result.session = {
        usage: sessionStats.total,
        limit: this.sessionLimit,
        percent: (sessionStats.total / this.sessionLimit) * 100
      };
      
      if (sessionStats.total >= this.sessionLimit) {
        result.exceeded = true;
        this.callbacks.onLimitReached('session', sessionStats.total, sessionId);
      } else if (sessionStats.total >= this.sessionLimit * this.alertThreshold) {
        result.threshold = true;
        this.callbacks.onThresholdReached('session', sessionStats.total, sessionId);
      }
    }
    
    return result;
  }
  
  /**
   * Get statistics for a specific session
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} - Session statistics
   */
  getSessionStats(sessionId) {
    return this.sessionStats.get(sessionId) || null;
  }
  
  /**
   * Get daily usage statistics
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Object} - Daily statistics
   */
  getDailyStats(date = new Date().toISOString().split('T')[0]) {
    return this.usageLog.get(date) || { sent: 0, received: 0, total: 0, sessions: new Map() };
  }
  
  /**
   * Clear statistics for a specific session
   * @param {string} sessionId - Session identifier
   */
  clearSessionStats(sessionId) {
    this.sessionStats.delete(sessionId);
    
    // Also clear from daily logs
    for (const [date, stats] of this.usageLog.entries()) {
      if (stats.sessions.has(sessionId)) {
        stats.sessions.delete(sessionId);
      }
    }
  }
  
  /**
   * Reset all statistics
   */
  reset() {
    this.usageLog.clear();
    this.sessionStats.clear();
  }
}

module.exports = BandwidthTracker; 