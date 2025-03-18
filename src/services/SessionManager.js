const { v4: uuidv4 } = require('uuid');

class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.sessionTimeouts = new Map();
  }

  async createSession(proxy) {
    const session = {
      id: uuidv4(),
      proxy,
      createdAt: Date.now(),
      lastUsed: Date.now()
    };

    this.sessions.set(session.id, session);
    this.setupSessionTimeout(session.id);

    return session;
  }

  async renewSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.lastUsed = Date.now();
    this.setupSessionTimeout(sessionId);

    return session;
  }

  async rotateSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    // Implementation will vary based on your proxy rotation strategy
    session.proxy = await this.getNewProxy(session.proxy.region);
    session.lastUsed = Date.now();

    return session.proxy;
  }

  setupSessionTimeout(sessionId) {
    if (this.sessionTimeouts.has(sessionId)) {
      clearTimeout(this.sessionTimeouts.get(sessionId));
    }

    const timeout = setTimeout(() => {
      this.sessions.delete(sessionId);
      this.sessionTimeouts.delete(sessionId);
    }, 30 * 60 * 1000); // 30 minutes

    this.sessionTimeouts.set(sessionId, timeout);
  }

  getActiveSessionCount() {
    return this.sessions.size;
  }

  async getNewProxy(region) {
    // Implementation will depend on your proxy pool management
    return { host: '0.0.0.0', port: 8080, region };
  }
}

module.exports = SessionManager;