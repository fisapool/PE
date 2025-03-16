/**
 * Simplified ProxyClientSDK for Chrome Extension
 * Service Worker Compatible Version
 */

class ProxyClientSDK {
  constructor(options = {}) {
    this.options = {
      serverUrl: options.serverUrl || 'https://api.proxyethica.com',
      apiUrl: options.apiUrl || 'http://localhost:3000',
      appId: options.appId,
      appKey: options.appKey,
      apiKey: options.apiKey || '',
      userConsent: false,
      maxBandwidthMB: options.maxBandwidthMB || 100,
      ...options
    };
    
    this.deviceId = null;
    this.apiKey = options.apiKey || '';
    
    // Connection state
    this.state = {
      isConnected: false,
      isContributing: false,
      isWifi: true,
      isCharging: true,
      bandwidthUsed: 0,
      lastActive: null,
      optedIn: false
    };
    
    // Simple bandwidth tracking
    this.bandwidthTracker = {
      totalBytes: 0,
      sessionStartTime: null,
      limitMB: this.options.maxBandwidthMB,
      
      trackBandwidth(bytes) {
        this.totalBytes += bytes;
      },
      
      resetSession() {
        this.totalBytes = 0;
        this.sessionStartTime = Date.now();
      },
      
      getSessionStats() {
        return {
          totalBytes: this.totalBytes,
          sessionDuration: this.sessionStartTime ? (Date.now() - this.sessionStartTime) : 0
        };
      },
      
      isLimitReached() {
        const totalMB = this.totalBytes / (1024 * 1024);
        return totalMB >= this.limitMB;
      }
    };
    
    // Event handling
    this.eventHandlers = {};
  }
  
  // Event handling
  on(event, handler) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }
  
  emit(event, data) {
    if (this.eventHandlers[event]) {
      for (const handler of this.eventHandlers[event]) {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      }
    }
  }
  
  // Initialize - simplified
  async initialize() {
    try {
      // Generate a device ID
      this.deviceId = this._generateDeviceId();
      
      // Store in extension storage
      await chrome.storage.local.set({ proxyDeviceId: this.deviceId });
      
      // Get stored consent status
      const data = await chrome.storage.local.get('proxyConsent');
      this.state.optedIn = !!data.proxyConsent;
      
      console.log('SDK initialized with device ID:', this.deviceId);
      this.emit('initialized', { deviceId: this.deviceId });
      
      return { success: true, deviceId: this.deviceId };
    } catch (error) {
      console.error('Initialization error:', error);
      this.emit('error', { type: 'initialization', error });
      throw error;
    }
  }
  
  // Consent management
  async updateConsent(optIn) {
    try {
      this.state.optedIn = optIn;
      await chrome.storage.local.set({ proxyConsent: optIn });
      this.emit('consentUpdated', { optedIn: optIn });
      return { success: true, optedIn: optIn };
    } catch (error) {
      console.error('Error updating consent:', error);
      throw error;
    }
  }
  
  // Start contributing
  async startContributing() {
    try {
      if (!this.state.optedIn) {
        throw new Error('User has not provided consent');
      }
      
      this.state.isContributing = true;
      this.bandwidthTracker.resetSession();
      
      console.log('Started contribution session');
      this.emit('contributionStarted', {
        startTime: Date.now(),
        deviceId: this.deviceId
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error starting contribution:', error);
      throw error;
    }
  }
  
  // Stop contributing
  async stopContributing() {
    try {
      this.state.isContributing = false;
      
      const stats = this.bandwidthTracker.getSessionStats();
      console.log('Stopped contribution session', stats);
      
      this.emit('contributionStopped', {
        bandwidthUsed: stats.totalBytes,
        duration: stats.sessionDuration
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error stopping contribution:', error);
      throw error;
    }
  }
  
  // Get state
  getState() {
    return { ...this.state };
  }
  
  // Generate a device ID
  _generateDeviceId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// Export for service worker environment
self.ProxyClientSDK = ProxyClientSDK; 