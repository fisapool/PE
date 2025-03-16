// ProxyEthica Network - Background Service Worker
console.log('ProxyEthica background service worker started');

// We'll load ProxyService.js as a regular script

// Mock data for testing
let proxyData = {
  active: false,
  currentIP: null,
  bandwidthUsed: 0,
  startTime: null,
  totalContributionTime: 0,  // Total time in minutes
  lastUpdateTime: null
};

// Initialize the proxy service
const proxyService = new self.ProxyService();
proxyService.init().then(() => {
  console.log('Proxy service initialized successfully');
}).catch(error => {
  console.error('Failed to initialize proxy service:', error);
});

// Function to check if a URL should bypass the proxy
function shouldBypassProxy(url) {
  return new Promise((resolve) => {
    try {
      const hostname = new URL(url).hostname;
      
      chrome.storage.local.get(['bypassSites'], function(result) {
        const bypassSites = result.bypassSites || [];
        
        // Check if any bypass site is a match for this hostname
        const shouldBypass = bypassSites.some(site => {
          // Exact match
          if (hostname === site) return true;
          // Subdomain match (e.g. mail.example.com matches example.com)
          if (hostname.endsWith('.' + site)) return true;
          return false;
        });
        
        resolve(shouldBypass);
      });
    } catch (e) {
      // Invalid URL, don't bypass
      resolve(false);
    }
  });
}

// Handle incoming messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  // Start proxy service
  if (request.action === 'startProxy') {
    proxyService.start().then(result => {
      if (result.success) {
        proxyData.active = true;
        proxyData.startTime = new Date();
        proxyData.lastUpdateTime = new Date();
        proxyData.currentIP = result.proxy.ip;
        
        // Start simulations for backward compatibility
        startBandwidthSimulation();
        startTimeTracking();
        
        sendResponse({
          status: 'started',
          message: 'Proxy service started successfully',
          proxy: result.proxy
        });
      } else {
        sendResponse({
          status: 'error',
          message: result.error || 'Failed to start proxy service'
        });
      }
    }).catch(error => {
      console.error('Error starting proxy:', error);
      sendResponse({
        status: 'error',
        message: error.message || 'Unknown error starting proxy service'
      });
    });
  }
  
  // Stop proxy service
  else if (request.action === 'stopProxy') {
    proxyService.stop().then(result => {
      if (result.success) {
        // Calculate contribution time for this session before stopping
        if (proxyData.active && proxyData.startTime) {
          const now = new Date();
          const sessionMinutes = (now - proxyData.startTime) / (1000 * 60);
          proxyData.totalContributionTime += sessionMinutes;
        }
        
        proxyData.active = false;
        proxyData.currentIP = null;
        
        stopBandwidthSimulation();
        stopTimeTracking();
        
        sendResponse({
          status: 'stopped',
          message: 'Proxy service stopped successfully'
        });
      } else {
        sendResponse({
          status: 'error',
          message: result.error || 'Failed to stop proxy service'
        });
      }
    }).catch(error => {
      console.error('Error stopping proxy:', error);
      sendResponse({
        status: 'error',
        message: error.message || 'Unknown error stopping proxy service'
      });
    });
  }
  
  // Get new proxy
  else if (request.action === 'getProxy') {
    proxyService.start().then(result => {
      if (result.success) {
        proxyData.currentIP = result.proxy.ip;
        sendResponse({
          status: 'success',
          ip: result.proxy.ip,
          port: result.proxy.port,
          country: result.proxy.country
        });
      } else {
        sendResponse({
          status: 'error',
          message: result.error || 'Failed to get proxy'
        });
      }
    }).catch(error => {
      console.error('Error getting proxy:', error);
      sendResponse({
        status: 'error',
        message: error.message || 'Unknown error getting proxy'
      });
    });
  }
  
  // Rotate proxy
  else if (request.action === 'rotateProxy') {
    proxyService.rotateProxy().then(result => {
      if (result.success) {
        proxyData.currentIP = result.proxy.ip;
        sendResponse({
          status: 'rotated',
          ip: result.proxy.ip,
          port: result.proxy.port,
          country: result.proxy.country
        });
      } else {
        sendResponse({
          status: 'error',
          message: result.error || 'Failed to rotate proxy'
        });
      }
    }).catch(error => {
      console.error('Error rotating proxy:', error);
      sendResponse({
        status: 'error',
        message: error.message || 'Unknown error rotating proxy'
      });
    });
  }
  
  // Disable proxy
  else if (request.action === 'disableProxy') {
    proxyService.stop().then(result => {
      if (result.success) {
        proxyData.currentIP = null;
        proxyData.active = false;
        sendResponse({
          status: 'disabled',
          message: 'Proxy disabled'
        });
      } else {
        sendResponse({
          status: 'error',
          message: result.error || 'Failed to disable proxy'
        });
      }
    }).catch(error => {
      console.error('Error disabling proxy:', error);
      sendResponse({
        status: 'error',
        message: error.message || 'Unknown error disabling proxy'
      });
    });
  }
  
  // Get proxy stats
  else if (request.action === 'getStats') {
    // Get stats from the proxy service
    const serviceStats = proxyService.getStats();
    
    // Combine with existing proxyData
    sendResponse({
      active: serviceStats.active,
      bandwidthUsed: serviceStats.bandwidthUsed.toFixed(2),
      contributionMinutes: Math.round(serviceStats.contributionMinutes),
      currentIP: serviceStats.currentIP,
      requestCount: serviceStats.requestCount
    });
  }
  
  // Return true to indicate we'll respond asynchronously
  return true;
});

// Helper function to generate a random IP for testing
function generateRandomIP() {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

// Bandwidth simulation
let bandwidthInterval;
let timeTrackingInterval;

// Add these new functions for time tracking
function startTimeTracking() {
  if (timeTrackingInterval) {
    clearInterval(timeTrackingInterval);
  }
  
  // Update contribution time every minute
  timeTrackingInterval = setInterval(() => {
    if (proxyData.active) {
      const now = new Date();
      // Update last tracked time
      proxyData.lastUpdateTime = now;
    }
  }, 60000); // Every minute
}

function stopTimeTracking() {
  if (timeTrackingInterval) {
    clearInterval(timeTrackingInterval);
    timeTrackingInterval = null;
  }
}

function startBandwidthSimulation() {
  // Clear any existing interval
  if (bandwidthInterval) {
    clearInterval(bandwidthInterval);
  }
  
  // Increment bandwidth usage every few seconds (for demonstration)
  bandwidthInterval = setInterval(() => {
    if (proxyData.active) {
      // Add between 1-5 MB of simulated bandwidth
      proxyData.bandwidthUsed += Math.floor(Math.random() * 5) + 1;
    }
  }, 5000); // Every 5 seconds
}

function stopBandwidthSimulation() {
  if (bandwidthInterval) {
    clearInterval(bandwidthInterval);
    bandwidthInterval = null;
  }
}

// Function to get current stats
function getProxyStats() {
  const now = new Date();
  let contributionMinutes = 0;
  
  // Always show some minutes if there's bandwidth
  if (proxyData.bandwidthUsed > 0) {
    // Estimate 1 minute per 5MB of bandwidth
    contributionMinutes = Math.max(1, Math.floor(proxyData.bandwidthUsed / 5));
  }
  
  return {
    active: proxyData.active,
    bandwidthUsed: proxyData.bandwidthUsed,
    contributionMinutes: contributionMinutes,
    currentIP: proxyData.currentIP
  };
}

// Set up message handler for stats requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStats') {
    sendResponse(getProxyStats());
  }
  return true;
}); 