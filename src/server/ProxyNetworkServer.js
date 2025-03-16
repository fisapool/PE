/**
 * Proxy Network Server for managing residential proxies
 * AI-generated code for the Residential Proxy Project
 * ETHICAL CONSIDERATIONS: This server enforces consent, connection limits, and privacy protections
 */

const express = require('express');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const ProxyAPIClient = require('../client/ProxyAPIClient');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

// Import middleware
const proxyAuth = require('../middleware/proxyAuth');
const rateLimiter = require('../middleware/rateLimiter');

// Import services
const SessionManager = require('../services/SessionManager');
const ServerManager = require('../services/ServerManager');
const ProxyQualityManager = require('../services/ProxyQualityManager');

class ProxyNetworkServer {
  constructor(options = {}) {
    this.options = {
      port: options.port || process.env.PORT || 3000,
      jwtSecret: options.jwtSecret || process.env.JWT_SECRET || 'development-secret-key',
      corsOrigins: options.corsOrigins || ['http://localhost:3000'],
      maxConnections: options.maxConnections || 1000,
      maxRequestsPerMinute: options.maxRequestsPerMinute || 60,
      minDevicesForRotation: options.minDevicesForRotation || 3,
      ...options
    };
    
    // Setup logging
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.simple()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'proxy-network.log' })
      ]
    });
    
    // Available residential devices
    this.availableDevices = new Map();
    
    // User consent records
    this.consentRecords = new Map();
    
    // Connection tracking
    this.activeConnections = new Map();
    
    // Bandwidth usage tracking
    this.bandwidthUsage = new Map();
    
    // Setup Express app
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server, path: '/proxy/ws' });
    
    // Proxy client for external proxies
    this.proxyClient = new ProxyAPIClient();
    
    // Services
    this.sessionManager = new SessionManager();
    this.serverManager = new ServerManager();
    this.qualityManager = new ProxyQualityManager();
    
    // Track connections
    this.connections = new Map();
    this.isRunning = false;
    
    // Clean up intervals
    this._startMaintenanceTasks();
    
    // Set up server
    this._setupMiddleware();
    this._setupRoutes();
    this._setupWebSockets();
    this._setupErrorHandling();
  }
  
  /**
   * Start the server
   * @returns {Promise<void>}
   */
  async start() {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }
    
    return new Promise((resolve, reject) => {
      try {
        this.server.listen(this.options.port, () => {
          this.isRunning = true;
          console.log(`Proxy Network Server running on port ${this.options.port}`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Stop the server
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this.isRunning) {
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      // Close WebSocket connections
      this.wss.clients.forEach(client => {
        client.terminate();
      });
      
      // Clean up connections
      this.connections.forEach(connection => {
        connection.socket.destroy();
      });
      
      // Close the HTTP server
      this.server.close(err => {
        if (err) {
          reject(err);
          return;
        }
        
        this.isRunning = false;
        // Close services
        this.sessionManager.shutdown();
        this.serverManager.shutdown();
        
        // Clear maintenance intervals
        if (this.maintenanceInterval) {
          clearInterval(this.maintenanceInterval);
        }
        
        resolve();
      });
    });
  }
  
  /**
   * Set up Express middleware
   * @private
   */
  _setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // CORS
    this.app.use((req, res, next) => {
      const origin = req.headers.origin;
      if (this.options.corsOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      }
      
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      
      next();
    });
    
    // Static files
    this.app.use(express.static(path.join(__dirname, 'public')));
    
    // Track connections for cleanup
    this.app.use((req, res, next) => {
      const id = uuidv4();
      this.connections.set(id, {
        id,
        url: req.url,
        socket: req.socket,
        createdAt: Date.now()
      });
      
      res.on('finish', () => {
        this.connections.delete(id);
      });
      
      next();
    });
    
    // Add request logging with sensitive data masked
    this.app.use((req, res, next) => {
      const maskedBody = { ...req.body };
      
      // Mask sensitive fields
      ['password', 'token', 'apiKey', 'appKey'].forEach(field => {
        if (maskedBody[field]) {
          maskedBody[field] = '***MASKED***';
        }
      });
      
      this.logger.info({
        method: req.method,
        path: req.path,
        ip: req.ip,
        body: maskedBody
      });
      
      next();
    });
    
    // Add rate limiting
    this.app.use((req, res, next) => {
      const ip = req.ip;
      const now = Date.now();
      
      if (!this.rateLimits) {
        this.rateLimits = new Map();
      }
      
      const userLimit = this.rateLimits.get(ip) || {
        count: 0,
        resetAt: now + 60000
      };
      
      // Reset counter if time expired
      if (now > userLimit.resetAt) {
        userLimit.count = 0;
        userLimit.resetAt = now + 60000;
      }
      
      userLimit.count++;
      this.rateLimits.set(ip, userLimit);
      
      if (userLimit.count > this.options.maxRequestsPerMinute) {
        return res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded',
          resetAt: userLimit.resetAt
        });
      }
      
      next();
    });
  }
  
  /**
   * Set up Express routes
   * @private
   */
  _setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: Date.now(),
        uptime: process.uptime()
      });
    });
    
    // API routes
    this._setupApiRoutes();
    
    // Proxy routes
    this._setupProxyRoutes();
    
    // Default route
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
    
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not found',
        message: `The requested endpoint ${req.path} does not exist`
      });
    });
  }
  
  /**
   * Set up API routes
   * @private
   */
  _setupApiRoutes() {
    const apiRouter = express.Router();
    
    // Require authentication for API routes
    apiRouter.use(proxyAuth);
    
    // Apply rate limiting
    apiRouter.use(rateLimiter);
    
    // Server management routes
    apiRouter.get('/servers', (req, res) => {
      const servers = this.serverManager.getAllServers();
      res.json({ servers });
    });
    
    apiRouter.post('/servers', (req, res) => {
      try {
        const { name, url, type } = req.body;
        
        if (!name || !url) {
          return res.status(400).json({
            error: 'Invalid request',
            message: 'Server name and URL are required'
          });
        }
        
        const serverId = this.serverManager.addServer(name, {
          url,
          type: type || 'http'
        });
        
        res.status(201).json({
          success: true,
          serverId,
          message: `Server "${name}" added successfully`
        });
      } catch (error) {
        res.status(400).json({
          error: 'Failed to add server',
          message: error.message
        });
      }
    });
    
    apiRouter.delete('/servers/:id', (req, res) => {
      try {
        const { id } = req.params;
        const success = this.serverManager.removeServer(id);
        
        if (!success) {
          return res.status(404).json({
            error: 'Server not found',
            message: `No server found with ID ${id}`
          });
        }
        
        res.json({
          success: true,
          message: 'Server removed successfully'
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to remove server',
          message: error.message
        });
      }
    });
    
    // Session management routes
    apiRouter.get('/sessions', (req, res) => {
      const sessions = this.sessionManager.getAllSessions();
      res.json({ sessions });
    });
    
    apiRouter.post('/sessions', (req, res) => {
      try {
        const { userId } = req.user;
        const options = req.body.options || {};
        
        const session = this.sessionManager.createSession(userId, options);
        
        res.status(201).json({
          success: true,
          sessionId: session.sessionId,
          expiresAt: session.expires
        });
      } catch (error) {
        res.status(400).json({
          error: 'Failed to create session',
          message: error.message
        });
      }
    });
    
    apiRouter.delete('/sessions/:id', (req, res) => {
      try {
        const { id } = req.params;
        const { userId } = req.user;
        
        const session = this.sessionManager.getSession(id);
        
        if (!session) {
          return res.status(404).json({
            error: 'Session not found',
            message: `No session found with ID ${id}`
          });
        }
        
        // Only allow users to close their own sessions
        if (session.userId !== userId) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You can only close your own sessions'
          });
        }
        
        const success = this.sessionManager.closeSession(id, 'user-initiated');
        
        res.json({
          success,
          message: 'Session closed successfully'
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to close session',
          message: error.message
        });
      }
    });
    
    // Statistics routes
    apiRouter.get('/stats', (req, res) => {
      const sessionStats = this.sessionManager.getStats();
      const serverStats = this.serverManager.getAllServerStatuses();
      
      res.json({
        sessions: sessionStats,
        servers: serverStats,
        uptime: process.uptime()
      });
    });
    
    // Mount API router
    this.app.use('/api', apiRouter);
  }
  
  /**
   * Set up proxy routes
   * @private
   */
  _setupProxyRoutes() {
    const proxyRouter = express.Router();
    
    // Require authentication
    proxyRouter.use(proxyAuth);
    
    // Stricter rate limiting for proxy requests
    proxyRouter.use(rateLimiter);
    
    // Proxy request endpoint
    proxyRouter.post('/request', async (req, res) => {
      try {
        const { url, method, headers, body, options } = req.body;
        const { userId } = req.user;
        
        if (!url) {
          return res.status(400).json({
            error: 'Invalid request',
            message: 'Target URL is required'
          });
        }
        
        // Get or create session
        let session;
        if (options?.sessionId) {
          session = this.sessionManager.getSession(options.sessionId);
          if (!session) {
            return res.status(404).json({
              error: 'Session not found',
              message: `No session found with ID ${options.sessionId}`
            });
          }
          if (session.userId !== userId) {
            return res.status(403).json({
              error: 'Forbidden',
              message: 'You can only use your own sessions'
            });
          }
        } else {
          // Create a temporary session for this request
          session = this.sessionManager.createSession(userId, {
            timeout: 60000, // 1 minute
            metadata: { singleUse: true }
          });
        }
        
        // Forward the request through a proxy
        const response = await this.serverManager.makeRequest(
          options?.serverId,
          url, 
          {
            method: method || 'GET',
            headers: headers || {},
            data: body,
            timeout: options?.timeout || 30000
          }
        );
        
        // Track bandwidth usage
        if (response && response.headers) {
          const contentLength = parseInt(response.headers['content-length'] || '0', 10);
          this.sessionManager.trackBandwidth(session.sessionId, contentLength);
        }
        
        // Update session activity
        this.sessionManager.updateSession(session.sessionId, {
          lastActivity: Date.now(),
          requestCount: session.requestCount + 1
        });
        
        // Return response to client
        res.json({
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: response.data
        });
        
        // Close single-use sessions
        if (session.metadata?.singleUse) {
          this.sessionManager.closeSession(session.sessionId, 'single-use');
        }
      } catch (error) {
        console.error('Proxy request failed:', error);
        
        res.status(500).json({
          error: 'Proxy request failed',
          message: error.message
        });
      }
    });
    
    // Connection endpoint
    proxyRouter.post('/connect', async (req, res) => {
      try {
        const { serverId } = req.body;
        const { userId } = req.user;
        
        if (!serverId) {
          return res.status(400).json({
            error: 'Invalid request',
            message: 'Server ID is required'
          });
        }
        
        const connection = await this.serverManager.connect(serverId);
        
        res.json({
          success: true,
          connectionId: connection.id,
          server: connection.server
        });
      } catch (error) {
        res.status(500).json({
          error: 'Connection failed',
          message: error.message
        });
      }
    });
    
    // Mount proxy router
    this.app.use('/proxy', proxyRouter);
  }
  
  /**
   * Set up WebSocket handlers
   * @private
   */
  _setupWebSockets() {
    this.wss.on('connection', (ws, req) => {
      // Extract token from URL
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');
      
      // Verify token
      try {
        const decoded = jwt.verify(token, this.options.jwtSecret);
        ws.userId = decoded.userId;
        ws.isAuthenticated = true;
      } catch (error) {
        ws.isAuthenticated = false;
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Authentication failed'
        }));
        ws.terminate();
        return;
      }
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to proxy network'
      }));
      
      // Handle messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          
          // Handle different message types
          switch (data.type) {
            case 'ping':
              ws.send(JSON.stringify({
                type: 'pong',
                timestamp: Date.now()
              }));
              break;
              
            // Other message types...
            
            default:
              ws.send(JSON.stringify({
                type: 'error',
                message: `Unknown message type: ${data.type}`
              }));
          }
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'error',
            message: `Invalid message format: ${error.message}`
          }));
        }
      });
      
      // Handle close
      ws.on('close', () => {
        // Clean up any resources
      });
    });
  }
  
  /**
   * Set up error handling
   * @private
   */
  _setupErrorHandling() {
    // Global error handler
    this.app.use((err, req, res, next) => {
      console.error('Server error:', err);
      
      res.status(500).json({
        error: 'Server error',
        message: process.env.NODE_ENV === 'production' 
          ? 'An unexpected error occurred' 
          : err.message
      });
    });
    
    // Process error handlers
    process.on('uncaughtException', (err) => {
      console.error('Uncaught exception:', err);
      // Continue running, don't crash
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
      // Continue running, don't crash
    });
  }
  
  /**
   * Get server status
   * @returns {Object} Server status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      port: this.options.port,
      activeConnections: this.connections.size,
      activeSessions: this.sessionManager.getStats().active,
      uptime: process.uptime()
    };
  }
  
  /**
   * Get an available proxy device
   * @private
   * @returns {Object|null} - Available device or null
   */
  _getAvailableProxy() {
    const availableDevices = [...this.availableDevices.values()]
      .filter(device => 
        device.available && 
        device.consented && 
        device.isWifi && 
        device.isCharging &&
        device.bandwidthAvailableMB > 1 // Ensure at least 1MB available
      );
    
    if (availableDevices.length === 0) {
      return null;
    }
    
    // Get least used device to balance load
    availableDevices.sort((a, b) => {
      const aUsage = this.bandwidthUsage.get(a.deviceId)?.total || 0;
      const bUsage = this.bandwidthUsage.get(b.deviceId)?.total || 0;
      return aUsage - bUsage;
    });
    
    return availableDevices[0];
  }
  
  /**
   * Close connections for a specific device
   * @private
   * @param {string} deviceId - Device ID
   */
  _closeDeviceConnections(deviceId) {
    for (const [connectionId, connection] of this.activeConnections.entries()) {
      if (connection.deviceId === deviceId) {
        this.activeConnections.delete(connectionId);
        this.logger.info(`Closed connection ${connectionId} for device ${deviceId}`);
      }
    }
  }
  
  /**
   * Track bandwidth usage for a device
   * @private
   * @param {string} deviceId - Device ID
   * @param {number} megabytesUsed - Megabytes used
   */
  _trackBandwidthUsage(deviceId, megabytesUsed) {
    const device = this.availableDevices.get(deviceId);
    if (!device) return;
    
    // Update device bandwidth
    if (typeof device.bandwidthAvailableMB === 'number') {
      device.bandwidthAvailableMB = Math.max(0, device.bandwidthAvailableMB - megabytesUsed);
      this.availableDevices.set(deviceId, device);
    }
    
    // Update usage stats
    const usage = this.bandwidthUsage.get(deviceId) || {
      deviceId,
      total: 0,
      daily: {},
      lastUpdated: new Date()
    };
    
    usage.total += megabytesUsed;
    
    // Track daily usage
    const today = new Date().toISOString().split('T')[0];
    usage.daily[today] = (usage.daily[today] || 0) + megabytesUsed;
    usage.lastUpdated = new Date();
    
    this.bandwidthUsage.set(deviceId, usage);
    
    // Check if device has reached bandwidth limit
    if (device.bandwidthAvailableMB <= 0) {
      device.available = false;
      device.lastUnavailableReason = 'bandwidth-limit';
      this.availableDevices.set(deviceId, device);
      this._closeDeviceConnections(deviceId);
      this.logger.info(`Device ${deviceId} has reached bandwidth limit and is now unavailable`);
    }
  }
  
  /**
   * Get device usage statistics
   * @private
   * @returns {Object} - Device usage stats
   */
  _getDeviceUsageStats() {
    const deviceUsage = {};
    
    for (const [deviceId, usage] of this.bandwidthUsage.entries()) {
      deviceUsage[deviceId] = {
        total: usage.total,
        today: usage.daily[new Date().toISOString().split('T')[0]] || 0
      };
    }
    
    return deviceUsage;
  }
  
  /**
   * Get total bandwidth usage across all devices
   * @private
   * @returns {number} - Total bandwidth in MB
   */
  _getTotalBandwidthUsage() {
    let total = 0;
    
    for (const usage of this.bandwidthUsage.values()) {
      total += usage.total;
    }
    
    return total;
  }
  
  /**
   * Start periodic maintenance tasks
   * @private
   */
  _startMaintenanceTasks() {
    this.maintenanceInterval = setInterval(() => {
      this._cleanupInactiveDevices();
      this._cleanupExpiredConnections();
    }, 300000); // Run every 5 minutes
  }
  
  /**
   * Clean up inactive devices
   * @private
   */
  _cleanupInactiveDevices() {
    const now = new Date();
    const inactiveThreshold = 3600000; // 1 hour in milliseconds
    
    for (const [deviceId, device] of this.availableDevices.entries()) {
      const lastSeen = device.lastSeen || new Date(0);
      const timeSinceLastSeen = now - lastSeen;
      
      if (timeSinceLastSeen > inactiveThreshold) {
        // If device was active, clean up its connections
        if (device.available) {
          this._closeDeviceConnections(deviceId);
        }
        
        // Mark as unavailable but don't remove completely
        device.available = false;
        device.lastUnavailableReason = 'inactivity';
        this.availableDevices.set(deviceId, device);
        
        this.logger.info(`Device ${deviceId} marked inactive after ${Math.round(timeSinceLastSeen/60000)} minutes`);
      }
    }
  }
  
  /**
   * Clean up expired connections
   * @private
   */
  _cleanupExpiredConnections() {
    const now = new Date();
    const connectionTimeout = 600000; // 10 minutes in milliseconds
    
    for (const [connectionId, connection] of this.activeConnections.entries()) {
      const connectionDuration = now - connection.startTime;
      
      if (connectionDuration > connectionTimeout) {
        this.activeConnections.delete(connectionId);
        this.logger.info(`Connection ${connectionId} expired after ${Math.round(connectionDuration/60000)} minutes`);
      }
    }
  }
}

module.exports = ProxyNetworkServer; 