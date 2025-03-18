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
    this.alertThreshold = options.alertThreshold || 0.8;
    this.ratePerGB = options.ratePerGB || 0.50; // $0.50 per GB
    this.lastUpdate = Date.now();
    this.callbacks = {
      onLimitReached: options.onLimitReached || (() => {}),
      onThresholdReached: options.onThresholdReached || (() => {}),
      onEarningsUpdate: options.onEarningsUpdate || (() => {})
    };
  }

  trackUsage(sessionId, bytes, direction = 'both') {
    const timestamp = Date.now();
    const bytesInMB = bytes / (1024 * 1024);
    const today = new Date().toISOString().split('T')[0];

    // Update real-time stats
    this._updateRealTimeStats(sessionId, bytesInMB, timestamp);

    // Update daily stats
    if (!this.usageLog.has(today)) {
      this.usageLog.set(today, {
        sent: 0,
        received: 0,
        total: 0,
        earnings: 0,
        sessions: new Map()
      });
    }

    const dayStats = this.usageLog.get(today);
    if (direction === 'both' || direction === 'sent') {
      dayStats.sent += bytesInMB;
    }
    if (direction === 'both' || direction === 'received') {
      dayStats.received += bytesInMB;
    }

    dayStats.total = dayStats.sent + dayStats.received;
    dayStats.earnings = this._calculateEarnings(dayStats.total);

    // Update session stats
    if (!this.sessionStats.has(sessionId)) {
      this.sessionStats.set(sessionId, {
        sent: 0,
        received: 0,
        total: 0,
        earnings: 0,
        startTime: timestamp,
        lastUpdate: timestamp
      });
    }

    const sessionStats = this.sessionStats.get(sessionId);
    if (direction === 'both' || direction === 'sent') {
      sessionStats.sent += bytesInMB;
    }
    if (direction === 'both' || direction === 'received') {
      sessionStats.received += bytesInMB;
    }

    sessionStats.total = sessionStats.sent + sessionStats.received;
    sessionStats.earnings = this._calculateEarnings(sessionStats.total);
    sessionStats.lastUpdate = timestamp;

    // Check limits and trigger callbacks
    this._checkLimitsAndNotify(sessionId);

    // Notify earnings update
    this.callbacks.onEarningsUpdate({
      daily: dayStats.earnings,
      session: sessionStats.earnings
    });
  }

  _updateRealTimeStats(sessionId, bytesInMB, timestamp) {
    const timeDiff = (timestamp - this.lastUpdate) / 1000; // Convert to seconds
    const bytesPerSecond = bytesInMB * 1024 * 1024 / timeDiff;

    this.currentSpeed = bytesPerSecond;
    this.lastUpdate = timestamp;
  }

  _calculateEarnings(totalMB) {
    return (totalMB / 1024) * this.ratePerGB; // Convert MB to GB and multiply by rate
  }

  getRealTimeStats() {
    return {
      currentSpeed: this.currentSpeed || 0,
      lastUpdate: this.lastUpdate
    };
  }

  getEarningsSummary() {
    const today = new Date().toISOString().split('T')[0];
    const dayStats = this.usageLog.get(today) || { earnings: 0 };

    let totalEarnings = 0;
    for (const [date, stats] of this.usageLog) {
      totalEarnings += stats.earnings;
    }

    return {
      daily: dayStats.earnings,
      total: totalEarnings,
      sessionsActive: this.sessionStats.size
    };
  }

  checkLimits(sessionId) {
    const today = new Date().toISOString().split('T')[0];
    const dayStats = this.usageLog.get(today) || { total: 0, earnings: 0 };

    const result = {
      exceeded: false,
      threshold: false,
      daily: {
        usage: dayStats.total,
        limit: this.dailyLimit,
        percent: (dayStats.total / this.dailyLimit) * 100,
        earnings: dayStats.earnings
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
        percent: (sessionStats.total / this.sessionLimit) * 100,
        earnings: sessionStats.earnings
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

  getSessionStats(sessionId) {
    return this.sessionStats.get(sessionId) || null;
  }

  getDailyStats(date = new Date().toISOString().split('T')[0]) {
    return this.usageLog.get(date) || { sent: 0, received: 0, total: 0, earnings: 0, sessions: new Map() };
  }

  clearSessionStats(sessionId) {
    this.sessionStats.delete(sessionId);

    // Also clear from daily logs
    for (const [date, stats] of this.usageLog.entries()) {
      if (stats.sessions.has(sessionId)) {
        stats.sessions.delete(sessionId);
      }
    }
  }

  reset() {
    this.usageLog.clear();
    this.sessionStats.clear();
  }
  _checkLimitsAndNotify(sessionId) {
    const limits = this.checkLimits(sessionId);
    if (limits.exceeded) {
      console.warn("Bandwidth limit exceeded!");
    } else if (limits.threshold) {
      console.warn("Approaching bandwidth threshold!");
    }
  }
}

module.exports = BandwidthTracker;
class BandwidthTracker {
  constructor(options = {}) {
    this.maxBandwidth = options.maxBandwidth || 1000; // MB
    this.resetInterval = options.resetInterval || 24 * 60 * 60 * 1000; // 24h
    this.currentUsage = 0;
    this.lastReset = Date.now();
    this.isActive = false;
    this.idleTimeout = options.idleTimeout || 5 * 60 * 1000; // 5min
    this.lastActivity = Date.now();
  }

  trackUsage(bytes) {
    if (!this.isActive || this.isLimitReached()) return false;
    
    const mbUsed = bytes / (1024 * 1024);
    this.currentUsage += mbUsed;
    this.lastActivity = Date.now();
    
    return true;
  }

  isLimitReached() {
    return this.currentUsage >= this.maxBandwidth;
  }

  checkIdleStatus() {
    return Date.now() - this.lastActivity > this.idleTimeout;
  }

  reset() {
    this.currentUsage = 0;
    this.lastReset = Date.now();
  }

  getStats() {
    return {
      currentUsage: this.currentUsage,
      maxBandwidth: this.maxBandwidth,
      isActive: this.isActive,
      isIdle: this.checkIdleStatus(),
      lastActivity: this.lastActivity
    };
  }
}

module.exports = BandwidthTracker;
