// ProxyEthica Dashboard JS
document.addEventListener('DOMContentLoaded', function() {
  console.log('Dashboard loaded');
  
  // Check if user is authenticated or has skipped login
  chrome.storage.local.get(['isAuthenticated', 'skipLogin', 'user'], function(result) {
    if (!result.isAuthenticated && !result.skipLogin) {
      // Not authenticated and didn't skip, redirect to login
      window.location.href = 'login.html';
      return;
    }
    
    // Show user info if authenticated
    if (result.isAuthenticated && result.user) {
      // Add user info to header
      const header = document.querySelector('header');
      const userInfo = document.createElement('div');
      userInfo.className = 'user-info';
      userInfo.innerHTML = `<span>Welcome, ${result.user.name}</span> | <a href="#" id="logout-link">Logout</a>`;
      header.appendChild(userInfo);
      
      // Add logout functionality
      document.getElementById('logout-link').addEventListener('click', function(e) {
        e.preventDefault();
        chrome.storage.local.set({isAuthenticated: false, user: null}, function() {
          window.location.href = 'login.html';
        });
      });
    }
  });
  
  // Initialize UI elements
  initDashboard();
  
  // Start periodic stats updates
  updateStats();
  setInterval(updateStats, 3000); // Update every 3 seconds
});

// Initialize dashboard UI and functionality
function initDashboard() {
  const toggleProxyBtn = document.getElementById('toggle-proxy-btn');
  const getProxyBtn = document.getElementById('get-proxy-btn');
  const rotateProxyBtn = document.getElementById('rotate-proxy-btn');
  const disableProxyBtn = document.getElementById('disable-proxy-btn');
  
  // Add activity log entry
  addLogEntry('Dashboard initialized');
  
  // Toggle proxy status
  if (toggleProxyBtn) {
    toggleProxyBtn.addEventListener('click', function() {
      const statusDot = document.getElementById('status-dot');
      const statusText = document.getElementById('status-text');
      
      if (statusDot.classList.contains('inactive')) {
        // Start proxy
        statusDot.classList.remove('inactive');
        statusDot.classList.add('active');
        statusText.textContent = 'Connected';
        toggleProxyBtn.textContent = 'Stop Contributing';
        
        // Notify background script
        chrome.runtime.sendMessage({action: 'startProxy'}, function(response) {
          // Check for error
          if (chrome.runtime.lastError) {
            console.error('Error starting proxy:', chrome.runtime.lastError);
            addLogEntry('Error starting proxy: Connection error');
            return;
          }

          console.log('Proxy service started:', response);
          addLogEntry('Proxy service started successfully');
        });
      } else {
        // Stop proxy
        statusDot.classList.remove('active');
        statusDot.classList.add('inactive');
        statusText.textContent = 'Disconnected';
        toggleProxyBtn.textContent = 'Start Contributing';
        
        // Notify background script
        chrome.runtime.sendMessage({action: 'stopProxy'}, function(response) {
          // Check for error
          if (chrome.runtime.lastError) {
            console.error('Error stopping proxy:', chrome.runtime.lastError);
            addLogEntry('Error stopping proxy: Connection error');
            return;
          }

          console.log('Proxy service stopped:', response);
          addLogEntry('Proxy service stopped successfully');
        });
      }
    });
  }
  
  // Get Proxy button
  if (getProxyBtn) {
    getProxyBtn.addEventListener('click', function() {
      addLogEntry('Requesting new proxy...');
      chrome.runtime.sendMessage({action: 'getProxy'}, function(response) {
        if (chrome.runtime.lastError) {
          addLogEntry('Error getting proxy: Connection error');
          return;
        }
        
        if (response && response.ip) {
          document.getElementById('current-proxy').textContent = response.ip;
          document.getElementById('proxy-status').textContent = 'Active';
          addLogEntry(`New proxy assigned: ${response.ip} (${response.country})`);
        }
      });
    });
  }
  
  // Rotate Proxy button
  if (rotateProxyBtn) {
    rotateProxyBtn.addEventListener('click', function() {
      addLogEntry('Rotating proxy...');
      chrome.runtime.sendMessage({action: 'rotateProxy'}, function(response) {
        if (chrome.runtime.lastError) {
          addLogEntry('Error rotating proxy: Connection error');
          return;
        }
        
        if (response && response.ip) {
          document.getElementById('current-proxy').textContent = response.ip;
          addLogEntry(`Proxy rotated to: ${response.ip} (${response.country})`);
        }
      });
    });
  }
  
  // Disable Proxy button
  if (disableProxyBtn) {
    disableProxyBtn.addEventListener('click', function() {
      addLogEntry('Disabling proxy...');
      chrome.runtime.sendMessage({action: 'disableProxy'}, function(response) {
        if (chrome.runtime.lastError) {
          addLogEntry('Error disabling proxy: Connection error');
          return;
        }
        
        document.getElementById('current-proxy').textContent = 'None';
        document.getElementById('proxy-status').textContent = 'Inactive';
        addLogEntry('Proxy disabled successfully');
      });
    });
  }
  
  // Load settings from storage
  chrome.storage.local.get(['maxBandwidth', 'allowMobile', 'allowBattery'], function(result) {
    if (result.maxBandwidth) {
      document.getElementById('max-bandwidth').value = result.maxBandwidth;
    }
    
    if (result.allowMobile) {
      document.getElementById('allow-mobile').checked = result.allowMobile;
    }
    
    if (result.allowBattery) {
      document.getElementById('allow-battery').checked = result.allowBattery;
    }
  });
  
  // Save settings when changed
  document.getElementById('max-bandwidth').addEventListener('change', saveSettings);
  document.getElementById('allow-mobile').addEventListener('change', saveSettings);
  document.getElementById('allow-battery').addEventListener('change', saveSettings);
  
  // Check proxy status on load
  chrome.runtime.sendMessage({action: 'getStats'}, function(response) {
    if (chrome.runtime.lastError) return;
    
    if (response && response.active) {
      const statusDot = document.getElementById('status-dot');
      const statusText = document.getElementById('status-text');
      const toggleProxyBtn = document.getElementById('toggle-proxy-btn');
      
      if (statusDot) {
        statusDot.classList.remove('inactive');
        statusDot.classList.add('active');
      }
      
      if (statusText) {
        statusText.textContent = 'Connected';
      }
      
      if (toggleProxyBtn) {
        toggleProxyBtn.textContent = 'Stop Contributing';
      }
    }
  });
}

