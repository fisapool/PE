/**
 * Server Connection Service
 * Manages connections to proxy servers and endpoint services
 * 
 * AI-generated code for the Residential Proxy Project
 */

const axios = require('axios');
const EventEmitter = require('events');

class ServerConnectionService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.servers = new Map();
    this.activeConnections = new Map();
    this.connectionTimeout = options.connectionTimeout || 30000;
    this.maxRetries = options.maxRetries || 3;
    this.lastErrors = new Map();
    this.pingInterval = null;
    
    // Start server health checks
    if (options.autoHealthCheck !== false) {
      this._startHealthChecks();
    }
  }

  /**
   * Add a new server to the service
   * @param {string} serverId - Unique server identifier
   * @param {Object} serverConfig - Server configuration
   * @returns {boolean} Success status
   */
  addServer(serverId, serverConfig) {
    if (!serverId || !serverConfig || !serverConfig.url) {
      throw new Error('Server ID and URL are required');
    }
    
    this.servers.set(serverId, {
      id: serverId,
      url: serverConfig.url,
      type: serverConfig.type || 'http',
      status: 'disconnected',
      headers: serverConfig.headers || {},
      healthCheckPath: serverConfig.healthCheckPath || '/health',
      timeout: serverConfig.timeout || this.connectionTimeout,
      lastConnected: null,
      healthStatus: null,
      retryCount: 0
    });
    
    // Emit server added event
    this.emit('serverAdded', serverId);
    
    return true;
  }

  /**
   * Connect to a server
   * @param {string} serverId - Server identifier
   * @returns {Promise<Object>} Connection details
   */
  async connect(serverId) {
    const server = this.servers.get(serverId);
    
    if (!server) {
      throw new Error(`Server not found: ${serverId}`);
    }
    
    if (server.status === 'connected') {
      return this.getConnection(serverId);
    }
    
    try {
      // Try to establish connection
      const connectionId = `${serverId}_${Date.now()}`;
      const serverUrl = server.url;
      
      // Use axios to test connection
      const response = await axios.get(`${serverUrl}${server.healthCheckPath}`, {
        headers: server.headers,
        timeout: server.timeout
      });
      
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`Server returned status ${response.status}`);
      }
      
      // Create connection object
      const connection = {
        id: connectionId,
        serverId,
        serverUrl,
        status: 'connected',
        connected: Date.now(),
        lastActivity: Date.now()
      };
      
      // Update server status
      server.status = 'connected';
      server.lastConnected = Date.now();
      server.retryCount = 0;
      this.servers.set(serverId, server);
      
      // Store connection
      this.activeConnections.set(connectionId, connection);
      
      // Emit connection event
      this.emit('connected', serverId, connectionId);
      
      return connection;
    } catch (error) {
      // Store error
      this.lastErrors.set(serverId, {
        time: Date.now(),
        message: error.message,
        code: error.code
      });
      
      // Increment retry count
      server.retryCount++;
      this.servers.set(serverId, server);
      
      // Emit error event
      this.emit('connectionError', serverId, error);
      
      throw new Error(`Failed to connect to server ${serverId}: ${error.message}`);
    }
  }

  /**
   * Get active connection for a server
   * @param {string} serverId - Server identifier
   * @returns {Object|null} Connection object or null
   */
  getConnection(serverId) {
    // Find the most recent connection for this server
    let bestConnection = null;
    
    for (const connection of this.activeConnections.values()) {
      if (connection.serverId === serverId && connection.status === 'connected') {
        if (!bestConnection || connection.connected > bestConnection.connected) {
          bestConnection = connection;
        }
      }
    }
    
    return bestConnection;
  }

  /**
   * Disconnect from a server
   * @param {string} serverId - Server identifier
   * @returns {boolean} Success status
   */
  disconnect(serverId) {
    const server = this.servers.get(serverId);
    
    if (!server) {
      return false;
    }
    
    // Find all connections for this server
    for (const [connectionId, connection] of this.activeConnections.entries()) {
      if (connection.serverId === serverId) {
        connection.status = 'disconnected';
        this.activeConnections.delete(connectionId);
      }
    }
    
    // Update server status
    server.status = 'disconnected';
    this.servers.set(serverId, server);
    
    // Emit disconnection event
    this.emit('disconnected', serverId);
    
    return true;
  }

  /**
   * Check health of all servers
   * @returns {Promise<Map<string, Object>>} Map of server IDs to health status
   */
  async checkHealth() {
    const healthResults = new Map();
    
    for (const [serverId, server] of this.servers.entries()) {
      try {
        const response = await axios.get(`${server.url}${server.healthCheckPath}`, {
          headers: server.headers,
          timeout: server.timeout
        });
        
        const isHealthy = response.status >= 200 && response.status < 300;
        
        healthResults.set(serverId, {
          isHealthy,
          statusCode: response.status,
          responseTime: response.config.metadata?.requestDuration || null,
          timestamp: Date.now()
        });
        
        // Update server health status
        server.healthStatus = isHealthy ? 'healthy' : 'unhealthy';
        this.servers.set(serverId, server);
        
        // Emit health status event
        this.emit('healthCheck', serverId, isHealthy);
      } catch (error) {
        healthResults.set(serverId, {
          isHealthy: false,
          error: error.message,
          timestamp: Date.now()
        });
        
        // Update server health status
        server.healthStatus = 'unhealthy';
        this.servers.set(serverId, server);
        
        // Emit health status event
        this.emit('healthCheck', serverId, false);
      }
    }
    
    return healthResults;
  }

  /**
   * Get all server statuses
   * @returns {Map<string, Object>} Map of server IDs to status objects
   */
  getServerStatuses() {
    const statuses = new Map();
    
    for (const [serverId, server] of this.servers.entries()) {
      statuses.set(serverId, {
        id: serverId,
        url: server.url,
        type: server.type,
        status: server.status,
        healthStatus: server.healthStatus,
        lastConnected: server.lastConnected,
        isConnected: server.status === 'connected',
        error: this.lastErrors.get(serverId) || null
      });
    }
    
    return statuses;
  }

  /**
   * Send request to a server
   * @param {string} serverId - Server identifier
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async sendRequest(serverId, endpoint, options = {}) {
    // Get or create connection
    let connection = this.getConnection(serverId);
    
    if (!connection) {
      connection = await this.connect(serverId);
    }
    
    try {
      // Build request URL
      const url = `${connection.serverUrl}${endpoint}`;
      
      // Get server config
      const server = this.servers.get(serverId);
      
      // Send request
      const response = await axios({
        method: options.method || 'get',
        url,
        headers: {
          ...server.headers,
          ...options.headers
        },
        data: options.data,
        params: options.params,
        timeout: options.timeout || server.timeout
      });
      
      // Update connection activity
      connection.lastActivity = Date.now();
      this.activeConnections.set(connection.id, connection);
      
      return response.data;
    } catch (error) {
      // Handle connection errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        // Mark connection as failed
        connection.status = 'failed';
        this.activeConnections.delete(connection.id);
        
        // Update server status
        const server = this.servers.get(serverId);
        server.status = 'disconnected';
        this.servers.set(serverId, server);
        
        // Emit connection error
        this.emit('connectionError', serverId, error);
      }
      
      // If retries allowed, attempt retry
      if (options.retry !== false && (options.retryCount || 0) < (options.maxRetries || this.maxRetries)) {
        const retryOptions = {
          ...options,
          retryCount: (options.retryCount || 0) + 1
        };
        
        // Add exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retryOptions.retryCount), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.sendRequest(serverId, endpoint, retryOptions);
      }
      
      throw error;
    }
  }

  /**
   * Start health check interval
   * @private
   */
  _startHealthChecks() {
    // Check health every 30 seconds
    this.pingInterval = setInterval(() => {
      this.checkHealth().catch(err => {
        this.emit('error', err);
      });
    }, 30000);
    
    // Prevent interval from keeping Node process alive
    if (this.pingInterval.unref) {
      this.pingInterval.unref();
    }
  }

  /**
   * Shutdown service
   */
  shutdown() {
    // Clear health check interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    // Disconnect all servers
    for (const serverId of this.servers.keys()) {
      this.disconnect(serverId);
    }
    
    // Remove all listeners
    this.removeAllListeners();
  }
}

module.exports = ServerConnectionService;
