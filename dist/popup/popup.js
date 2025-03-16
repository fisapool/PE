// Utility function for debugging
function logDebug(message) {
  console.log(message);
  const debugLog = document.getElementById('debug-log');
  if (debugLog) {
    const time = new Date().toLocaleTimeString();
    debugLog.innerHTML += `<div>${time}: ${message}</div>`;
  }
}

// Handle opt-in action
function handleOptIn() {
  console.log('Opt In clicked');
  
  // Save opt-in preference
  chrome.storage.local.set({optedIn: true}, function() {
    console.log('User opted in');
    
    // Open the dashboard
    chrome.tabs.create({url: 'login.html'});
  });
}

// Initialize dashboard UI and data
function initDashboard() {
  const toggleProxyBtn = document.getElementById('toggle-proxy-btn');
  const getProxyBtn = document.getElementById('get-proxy-btn');
  const rotateProxyBtn = document.getElementById('rotate-proxy-btn');
  const disableProxyBtn = document.getElementById('disable-proxy-btn');
  const optOutBtn = document.getElementById('opt-out-btn');
  
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
            return;
          }

          console.log('Proxy service started:', response);
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
            return;
          }

          console.log('Proxy service stopped:', response);
        });
      }
    });
  }
  
  // Get Proxy button
  if (getProxyBtn) {
    getProxyBtn.addEventListener('click', function() {
      chrome.runtime.sendMessage({action: 'getProxy'}, function(response) {
        if (response && response.ip) {
          document.getElementById('current-proxy').textContent = response.ip;
          document.getElementById('proxy-status').textContent = 'Active';
        }
      });
    });
  }
  
  // Rotate Proxy button
  if (rotateProxyBtn) {
    rotateProxyBtn.addEventListener('click', function() {
      chrome.runtime.sendMessage({action: 'rotateProxy'}, function(response) {
        if (response && response.ip) {
          document.getElementById('current-proxy').textContent = response.ip;
        }
      });
    });
  }
  
  // Disable Proxy button
  if (disableProxyBtn) {
    disableProxyBtn.addEventListener('click', function() {
      chrome.runtime.sendMessage({action: 'disableProxy'}, function(response) {
        document.getElementById('current-proxy').textContent = 'None';
        document.getElementById('proxy-status').textContent = 'Inactive';
      });
    });
  }
  
  // Opt Out button
  if (optOutBtn) {
    optOutBtn.addEventListener('click', function() {
      chrome.storage.local.set({optedIn: false}, function() {
        console.log('User opted out');
        const dashboardScreen = document.getElementById('dashboard-screen');
        const consentScreen = document.getElementById('consent-screen');
        
        if (dashboardScreen && consentScreen) {
          dashboardScreen.classList.add('hidden');
          consentScreen.classList.remove('hidden');
        }
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
  
  // Start periodic stats updates
  updateStats();
  setInterval(updateStats, 5000); // Update every 5 seconds
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
  });
}

// Initialize extension
document.addEventListener('DOMContentLoaded', function() {
  console.log('ProxyEthica extension loaded');
  
  // Check if user has already opted in
  chrome.storage.local.get(['optedIn'], function(result) {
    if (result.optedIn) {
      // User already opted in, update UI
      document.getElementById('opt-in-btn').textContent = 'Open Dashboard';
      document.getElementById('learn-more-btn').classList.add('hidden');
      // Add Direct IP button
      const directIPBtn = document.createElement('button');
      directIPBtn.id = 'direct-ip-btn';
      directIPBtn.className = 'btn secondary';
      directIPBtn.textContent = 'Direct IP Settings';
      // Insert after opt-in button
      const optInBtn = document.getElementById('opt-in-btn');
      if (optInBtn && optInBtn.parentNode) {
        optInBtn.parentNode.insertBefore(directIPBtn, optInBtn.nextSibling);
      }
      
      // Add event listener for the Direct IP button
      directIPBtn.addEventListener('click', function() {
        document.getElementById('consent-screen').classList.add('hidden');
        document.getElementById('bypass-panel').classList.remove('hidden');
        loadBypassSites();
      });
    }
  });
  
  // Back button from bypass panel
  const backBtn = document.getElementById('back-to-main-btn');
  if (backBtn) {
    backBtn.addEventListener('click', function() {
      document.getElementById('bypass-panel').classList.add('hidden');
      document.getElementById('consent-screen').classList.remove('hidden');
    });
  }
  
  // Add site to bypass list
  const addBypassBtn = document.getElementById('add-bypass-btn');
  if (addBypassBtn) {
    addBypassBtn.addEventListener('click', function() {
      const siteInput = document.getElementById('bypass-site');
      if (!siteInput || !siteInput.value.trim()) return;
      
      const site = siteInput.value.trim().toLowerCase();
      
      // Simple validation
      if (!/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/.test(site)) {
        alert('Please enter a valid domain (e.g., example.com)');
        return;
      }
      
      // Add to storage
      chrome.storage.local.get(['bypassSites'], function(result) {
        const sites = result.bypassSites || [];
        if (sites.includes(site)) {
          alert('This site is already in your list.');
          return;
        }
        
        sites.push(site);
        chrome.storage.local.set({bypassSites: sites}, function() {
          siteInput.value = '';
          loadBypassSites();
        });
      });
    });
  }
  
  // Get UI elements
  const optInBtn = document.getElementById('opt-in-btn');
  const learnMoreBtn = document.getElementById('learn-more-btn');
  const debugTestBtn = document.getElementById('debug-test-btn');
  const goBackBtn = document.getElementById('go-back-btn');
  
  // Define function to load bypass sites
  function loadBypassSites() {
    const bypassList = document.getElementById('bypass-list');
    if (!bypassList) return;
    
    chrome.storage.local.get(['bypassSites'], function(result) {
      const sites = result.bypassSites || [];
      
      // Clear current list
      bypassList.innerHTML = '';
      
      if (sites.length === 0) {
        bypassList.innerHTML = '<div class="no-sites">No sites added yet.</div>';
        return;
      }
      
      // Add sites to the list
      sites.forEach(site => {
        const item = document.createElement('div');
        item.className = 'bypass-item';
        item.innerHTML = `
          <div>${site}</div>
          <button class="remove-site" data-site="${site}">Remove</button>
        `;
        bypassList.appendChild(item);
        
        // Add remove handler
        item.querySelector('.remove-site').addEventListener('click', function() {
          const siteToRemove = this.getAttribute('data-site');
          chrome.storage.local.get(['bypassSites'], function(result) {
            const updatedSites = (result.bypassSites || []).filter(s => s !== siteToRemove);
            chrome.storage.local.set({bypassSites: updatedSites}, function() {
              loadBypassSites();
            });
          });
        });
      });
    });
  }
  
  // Opt In button event
  if (optInBtn) {
    optInBtn.addEventListener('click', function() {
      chrome.storage.local.get(['optedIn'], function(result) {
        if (result.optedIn) {
          // Already opted in, just open dashboard
          chrome.tabs.create({url: 'about.html'});
        } else {
          // New user, run opt-in process
          handleOptIn();
        }
      });
    });
  } else {
    console.error('Opt In button not found');
  }
  
  // Learn More button event
  if (learnMoreBtn) {
    learnMoreBtn.addEventListener('click', function() {
      console.log('Learn More clicked');
      chrome.tabs.create({url: 'about.html'});
    });
  }
  
  console.log('Event listeners set up');
});

// Add additional event listeners as needed
window.addEventListener('load', function() {
  console.log('Window loaded');
  
  // Debug button to toggle dashboard visibility
  const debugToggleBtn = document.getElementById('debug-toggle-dashboard');
  if (debugToggleBtn) {
    debugToggleBtn.addEventListener('click', function() {
      const consentScreen = document.getElementById('consent-screen');
      const dashboardScreen = document.getElementById('dashboard-screen');
      const debugPanel = document.getElementById('debug-panel');
      
      if (consentScreen.classList.contains('hidden')) {
        consentScreen.classList.remove('hidden');
        dashboardScreen.classList.add('hidden');
        if (debugPanel) debugPanel.classList.add('hidden');
      } else {
        consentScreen.classList.add('hidden');
        dashboardScreen.classList.remove('hidden');
        if (debugPanel) debugPanel.classList.add('hidden');
      }
    });
  }
});

document.addEventListener('click', function(e) {
  if (e.target && e.target.id === 'opt-in-btn') {
    logDebug('Opt In clicked via global handler');
    handleOptIn();
  }
});

// Update statistics from background
function updateStats() {
  chrome.runtime.sendMessage({action: 'getStats'}, function(response) {
    // Check for error
    if (chrome.runtime.lastError) {
      console.error('Error getting stats:', chrome.runtime.lastError);
      return;
    }
    
    if (response) {
      // Update bandwidth display
      document.getElementById('bandwidth-used').textContent = 
        response.bandwidthUsed + ' MB';
        
      // Update contribution time
      document.getElementById('contribution-time').textContent = 
        response.contributionMinutes + ' min';
        
      // Update proxy status if available
      if (response.currentIP) {
        document.getElementById('current-proxy').textContent = response.currentIP;
        document.getElementById('proxy-status').textContent = 
          response.active ? 'Active' : 'Inactive';
      }
    }
  });
}

// Add this to the end of your popup.js file
function resetOptInStatus() {
  chrome.storage.local.set({optedIn: false}, function() {
    console.log('Opt-in status reset');
    window.location.reload();
  });
}

// Call this from browser console if needed 