// Save settings to Chrome storage
function saveSettings() {
  const maxBandwidth = document.getElementById('max-bandwidth').value;
  const allowMobile = document.getElementById('allow-mobile').checked;
  const allowBattery = document.getElementById('allow-battery').checked;
  
  chrome.storage.local.set({
    maxBandwidth: maxBandwidth,
    allowMobile: allowMobile,
    allowBattery: allowBattery
  }, function() {
    console.log('Settings saved');
    addLogEntry('Settings updated');
  });
}

// Update statistics from background
function updateStats() {
  chrome.runtime.sendMessage({action: 'getStats'}, function(response) {
    // Check for error
    if (chrome.runtime.lastError) {
      console.error('Error getting stats:', chrome.runtime.lastError);
      return;
    }
    
    if (response) {
      const bandwidthElement = document.getElementById('bandwidth-used');
      const contributionElement = document.getElementById('contribution-time');
      const earningsElement = document.getElementById('earnings');
      const currentProxyElement = document.getElementById('current-proxy');
      const proxyStatusElement = document.getElementById('proxy-status');
      
      // Update bandwidth display
      if (bandwidthElement) {
        bandwidthElement.textContent = response.bandwidthUsed + ' MB';
      }
        
      // Update contribution time
      if (contributionElement) {
        contributionElement.textContent = response.contributionMinutes + ' min';
      }
        
      // Update earnings (example calculation)
      const earnings = (response.bandwidthUsed * 0.001).toFixed(2); // $0.001 per MB
      if (earningsElement) {
        earningsElement.textContent = '$' + earnings;
      }
        
      // Update proxy status if available
      if (response.currentIP) {
        if (currentProxyElement) {
          currentProxyElement.textContent = response.currentIP;
        }
        if (proxyStatusElement) {
          proxyStatusElement.textContent = response.active ? 'Active' : 'Inactive';
        }
      }
    }
  });
}

// Add an entry to the activity log
function addLogEntry(message) {
  const logContainer = document.getElementById('activity-log');
  if (!logContainer) return;
  
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `${time}: ${message}`;
  
  // Add to top of log
  logContainer.insertBefore(entry, logContainer.firstChild);
  
  // Limit log size
  const maxEntries = 50;
  while (logContainer.children.length > maxEntries) {
    logContainer.removeChild(logContainer.lastChild);
  }
} 