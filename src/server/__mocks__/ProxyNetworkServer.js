/**
 * Mock implementation of ProxyNetworkServer for testing
 */
class ProxyNetworkServer {
  constructor(config = {}) {
    this.config = {
      port: config.port || 3000,
      maxConcurrent: config.maxConcurrent || 10,
      sessionTimeout: config.sessionTimeout || 3600000,
      ...config
    };
    
    this.sessions = new Map();
    this.activeRequests = 0;
    this.startTime = Date.now();
  }
  
  async start() {
    return Promise.resolve();
  }
  
  async close() {
    return Promise.resolve();
  }
  
  createSession(options) {
    const sessionId = `test-session-${Date.now()}`;
    this.sessions.set(sessionId, {
      id: sessionId,
      createdAt: Date.now(),
      options
    });
    return { sessionId };
  }
  
  getStatus() {
    return {
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      sessions: this.sessions.size,
      activeRequests: this.activeRequests
    };
  }
}

module.exports = { ProxyNetworkServer }; 