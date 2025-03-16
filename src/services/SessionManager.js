/**
 * Session Manager Service
 * Manages proxy session creation, tracking, and cleanup
 * 
 * AI-generated code for the Residential Proxy Project
 */

const { v4: uuidv4 } = require('uuid');

class SessionManager {
  constructor(options = {}) {
    this.sessions = new Map();
    this.sessionTimeout = options.sessionTimeout || 1800000; // 30 minutes
    this.maxSessionsPerUser = options.maxSessionsPerUser || 5;
    this.cleanupInterval = null;
    this.stats = {
      created: 0,
      expired: 0,
      active: 0
    };
    
    // Start cleanup interval
    this._startCleanupInterval();
  }

  /**
   * Create a new proxy session
   * @param {string} userId - User identifier
   * @param {Object} options - Session options
   * @returns {Object} Session details
   */
  createSession(userId, options = {}) {
    // Check if user already has max sessions
    const userSessions = this._getUserSessions(userId);
    if (userSessions.length >= this.maxSessionsPerUser) {
      throw new Error(`Maximum sessions reached (${this.maxSessionsPerUser})`);
    }
    
    const sessionId = options.sessionId || uuidv4();
    const now = Date.now();
    
    const session = {
      sessionId,
      userId,
      created: now,
      lastActivity: now,
      expires: now + (options.timeout || this.sessionTimeout),
      proxyInfo: options.proxyInfo || null,
      metadata: options.metadata || {},
      requestCount: 0,
      bandwidth: {
        sent: 0,
        received: 0
      }
    };
    
    this.sessions.set(sessionId, session);
    this.stats.created++;
    this.stats.active++;
    
    return session;
  }

  /**
   * Get session by ID
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} Session object or null if not found
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }
    
    // Check if session has expired
    if (Date.now() > session.expires) {
      this.closeSession(sessionId, 'expired');
      return null;
    }
    
    return session;
  }

  /**
   * Update session activity
   * @param {string} sessionId - Session identifier
   * @param {Object} updates - Fields to update
   * @returns {boolean} Success status
   */
  updateSession(sessionId, updates = {}) {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return false;
    }
    
    // Update session fields
    if (updates.proxyInfo) {
      session.proxyInfo = updates.proxyInfo;
    }
    
    if (updates.metadata) {
      session.metadata = { ...session.metadata, ...updates.metadata };
    }
    
    // Track bandwidth if provided
    if (updates.bytesSent) {
      session.bandwidth.sent += updates.bytesSent;
    }
    
    if (updates.bytesReceived) {
      session.bandwidth.received += updates.bytesReceived;
    }
    
    // Increment request count if needed
    if (updates.incrementRequest) {
      session.requestCount++;
    }
    
    // Update activity timestamp
    session.lastActivity = Date.now();
    
    // Extend session if requested
    if (updates.extend) {
      session.expires = Date.now() + this.sessionTimeout;
    }
    
    this.sessions.set(sessionId, session);
    return true;
  }

  /**
   * Close a session
   * @param {string} sessionId - Session identifier
   * @param {string} reason - Reason for closing
   * @returns {boolean} Success status
   */
  closeSession(sessionId, reason = 'user-closed') {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return false;
    }
    
    this.sessions.delete(sessionId);
    this.stats.active--;
    
    if (reason === 'expired') {
      this.stats.expired++;
    }
    
    return true;
  }

  /**
   * Get all sessions for a user
   * @param {string} userId - User identifier
   * @returns {Array<Object>} Array of session objects
   */
  getUserSessions(userId) {
    return this._getUserSessions(userId);
  }

  /**
   * Get session statistics
   * @returns {Object} Session statistics
   */
  getStats() {
    return {
      ...this.stats,
      totalSessions: this.sessions.size
    };
  }

  /**
   * Clean up expired sessions
   */
  cleanup() {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expires) {
        this.closeSession(sessionId, 'expired');
        expiredCount++;
      }
    }
    
    return expiredCount;
  }

  /**
   * Shut down session manager
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Close all sessions
    for (const sessionId of this.sessions.keys()) {
      this.closeSession(sessionId, 'shutdown');
    }
  }

  /**
   * Get user sessions (internal helper)
   * @private
   * @param {string} userId - User identifier
   * @returns {Array<Object>} Array of session objects
   */
  _getUserSessions(userId) {
    const userSessions = [];
    
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        userSessions.push(session);
      }
    }
    
    return userSessions;
  }

  /**
   * Start cleanup interval
   * @private
   */
  _startCleanupInterval() {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 300000);
    
    // Prevent interval from keeping Node process alive
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }
}

module.exports = SessionManager;

