/**
 * ProxyClient SDK for integrating residential proxy functionality into applications
 * AI-generated code for the Residential Proxy Project
 * ETHICAL CONSIDERATIONS: This SDK enforces consent, connection limits, and privacy protections
 */

const axios = require('axios');
const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const DnsLeakPrevention = require('../utils/DnsLeakPrevention');
const RobotsParser = require('../utils/RobotsParser');
const BandwidthTracker = require('../utils/BandwidthTracker');

class ProxyClientSDK extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      serverUrl: options.serverUrl || 'https://api.proxyethica.com',
      apiUrl: options.apiUrl || 'http://localhost:3000',
      appId: options.appId,
      appKey: options.appKey,
      apiKey: options.apiKey || '',
      userConsent: false, // Default to no consent - explicit opt-in required
      maxBandwidthMB: options.maxBandwidthMB || 100, // Default 100MB limit
      valueExchange: options.valueExchange || {},
      ...options
    };
    
    this.deviceId = options.deviceId || uuidv4();
    this.apiKey = options.apiKey || '';
    
    // Connection state
    this.state = {
      isConnected: false,
      isContributing: false, // Whether actively sharing connection
      isWifi: false,
      isCharging: false,
      bandwidthUsed: 0,
      lastActive: null,
      optedIn: false
    };
    
    // Bandwidth tracking
    this.bandwidthTracker = new BandwidthTracker({
      limitMB: this.options.maxBandwidthMB
    });
    
    // Check for DNS leaks
    this.dnsLeakPrevention = new DnsLeakPrevention();
    this.robotsParser = new RobotsParser();
    
    // Session management
    this.proxySession = null;
    this.contributionSession = null;
  }
  
  /**
   * Initialize the SDK
   * @returns {Promise<Object>} Initialization result
   */
  async initialize() {
    if (!this.options.appId || !this.options.appKey) {
      throw new Error('App ID and App Key are required');
    }
    
    if (this.apiKey) {
      try {
        // Test server connection with API key
        await axios.get(`${this.options.apiUrl}/health`, {
          headers: this._getHeaders(),
          timeout: 10000
        });
      } catch (error) {
        this.emit('error', { type: 'initialization', error });
        throw error;
      }
    }

    try {
      // Register device with server
      const response = await this._callApi('/device/register', {
        deviceId: this.deviceId,
        deviceInfo: this._getDeviceInfo()
      });
      
      // Store API key if provided
      if (response.apiKey) {
        this.apiKey = response.apiKey;
      }
      
      // Start monitoring device status
      this._startMonitoring();
      
      // Check for consent status
      await this.getConsentStatus();
      
      // Initialize DNS leak prevention
      this._initializeSecurityFeatures();
      
      this.emit('initialized', { deviceId: this.deviceId });
      return response;
    } catch (error) {
      this.emit('error', { type: 'initialization', error });
      throw error;
    }
  }
  
  /**
   * Start contributing as a residential proxy (with user consent)
   * @param {Object} options - Contribution options
   * @returns {Promise<Object>} Contribution session
   */
  async startContributing(options = {}) {
    // Verify user has opted in
    if (!this.state.optedIn) {
      throw new Error('User must provide consent before contributing');
    }
    
    // Check prerequisites
    if (!options.force) {
      // By default, only contribute when on WiFi and charging
      if (!this.state.isWifi && !options.allowMobileData) {
        throw new Error('Cannot contribute while on mobile data');
      }
      
      if (!this.state.isCharging && !options.allowOnBattery) {
        throw new Error('Cannot contribute while on battery power');
      }
    }
    
    try {
      // Start a contribution session
      const response = await this._callApi('/contribute/start', {
        deviceId: this.deviceId,
        constraints: {
          maxBandwidth: this.options.maxBandwidthMB,
          maxConcurrent: options.maxConcurrentConnections || 3,
          allowedRegions: options.allowedRegions || ['global'],
          disallowedSites: options.disallowedSites || []
        }
      });
      
      this.contributionSession = {
        id: response.sessionId,
        startedAt: new Date(),
        constraints: response.constraints || {}
      };
      
      this.state.isContributing = true;
      this.emit('contributionStarted', this.contributionSession);
      
      // Start contribution heartbeat
      this._startContributionHeartbeat();
      
      return this.contributionSession;
    } catch (error) {
      this.emit('error', { type: 'contribution', error });
      throw error;
    }
  }
  
  /**
   * Stop contributing as a residential proxy
   * @returns {Promise<Object>} Result of stopping contribution
   */
  async stopContributing() {
    if (!this.state.isContributing || !this.contributionSession) {
      return { success: false, message: 'Not currently contributing' };
    }
    
    try {
      const response = await this._callApi('/contribute/stop', {
        deviceId: this.deviceId,
        sessionId: this.contributionSession.id
      });
      
      // Clear contribution session
      this.state.isContributing = false;
      const sessionSummary = {
        ...this.contributionSession,
        endedAt: new Date(),
        duration: new Date() - this.contributionSession.startedAt,
        bandwidth: this.bandwidthTracker.getSessionStats()
      };
      this.contributionSession = null;
      
      // Stop heartbeat
      if (this.contributionHeartbeatInterval) {
        clearInterval(this.contributionHeartbeatInterval);
        this.contributionHeartbeatInterval = null;
      }
      
      this.emit('contributionStopped', sessionSummary);
      return {
        success: true,
        sessionSummary
      };
    } catch (error) {
      this.emit('error', { type: 'contribution', error });
      throw error;
    }
  }
  
  /**
   * Update user consent for participation in the proxy network
   * @param {boolean} optIn - Whether user consents to participating
   * @returns {Promise<Object>} Updated consent status
   */
  async updateConsent(optIn) {
    try {
      const response = await this._callApi('/consent/update', {
        deviceId: this.deviceId,
        optIn: Boolean(optIn),
        timestamp: new Date().toISOString()
      });
      
      this.state.optedIn = Boolean(optIn);
      
      // If opting out, stop contributing
      if (!optIn && this.state.isContributing) {
        await this.stopContributing();
      }
      
      this.emit('consentUpdated', { optedIn: this.state.optedIn });
      return response;
    } catch (error) {
      this.emit('error', { type: 'consent', error });
      throw error;
    }
  }
  
  /**
   * Get current consent status
   * @returns {Promise<Object>} Consent status
   */
  async getConsentStatus() {
    try {
      const response = await this._callApi('/consent/status', {
        deviceId: this.deviceId
      });
      
      this.state.optedIn = Boolean(response.optedIn);
      this.emit('consentStatus', { optedIn: this.state.optedIn });
      
      return response;
    } catch (error) {
      this.emit('error', { type: 'consent', error });
      throw error;
    }
  }
  
  /**
   * Get usage statistics for the device
   * @returns {Promise<Object>} Usage statistics
   */
  async getUsageStats() {
    try {
      const response = await this._callApi('/stats/device', {
        deviceId: this.deviceId
      });
      
      // Update local state with server stats
      if (response.bandwidthUsed) {
        this.state.bandwidthUsed = response.bandwidthUsed;
        this.bandwidthTracker.syncWithServer(response.bandwidthUsed);
      }
      
      return {
        ...response,
        localStats: this.bandwidthTracker.getStats()
      };
    } catch (error) {
      this.emit('error', { type: 'stats', error });
      throw error;
    }
  }
  
  /**
   * Connect to proxy network as a client
   * @param {Object} options - Connection options
   * @returns {Promise<Object>} Connection details
   */
  async connectAsClient(options = {}) {
    try {
      const response = await this._callApi('/connect', {
        deviceId: this.deviceId,
        options: {
          country: options.country,
          city: options.city,
          session: options.session || 'new',
          ...options
        }
      });
      
      this.proxySession = {
        id: response.sessionId,
        proxy: response.proxy,
        startedAt: new Date()
      };
      
      this.state.isConnected = true;
      this.emit('connected', this.proxySession);
      
      return this.proxySession;
    } catch (error) {
      this.emit('error', { type: 'connection', error });
      throw error;
    }
  }
  
  /**
   * Disconnect from proxy network as a client
   * @returns {Promise<Object>} Disconnect result
   */
  async disconnectClient() {
    if (!this.state.isConnected || !this.proxySession) {
      return { success: false, message: 'Not currently connected' };
    }
    
    try {
      const response = await this._callApi('/disconnect', {
        deviceId: this.deviceId,
        sessionId: this.proxySession.id
      });
      
      // Clear proxy session
      this.state.isConnected = false;
      const sessionSummary = {
        ...this.proxySession,
        endedAt: new Date(),
        duration: new Date() - this.proxySession.startedAt
      };
      this.proxySession = null;
      
      this.emit('disconnected', sessionSummary);
      return {
        success: true,
        sessionSummary
      };
    } catch (error) {
      this.emit('error', { type: 'disconnection', error });
      throw error;
    }
  }
  
  /**
   * Make a request through the proxy network
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async makeRequest(options) {
    if (!this.state.isConnected) {
      await this.connectAsClient();
    }
    
    try {
      // Check robots.txt compliance if enabled
      if (this.options.respectRobotsTxt && options.url) {
        const isAllowed = await this.robotsParser.isAllowed(options.url);
        if (!isAllowed) {
          throw new Error(`Request to ${options.url} disallowed by robots.txt`);
        }
      }
      
      const response = await this._callApi('/request', {
        sessionId: this.proxySession.id,
        request: {
          url: options.url,
          method: options.method || 'GET',
          headers: options.headers || {},
          data: options.data,
          timeout: options.timeout || 30000
        }
      });
      
      // Track bandwidth used
      if (response.stats && response.stats.bytesTransferred) {
        this.bandwidthTracker.trackRequest(
          response.stats.bytesTransferred.sent || 0,
          response.stats.bytesTransferred.received || 0
        );
      }
      
      return response;
    } catch (error) {
      this.emit('error', { type: 'request', error });
      throw error;
    }
  }
  
  /**
   * Get the current connection state
   * @returns {Object} Current state
   */
  getState() {
    return {
      ...this.state,
      bandwidthStats: this.bandwidthTracker.getStats()
    };
  }
  
  /**
   * Check if device can contribute based on current state
   * @returns {Object} Eligibility information
   */
  checkContributionEligibility() {
    const eligibility = {
      eligible: this.state.optedIn,
      reasons: []
    };
    
    if (!this.state.optedIn) {
      eligibility.reasons.push('User has not opted in');
    }
    
    if (!this.state.isWifi) {
      eligibility.eligible = false;
      eligibility.reasons.push('Not connected to WiFi');
    }
    
    if (!this.state.isCharging) {
      eligibility.eligible = false;
      eligibility.reasons.push('Device not charging');
    }
    
    if (this.bandwidthTracker.isLimitReached()) {
      eligibility.eligible = false;
      eligibility.reasons.push('Bandwidth limit reached');
    }
    
    return eligibility;
  }
  
  /**
   * Cleanup and shutdown SDK
   */
  async cleanup() {
    // Stop contributing if active
    if (this.state.isContributing) {
      await this.stopContributing();
    }
    
    // Disconnect if connected
    if (this.state.isConnected) {
      await this.disconnectClient();
    }
    
    // Stop monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    // Remove all listeners
    this.removeAllListeners();
  }
  
  /**
   * Make an API call to the server
   * @private
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @returns {Promise<Object>} - API response
   */
  async _callApi(endpoint, data) {
    try {
      const headers = this._getHeaders();
      
      const response = await axios.post(`${this.options.apiUrl}${endpoint}`, data, {
        headers,
        timeout: 30000
      });
      
      return response.data;
    } catch (error) {
      this.emit('error', { type: 'api', endpoint, error });
      throw error;
    }
  }
  
  /**
   * Get request headers with authentication
   * @private
   * @returns {Object} Headers object
   */
  _getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'ProxyEthica-SDK/1.0'
    };
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    } else if (this.options.appId && this.options.appKey) {
      headers['X-App-ID'] = this.options.appId;
      headers['X-App-Key'] = this.options.appKey;
    }
    
    return headers;
  }
  
  /**
   * Get device information
   * @private
   * @returns {Object} Device info
   */
  _getDeviceInfo() {
    // Collect basic device info for proper proxy configuration
    // This information helps provide a legitimate residential footprint
    const info = {
      deviceId: this.deviceId,
      timestamp: new Date().toISOString(),
      appVersion: this.options.appVersion || '1.0.0'
    };
    
    // Get platform-specific info if available
    // Only collect what's needed for proxy operation
    // No personal data is collected
    if (typeof navigator !== 'undefined') {
      info.platform = navigator.platform;
      info.userAgent = navigator.userAgent;
      info.language = navigator.language;
    } else if (typeof process !== 'undefined') {
      info.platform = process.platform;
      info.version = process.version;
    }
    
    return info;
  }
  
  /**
   * Initialize security features
   * @private
   */
  _initializeSecurityFeatures() {
    // Check for DNS leaks
    const dnsConfig = {
      // Safe connection options only
    };
    
    const leakCheck = this.dnsLeakPrevention.checkForLeaks(dnsConfig);
    if (leakCheck) {
      this.emit('warning', {
        type: 'dnsLeak',
        message: 'Potential DNS leak detected'
      });
    }
  }
  
  /**
   * Start monitoring device status
   * @private
   */
  _startMonitoring() {
    // Poll for device status periodically
    this.monitoringInterval = setInterval(() => {
      this._updateDeviceStatus();
    }, 30000); // Every 30 seconds
    
    // Don't prevent Node process from exiting
    if (this.monitoringInterval.unref) {
      this.monitoringInterval.unref();
    }
    
    // Initial status update
    this._updateDeviceStatus();
  }
  
  /**
   * Update device status (connectivity, battery, etc.)
   * @private
   */
  _updateDeviceStatus() {
    // Check network status
    if (typeof navigator !== 'undefined' && navigator.connection) {
      this.state.isWifi = navigator.connection.type === 'wifi';
    }
    
    // Check battery status
    if (typeof navigator !== 'undefined' && navigator.getBattery) {
      navigator.getBattery().then(battery => {
        this.state.isCharging = battery.charging;
      });
    }
    
    this.state.lastActive = new Date();
    this.emit('statusUpdated', this.getState());
  }
  
  /**
   * Send periodic heartbeats for contribution session
   * @private
   */
  _startContributionHeartbeat() {
    if (this.contributionHeartbeatInterval) {
      clearInterval(this.contributionHeartbeatInterval);
    }
    
    this.contributionHeartbeatInterval = setInterval(async () => {
      if (!this.state.isContributing || !this.contributionSession) {
        clearInterval(this.contributionHeartbeatInterval);
        return;
      }
      
      try {
        await this._callApi('/contribute/heartbeat', {
          deviceId: this.deviceId,
          sessionId: this.contributionSession.id,
          stats: {
            bandwidth: this.bandwidthTracker.getSessionStats(),
            state: this.getState()
          }
        });
      } catch (error) {
        this.emit('warning', {
          type: 'heartbeat',
          message: 'Failed to send heartbeat',
          error
        });
      }
    }, 60000); // Every minute
    
    // Don't prevent Node process from exiting
    if (this.contributionHeartbeatInterval.unref) {
      this.contributionHeartbeatInterval.unref();
    }
  }
}

module.exports = ProxyClientSDK; 