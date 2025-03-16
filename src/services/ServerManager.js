/**
 * Server Manager Service
 * Manages proxy servers, configurations, and connections
 * 
 * AI-generated code for the Residential Proxy Project
 */

const EventEmitter = require('events');
const ServerConnectionService = require('./ServerConnectionService');

class ServerManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.servers = new Map();
    this.types = new Map([
      ['http', { name: 'HTTP Proxy' }],
      ['socks', { name: 'SOCKS Proxy' }],
      ['api', { name: 'API Server' }],
      ['residential', { name: 'Residential Proxy' }],
      ['sse', { name: 'Server-Sent Events' }],
    ]);
    
    this.connectionService = options.connectionService || new ServerConnectionService({
      autoHealthCheck: true
    });
    
    // Forward connection service events
    this._forwardEvents();
  }

  /**
   * Add a new server to the manager
   * @param {string} name - Server name
   * @param {Object} config - Server configuration
   * @returns {string} Server ID
   */
  addServer(name, config) {
    if (!name || !config || !config.url) {
      throw new Error('Server name and URL are required');
    }
    
    // Validate server type
    if (config.type && !this.types.has(config.type)) {
      throw new Error(`Invalid server type: ${config.type}`);
    }
    
    const serverId = config.id || `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    
    const serverConfig = {
      id: serverId,
      name,
      url: config.url,
      type: config.type || 'http',
      credentials: config.credentials || null,
      headers: config.headers || {},
      healthCheckPath: config.healthCheckPath || '/health',
      options: config.options || {},
      addedAt: Date.now(),
      enabled: config.enabled !== false,
      priority: config.priority || 1
    };
    
    // Store server configuration
    this.servers.set(serverId, serverConfig);
    
    // Add to connection service
    this.connectionService.addServer(serverId, {
      url: serverConfig.url,
      type: serverConfig.type,
      headers: serverConfig.headers,
      healthCheckPath: serverConfig.healthCheckPath,
      timeout: serverConfig.options.timeout
    });
    
    // Emit server added event
    this.emit('serverAdded', serverId, serverConfig);
    
    return serverId;
  }

  /**
   * Update a server configuration
   * @param {string} serverId - Server ID
   * @param {Object} updates - Configuration updates
   * @returns {boolean} Success status
   */
  updateServer(serverId, updates) {
    const server = this.servers.get(serverId);
    
    if (!server) {
      return false;
    }
    
    // Disconnect if URL changes
    if (updates.url && updates.url !== server.url) {
      this.connectionService.disconnect(serverId);
    }
    
    // Apply updates
    const updatedServer = {
      ...server,
      ...updates,
      // Ensure ID isn't changed
      id: serverId
    };
    
    this.servers.set(serverId, updatedServer);
    
    // Update connection service if applicable
    if (updates.url || updates.headers || updates.healthCheckPath) {
      this.connectionService.addServer(serverId, {
        url: updatedServer.url,
        type: updatedServer.type,
        headers: updatedServer.headers,
        healthCheckPath: updatedServer.healthCheckPath,
        timeout: updatedServer.options.timeout
      });
    }
    
    // Emit server updated event
    this.emit('serverUpdated', serverId, updatedServer);
    
    return true;
  }

  /**
   * Remove a server
   * @param {string} serverId - Server ID
   * @returns {boolean} Success status
   */
  removeServer(serverId) {
    if (!this.servers.has(serverId)) {
      return false;
    }
    
    // Disconnect server
    this.connectionService.disconnect(serverId);
    
    // Remove server configuration
    this.servers.delete(serverId);
    
    // Emit server removed event
    this.emit('serverRemoved', serverId);
    
    return true;
  }

  /**
   * Get all server configurations
   * @returns {Array<Object>} Array of server configurations
   */
  getServers() {
    return Array.from(this.servers.values());
  }

  /**
   * Get a specific server configuration
   * @param {string} serverId - Server ID
   * @returns {Object|null} Server configuration
   */
  getServer(serverId) {
    return this.servers.get(serverId) || null;
  }

  /**
   * Get servers by type
   * @param {string} type - Server type
   * @returns {Array<Object>} Array of matching servers
   */
  getServersByType(type) {
    const matchingServers = [];
    
    for (const server of this.servers.values()) {
      if (server.type === type) {
        matchingServers.push(server);
      }
    }
    
    return matchingServers;
  }

  /**
   * Connect to a server
   * @param {string} serverId - Server ID
   * @returns {Promise<Object>} Connection details
   */
  async connectToServer(serverId) {
    const server = this.servers.get(serverId);
    
    if (!server) {
      throw new Error(`Server not found: ${serverId}`);
    }
    
    if (!server.enabled) {
      throw new Error(`Server is disabled: ${serverId}`);
    }
    
    return this.connectionService.connect(serverId);
  }

  /**
   * Send request to a server
   * @param {string} serverId - Server ID
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async sendRequest(serverId, endpoint, options = {}) {
    const server = this.servers.get(serverId);
    
    if (!server) {
      throw new Error(`Server not found: ${serverId}`);
    }
    
    if (!server.enabled) {
      throw new Error(`Server is disabled: ${serverId}`);
    }
    
    // Apply server-specific headers
    const requestOptions = {
      ...options,
      headers: {
        ...server.headers,
        ...options.headers
      }
    };
    
    return this.connectionService.sendRequest(serverId, endpoint, requestOptions);
  }

  /**
   * Get server status with health information
   * @param {string} serverId - Server ID
   * @returns {Object|null} Server status
   */
  getServerStatus(serverId) {
    const server = this.servers.get(serverId);
    
    if (!server) {
      return null;
    }
    
    const connectionStatus = this.connectionService.getServerStatuses().get(serverId);
    
    return {
      id: serverId,
      name: server.name,
      type: server.type,
      enabled: server.enabled,
      status: connectionStatus?.status || 'unknown',
      isConnected: connectionStatus?.isConnected || false,
      healthStatus: connectionStatus?.healthStatus || null,
      lastConnected: connectionStatus?.lastConnected || null,
      error: connectionStatus?.error || null
    };
  }

  /**
   * Get status for all servers
   * @returns {Array<Object>} Array of server statuses
   */
  getAllServerStatuses() {
    const statuses = [];
    
    for (const serverId of this.servers.keys()) {
      const status = this.getServerStatus(serverId);
      if (status) {
        statuses.push(status);
      }
    }
    
    return statuses;
  }

  /**
   * Forward events from connection service
   * @private
   */
  _forwardEvents() {
    const events = [
      'connected', 'disconnected', 'connectionError', 
      'healthCheck', 'serverAdded'
    ];
    
    for (const event of events) {
      this.connectionService.on(event, (...args) => {
        this.emit(event, ...args);
      });
    }
  }

  /**
   * Shutdown manager and services
   */
  shutdown() {
    this.connectionService.shutdown();
    this.removeAllListeners();
  }
}

module.exports = ServerManager;
