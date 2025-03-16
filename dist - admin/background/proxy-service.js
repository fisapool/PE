// ProxyEthica Network - Proxy Service Implementation
class ProxyService {
  constructor() {
    this.active = false;
    this.proxyPool = [];
    this.userContributedIPs = [];
    this.currentProxy = null;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.lastRotationTime = null;
    this.rotationInterval = 30 * 60 * 1000; // 30 minutes in milliseconds
    this.stats = {
      bandwidthUsed: 0,
      contributionMinutes: 0,
      requestCount: 0,
      failedRequests: 0
    };
  }

  // Initialize the proxy service
  async init() {
    console.log('Initializing ProxyEthica proxy service');
    
    // Load user preferences
    await this.loadSettings();
    
    // Load proxy pool from API or config
    this.proxyPool = await this.fetchProxyPool();
    
    // Load user-contributed IPs
    await this.loadUserContributedIPs();
    
    // Add default bypass sites
    await this.addDefaultBypassSites();
    
    // Start monitoring
    this.setupMonitoring();
    
    return this.proxyPool.length > 0;
  }

  // Load settings from storage
  async loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['proxySettings'], (result) => {
        if (result.proxySettings) {
          this.settings = result.proxySettings;
        } else {
          // Default settings
          this.settings = {
            autoRotate: true,
            maxBandwidth: 500, // MB
            allowMobile: false,
            allowBattery: false
          };
        }
        resolve();
      });
    });
  }

  // Load user-contributed IPs from storage
  async loadUserContributedIPs() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['userProxies'], (result) => {
        if (result.userProxies && Array.isArray(result.userProxies)) {
          this.userContributedIPs = result.userProxies;
          // Add user IPs to the main proxy pool
          this.proxyPool = [...this.proxyPool, ...this.userContributedIPs];
        }
        resolve();
      });
    });
  }

  // Fetch proxy pool from API
  async fetchProxyPool() {
    try {
      // In a production environment, replace this with an actual API call
      // Example: const response = await fetch('https://proxyethica.com/api/proxy-pool');
      // const data = await response.json();
      // return data.proxies;
      
      console.log('Fetching proxy pool');
      
      // For now, return sample data
      return [
        { ip: '192.168.1.100', port: 8080, country: 'US', city: 'New York', type: 'residential' },
        { ip: '192.168.1.101', port: 8080, country: 'DE', city: 'Berlin', type: 'residential' },
        { ip: '192.168.1.102', port: 8080, country: 'JP', city: 'Tokyo', type: 'datacenter' }
      ];
    } catch (error) {
      console.error('Error fetching proxy pool:', error);
      
      // In case of failure, return empty pool or cached pool if available
      return [];
    }
  }

  // Start proxying requests
  async start() {
    if (!this.active) {
      console.log('Starting proxy service');
      
      try {
        // Check if network conditions are suitable
        const networkSuitable = await this.checkNetworkEnvironment();
        if (!networkSuitable.suitable) {
          return {
            success: false,
            error: networkSuitable.reason
          };
        }
        
        this.active = true;
        this.startTime = new Date();
        this.lastRotationTime = new Date();
        
        // Select a proxy
        this.currentProxy = await this.selectRandomProxy();
        
        if (!this.currentProxy) {
          throw new Error('No proxies available');
        }
        
        // Configure proxy settings
        await this.configureProxySettings(this.currentProxy);
        
        // Start auto-rotation if enabled
        if (this.settings.autoRotate) {
          this.startAutoRotation();
        }
        
        return {
          success: true,
          proxy: this.currentProxy
        };
      } catch (error) {
        this.active = false;
        console.error('Failed to start proxy service:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }
    
    return {
      success: false,
      error: 'Proxy service already active'
    };
  }

  // Stop proxying requests
  async stop() {
    if (this.active) {
      console.log('Stopping proxy service');
      
      this.active = false;
      
      // Calculate and save contribution time for this session
      if (this.startTime) {
        const now = new Date();
        const sessionMinutes = (now - this.startTime) / (1000 * 60);
        this.stats.contributionMinutes += sessionMinutes;
        await this.saveStats();
      }
      
      this.currentProxy = null;
      this.startTime = null;
      
      // Stop auto-rotation
      if (this.rotationTimer) {
        clearInterval(this.rotationTimer);
        this.rotationTimer = null;
      }
      
      // Reset proxy settings
      await this.resetProxySettings();
      
      return {
        success: true
      };
    }
    
    return {
      success: false,
      error: 'Proxy service not active'
    };
  }

  // Configure Chrome proxy settings
  async configureProxySettings(proxy) {
    console.log('Configuring proxy:', proxy);
    
    try {
      // Configure DNS over HTTPS if supported (requires Chrome 78+)
      await this.configureDnsSettings();
      
      // TESTING MODE: Skip actual proxy config in dev environment
      if (proxy.ip.startsWith('192.168.')) {
        console.log('Development mode: Not setting actual proxy to avoid connection issues');
        return true;
      }
      
      // Create proxy configuration
      const config = {
        mode: "fixed_servers",
        rules: {
          // Configure separate proxies for HTTP and HTTPS
          proxyForHttp: {
            scheme: "http",
            host: proxy.ip,
            port: parseInt(proxy.port)
          },
          proxyForHttps: {
            scheme: "http",
            host: proxy.ip,
            port: parseInt(proxy.port)
          },
          bypassList: []
        }
      };
      
      // Get bypass domains
      const storage = await new Promise(resolve => chrome.storage.local.get(['bypassSites'], resolve));
      config.rules.bypassList = storage.bypassSites || [];
      
      // Add standard bypass entries
      config.rules.bypassList.push("localhost");
      config.rules.bypassList.push("127.0.0.1");
      config.rules.bypassList.push("<local>");
      
      await chrome.proxy.settings.set({value: config, scope: 'regular'});
      
      // Log confirmation
      console.log(`Proxy configured successfully: ${proxy.ip}:${proxy.port}`);
      
      return true;
    } catch (error) {
      console.error('Failed to configure proxy settings:', error);
      return false;
    }
  }

  // Reset proxy settings
  async resetProxySettings() {
    console.log('Resetting proxy settings');
    
    try {
      // Set direct connection (no proxy)
      const config = {
        mode: "direct"
      };
      
      await chrome.proxy.settings.set({
        value: config,
        scope: 'regular'
      });
      
      console.log('Proxy settings reset successfully');
      return true;
    } catch (error) {
      console.error('Failed to reset proxy settings:', error);
      return false;
    }
  }

  // Select a random proxy from the pool
  async selectRandomProxy() {
    if (this.proxyPool.length === 0) {
      await this.fetchProxyPool();
      
      if (this.proxyPool.length === 0) {
        console.error('No proxies available');
        return null;
      }
    }
    
    const randomIndex = Math.floor(Math.random() * this.proxyPool.length);
    return this.proxyPool[randomIndex];
  }

  // Rotate to a new proxy
  async rotateProxy() {
    console.log('Rotating proxy');
    
    if (!this.active) {
      return {
        success: false,
        error: 'Proxy service not active'
      };
    }
    
    try {
      // Remember the current proxy in case we need to fall back
      const previousProxy = this.currentProxy;
      
      // Select a new proxy different from the current one
      let newProxy;
      let attempts = 0;
      const maxAttempts = 5;
      
      do {
        newProxy = await this.selectRandomProxy();
        attempts++;
      } while (
        newProxy && 
        previousProxy && 
        newProxy.ip === previousProxy.ip && 
        attempts < maxAttempts
      );
      
      if (!newProxy) {
        throw new Error('Failed to find a new proxy');
      }
      
      // Configure new proxy
      const success = await this.configureProxySettings(newProxy);
      
      if (!success) {
        throw new Error('Failed to configure new proxy');
      }
      
      // Update current proxy and rotation time
      this.currentProxy = newProxy;
      this.lastRotationTime = new Date();
      
      return {
        success: true,
        proxy: this.currentProxy
      };
    } catch (error) {
      console.error('Error rotating proxy:', error);
      
      // Try to fall back to the previous proxy if possible
      if (this.currentProxy) {
        try {
          await this.configureProxySettings(this.currentProxy);
        } catch (fallbackError) {
          console.error('Failed to fall back to previous proxy:', fallbackError);
        }
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Start automatic proxy rotation
  startAutoRotation() {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }
    
    this.rotationTimer = setInterval(async () => {
      if (this.active) {
        console.log('Auto-rotating proxy');
        await this.rotateProxy();
      }
    }, this.rotationInterval);
  }

  // Track bandwidth usage
  trackBandwidthUsage(bytes) {
    if (!this.active) return;
    
    // Convert bytes to MB
    const megabytes = bytes / (1024 * 1024);
    
    this.stats.bandwidthUsed += megabytes;
    this.stats.requestCount++;
    
    // Check if we've reached the bandwidth limit
    if (this.settings.maxBandwidth > 0 && 
        this.stats.bandwidthUsed >= this.settings.maxBandwidth) {
      console.log('Bandwidth limit reached, stopping proxy service');
      this.stop();
    }
  }

  // Track a failed request
  trackFailedRequest() {
    if (!this.active) return;
    
    this.stats.failedRequests++;
    
    // If too many consecutive failures, rotate the proxy
    if (this.stats.failedRequests >= 5) {
      console.log('Too many failed requests, rotating proxy');
      this.rotateProxy();
      this.stats.failedRequests = 0;
    }
  }

  // Save stats to storage
  async saveStats() {
    return new Promise((resolve) => {
      chrome.storage.local.set({ proxyStats: this.stats }, resolve);
    });
  }

  // Load stats from storage
  async loadStats() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['proxyStats'], (result) => {
        if (result.proxyStats) {
          this.stats = result.proxyStats;
        }
        resolve();
      });
    });
  }

  // Get current stats
  getStats() {
    const stats = { ...this.stats };
    
    // Add current status info
    stats.active = this.active;
    stats.currentIP = this.currentProxy ? this.currentProxy.ip : null;
    stats.currentPort = this.currentProxy ? this.currentProxy.port : null;
    stats.currentCountry = this.currentProxy ? this.currentProxy.country : null;
    
    // Calculate uptime if active
    if (this.active && this.startTime) {
      const now = new Date();
      stats.uptime = Math.floor((now - this.startTime) / (1000 * 60)); // in minutes
    } else {
      stats.uptime = 0;
    }
    
    return stats;
  }

  // Setup monitoring for network requests
  setupMonitoring() {
    try {
      // Monitor completed requests to track bandwidth
      chrome.webRequest.onCompleted.addListener(
        (details) => {
          if (this.active && details.fromCache === false) {
            this.trackBandwidthUsage(details.responseSize || 0);
          }
        },
        { urls: ["<all_urls>"] }
      );
      
      // Monitor failed requests
      chrome.webRequest.onErrorOccurred.addListener(
        (details) => {
          if (this.active) {
            this.trackFailedRequest();
          }
        },
        { urls: ["<all_urls>"] }
      );
    } catch (error) {
      console.warn('Could not set up request monitoring:', error);
      // Non-fatal error, continue anyway
    }
  }

  // Check if network conditions are suitable for proxying
  async checkNetworkEnvironment() {
    // Check if on WiFi (if that setting is required)
    if (!this.settings.allowMobile) {
      // In a real implementation, you would check if on WiFi vs. mobile
      // For now, we'll assume it's on WiFi
      // const connection = navigator.connection;
      // if (connection && connection.type === 'cellular') {
      //   return {
      //     suitable: false,
      //     reason: 'Cannot start proxy on mobile data. Please connect to WiFi.'
      //   };
      // }
    }
    
    // Check if device is charging (if that setting is required)
    if (!this.settings.allowBattery) {
      // In a real implementation, you would check battery status
      // const battery = await navigator.getBattery();
      // if (!battery.charging && battery.level < 0.3) {
      //   return {
      //     suitable: false,
      //     reason: 'Cannot start proxy on battery power below 30%. Please connect to power.'
      //   };
      // }
    }
    
    return {
      suitable: true
    };
  }

  // Configure DNS settings to prevent DNS leaks
  async configureDnsSettings() {
    try {
      // Check if chrome.dns API is available (requires Chrome 78+)
      if (chrome.dns) {
        await chrome.dns.setDnsOverHttpsMode({
          mode: 'secure'
        });
        console.log('Configured DNS over HTTPS');
      }
    } catch (error) {
      console.warn('Could not configure DNS settings:', error);
      // Non-fatal error, continue anyway
    }
  }

  // Get the current bypass list
  async getBypassList() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['bypassSites'], (result) => {
        resolve(result.bypassSites || []);
      });
    });
  }

  // Set the bypass list
  async setBypassList(bypassList) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ bypassSites: bypassList }, resolve);
    });
  }

  // Add default sites to bypass list (called during initialization)
  async addDefaultBypassSites() {
    const currentList = await this.getBypassList();
    const defaultSites = [
      'youtube.com',
      'googlevideo.com',   // Used for YouTube video streaming
      'ytimg.com',         // YouTube images
      'google.com',
      'gmail.com',
      'gstatic.com',       // Google static content
      'accounts.google.com'
    ];
    
    let updated = false;
    defaultSites.forEach(site => {
      if (!currentList.includes(site)) {
        currentList.push(site);
        updated = true;
      }
    });
    
    if (updated) {
      await this.setBypassList(currentList);
      console.log('Added default bypass sites:', defaultSites);
    }
    
    return currentList;
  }
}

// Make ProxyService globally available
window.ProxyService = ProxyService; 