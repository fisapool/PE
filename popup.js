/**
 * Popup script for ProxyEthica extension
 */

// DOM Elements
const consentScreen = document.getElementById('consent-screen');
const mainScreen = document.getElementById('main-screen');

const optInBtn = document.getElementById('opt-in-btn');
const learnMoreBtn = document.getElementById('learn-more-btn');
const toggleProxyBtn = document.getElementById('toggle-proxy');
const optOutBtn = document.getElementById('opt-out-btn');

const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const bandwidthUsed = document.getElementById('bandwidth-used');
const contributionTime = document.getElementById('contribution-time');

const maxBandwidthSelect = document.getElementById('max-bandwidth');
const mobileDataCheckbox = document.getElementById('mobile-data');
const batteryModeCheckbox = document.getElementById('battery-mode');

const loginSection = document.getElementById('login-section');
const accountSection = document.getElementById('account-section');
const proxySection = document.getElementById('proxy-section');

const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');

const accountEmail = document.getElementById('account-email');
const accountCredits = document.getElementById('account-credits');

const currentProxy = document.getElementById('current-proxy');
const proxyStatus = document.getElementById('proxy-status');
const getProxyBtn = document.getElementById('get-proxy-btn');
const rotateProxyBtn = document.getElementById('rotate-proxy-btn');
const clearProxyBtn = document.getElementById('clear-proxy-btn');
const countrySelect = document.getElementById('country-select');
const autoRotateSelect = document.getElementById('auto-rotate');

// State
let appState = {
  hasConsented: false,
  isConnected: false,
  settings: {
    maxBandwidth: 500,
    allowMobileData: false,
    allowOnBattery: false
  },
  account: {
    isLoggedIn: false,
    email: '',
    credits: 0
  },
  proxy: {
    isActive: false,
    current: null,
    autoRotate: 0
  }
};

// Initialize popup
async function initPopup() {
  try {
    console.log("Initializing popup...");
    
    // Load stored consent and settings
    const storage = await chrome.storage.local.get(['proxyConsent', 'proxySettings']);
    console.log("Loaded storage:", storage);
    
    appState.hasConsented = !!storage.proxyConsent;
    
    if (storage.proxySettings) {
      appState.settings = storage.proxySettings;
    }
    
    // Get current proxy status
    const status = await sendMessage({ action: 'getStatus' });
    console.log("Status from background:", status);
    
    appState.isConnected = status.isContributing;
    
    if (status.connectionStats && status.connectionStats.bandwidthUsed) {
      bandwidthUsed.textContent = formatBytes(status.connectionStats.bandwidthUsed);
    }
    
    if (status.connectionStats && status.connectionStats.startTime) {
      const startTimeMs = Number(status.connectionStats.startTime);
      const currentTimeMs = Date.now();
      const elapsedMs = currentTimeMs - startTimeMs;
      
      const minutes = Math.floor(elapsedMs / 60000);
      const seconds = Math.floor((elapsedMs % 60000) / 1000);
      
      if (minutes < 1) {
        contributionTime.textContent = `${seconds} sec`;
      } else {
        contributionTime.textContent = `${minutes} min`;
      }
      
      console.log('Time calculation:', {
        startTime: new Date(startTimeMs).toISOString(),
        currentTime: new Date(currentTimeMs).toISOString(),
        elapsedMs,
        minutes,
        seconds
      });
    }
    
    // Check login status
    const loginStatus = await sendMessage({ action: 'checkLoginStatus' });
    if (loginStatus.success && loginStatus.isLoggedIn) {
      appState.account.isLoggedIn = true;
      appState.account.email = loginStatus.email;
      appState.account.credits = loginStatus.credits;
      
      // Update UI to show logged in state
      updateLoginUI();
    }
    
    // Update UI based on state
    updateUI();
    
    // Initialize settings inputs
    maxBandwidthSelect.value = appState.settings.maxBandwidth;
    mobileDataCheckbox.checked = appState.settings.allowMobileData;
    batteryModeCheckbox.checked = appState.settings.allowOnBattery;
    
    // Setup event listeners
    setupEventListeners();
    
    // Start polling for updates if connected
    if (appState.isConnected) {
      startStatusUpdates();
    }
  } catch (error) {
    console.error('Failed to initialize popup:', error);
  }
}

// Update UI based on current state
function updateUI() {
  console.log("Updating UI, state:", appState);
  
  // Show appropriate screen
  if (appState.hasConsented) {
    consentScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');
  } else {
    consentScreen.classList.remove('hidden');
    mainScreen.classList.add('hidden');
  }
  
  // Update status indicators
  if (appState.isConnected) {
    statusDot.classList.add('connected');
    statusText.textContent = 'Connected';
    toggleProxyBtn.textContent = 'Stop Contributing';
  } else {
    statusDot.classList.remove('connected');
    statusText.textContent = 'Disconnected';
    toggleProxyBtn.textContent = 'Start Contributing';
  }
}

// Set up event listeners
function setupEventListeners() {
  // Opt-in button
  optInBtn.addEventListener('click', async () => {
    try {
      await sendMessage({ 
        action: 'updateConsent', 
        consent: true 
      });
      
      appState.hasConsented = true;
      updateUI();
    } catch (error) {
      console.error('Failed to opt in:', error);
    }
  });
  
  // Learn more button
  learnMoreBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://proxyethica.com/learn-more' });
  });
  
  // Toggle proxy button
  toggleProxyBtn.addEventListener('click', async () => {
    try {
      if (appState.isConnected) {
        // Currently connected, so stop proxy
        await sendMessage({ action: 'stopProxy' });
        appState.isConnected = false;
        
        // Stop status updates
        stopStatusUpdates();
      } else {
        // Currently disconnected, so start proxy
        await sendMessage({ action: 'startProxy' });
        appState.isConnected = true;
        
        // Start status updates
        startStatusUpdates();
      }
      
      updateUI();
    } catch (error) {
      console.error('Failed to toggle proxy:', error);
    }
  });
  
  // Opt out button
  optOutBtn.addEventListener('click', async () => {
    try {
      // If currently connected, stop first
      if (appState.isConnected) {
        await sendMessage({ action: 'stopProxy' });
        appState.isConnected = false;
        stopStatusUpdates();
      }
      
      await sendMessage({ 
        action: 'updateConsent', 
        consent: false 
      });
      
      appState.hasConsented = false;
      updateUI();
    } catch (error) {
      console.error('Failed to opt out:', error);
    }
  });
  
  // Settings changes
  maxBandwidthSelect.addEventListener('change', saveSettings);
  mobileDataCheckbox.addEventListener('change', saveSettings);
  batteryModeCheckbox.addEventListener('change', saveSettings);

  // Login button
  loginBtn.addEventListener('click', async () => {
    try {
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      
      if (!email || !password) {
        alert("Please enter both email and password");
        return;
      }
      
      const result = await loginUser(email, password);
      
      if (result) {
        appState.account.isLoggedIn = true;
        appState.account.email = email;
        
        // Update credits
        const creditsResult = await sendMessage({ action: 'getCredits' });
        if (creditsResult.success) {
          appState.account.credits = creditsResult.credits;
        }
        
        updateLoginUI();
      }
    } catch (error) {
      console.error('Login error:', error);
      alert("Login error: " + error.message);
    }
  });

  // Signup button - open the proxyethica.html page with signup parameter
  signupBtn.addEventListener('click', () => {
    // Use query parameters instead of path segments for extension URLs
    chrome.tabs.create({ url: 'proxyethica.html?action=signup' });
  });

  // Logout button
  logoutBtn.addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: 'logout' }, function(response) {
      if (response.success) {
        // Update UI to show logged out state
        showLoginScreen();
        displayMessage('success', 'Successfully logged out');
      } else {
        displayMessage('error', `Logout failed: ${response.message}`);
      }
    });
  });

  // Get proxy button
  getProxyBtn.addEventListener('click', async () => {
    try {
      if (!appState.account.isLoggedIn) {
        alert("Please login first");
        return;
      }
      
      const country = countrySelect.value;
      const session = true; // Always use session for better experience
      
      const result = await sendMessage({
        action: 'getProxy',
        country,
        session
      });
      
      if (result.success) {
        // Apply the proxy
        const applyResult = await sendMessage({
          action: 'applyProxy',
          proxy: result.proxy
        });
        
        if (applyResult.success) {
          appState.proxy.isActive = true;
          appState.proxy.current = result.proxy;
          
          // Update credits if provided
          if (result.remainingCredits !== undefined) {
            appState.account.credits = result.remainingCredits;
          }
          
          updateProxyUI();
          updateLoginUI();
        } else {
          alert("Failed to apply proxy: " + applyResult.message);
        }
      } else {
        alert("Failed to get proxy: " + result.message);
      }
    } catch (error) {
      console.error('Get proxy error:', error);
      alert("Error getting proxy: " + error.message);
    }
  });

  // Rotate proxy button
  rotateProxyBtn.addEventListener('click', async () => {
    try {
      if (!appState.proxy.isActive) {
        alert("No active proxy to rotate");
        return;
      }
      
      const result = await sendMessage({ action: 'rotateProxy' });
      
      if (result.success) {
        appState.proxy.current = result.proxy;
        
        // Update credits if provided
        if (result.remainingCredits !== undefined) {
          appState.account.credits = result.remainingCredits;
        }
        
        updateProxyUI();
        updateLoginUI();
      } else {
        alert("Failed to rotate proxy: " + result.message);
      }
    } catch (error) {
      console.error('Rotation error:', error);
      alert("Error rotating proxy: " + error.message);
    }
  });

  // Clear proxy button
  clearProxyBtn.addEventListener('click', async () => {
    try {
      if (!appState.proxy.isActive) {
        return;
      }
      
      const result = await sendMessage({ action: 'clearProxy' });
      
      if (result.success) {
        appState.proxy.isActive = false;
        appState.proxy.current = null;
        
        // Stop auto-rotation if active
        await sendMessage({ action: 'stopAutoRotation' });
        
        updateProxyUI();
      } else {
        alert("Failed to clear proxy: " + result.message);
      }
    } catch (error) {
      console.error('Clear proxy error:', error);
    }
  });

  // Auto-rotate select
  autoRotateSelect.addEventListener('change', async () => {
    try {
      const value = parseInt(autoRotateSelect.value);
      
      if (value > 0 && appState.proxy.isActive) {
        await sendMessage({ 
          action: 'startAutoRotation', 
          intervalMinutes: value 
        });
      } else {
        await sendMessage({ action: 'stopAutoRotation' });
      }
      
      appState.proxy.autoRotate = value;
    } catch (error) {
      console.error('Auto-rotate setting error:', error);
    }
  });
}

// Status update polling
let statusInterval = null;

function startStatusUpdates() {
  // Poll every 2 seconds for updates
  statusInterval = setInterval(async () => {
    try {
      const status = await sendMessage({ action: 'getStatus' });
      
      if (status.connectionStats) {
        bandwidthUsed.textContent = formatBytes(status.connectionStats.bandwidthUsed);
        
        if (status.connectionStats.startTime) {
          const startTimeMs = Number(status.connectionStats.startTime);
          const currentTimeMs = Date.now();
          const elapsedMs = currentTimeMs - startTimeMs;
          
          const minutes = Math.floor(elapsedMs / 60000);
          const seconds = Math.floor((elapsedMs % 60000) / 1000);
          
          if (minutes < 1) {
            contributionTime.textContent = `${seconds} sec`;
          } else {
            contributionTime.textContent = `${minutes} min`;
          }
          
          console.log('Time calculation:', {
            startTime: new Date(startTimeMs).toISOString(),
            currentTime: new Date(currentTimeMs).toISOString(),
            elapsedMs,
            minutes,
            seconds
          });
        }
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  }, 2000);
}

function stopStatusUpdates() {
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
}

// Save settings
async function saveSettings() {
  try {
    const settings = {
      maxBandwidth: parseInt(maxBandwidthSelect.value),
      allowMobileData: mobileDataCheckbox.checked,
      allowOnBattery: batteryModeCheckbox.checked
    };
    
    appState.settings = settings;
    
    await sendMessage({
      action: 'saveSettings',
      settings
    });
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

// Helper function to format bytes
function formatBytes(bytes) {
  if (bytes < 1024) {
    return bytes + ' B';
  } else if (bytes < 1048576) {
    return (bytes / 1024).toFixed(2) + ' KB';
  } else {
    return (bytes / 1048576).toFixed(2) + ' MB';
  }
}

// Helper function to send messages to background script
async function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

// Clean up when popup closes
window.addEventListener('unload', () => {
  if (statusInterval) {
    clearInterval(statusInterval);
  }
});

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', initPopup);

function updateLoginUI() {
  if (appState.account.isLoggedIn) {
    loginSection.classList.add('hidden');
    accountSection.classList.remove('hidden');
    proxySection.classList.remove('hidden');
    
    accountEmail.textContent = appState.account.email;
    accountCredits.textContent = appState.account.credits;
  } else {
    loginSection.classList.remove('hidden');
    accountSection.classList.add('hidden');
    proxySection.classList.add('hidden');
  }
}

function updateProxyUI() {
  if (appState.proxy.isActive && appState.proxy.current) {
    currentProxy.textContent = `${appState.proxy.current.host}:${appState.proxy.current.port}`;
    proxyStatus.textContent = 'Active';
    proxyStatus.style.color = 'var(--secondary)';
  } else {
    currentProxy.textContent = 'None';
    proxyStatus.textContent = 'Inactive';
    proxyStatus.style.color = 'var(--text-light)';
  }
  
  // Set auto-rotate select to current value
  autoRotateSelect.value = appState.proxy.autoRotate;
}

// Function to update UI for logged out state
function showLoginScreen() {
  // Hide account section
  document.getElementById('account-section').classList.add('hidden');
  
  // Show login section
  document.getElementById('login-section').classList.remove('hidden');
  
  // Update any other UI elements
  updateStatusUI(false);
}

function updateStatusUI(isConnected) {
  if (isConnected) {
    statusDot.classList.add('connected');
    statusText.textContent = 'Connected';
    toggleProxyBtn.textContent = 'Stop Contributing';
  } else {
    statusDot.classList.remove('connected');
    statusText.textContent = 'Disconnected';
    toggleProxyBtn.textContent = 'Start Contributing';
  }
}

// Fix login function with proper error handling
async function loginUser(email, password) {
  try {
    console.log("Attempting login with:", email);
    
    // Send message to background script
    const response = await chrome.runtime.sendMessage({
      action: 'login',
      email: email,
      password: password
    });
    
    console.log("Login response:", response);
    
    if (response.success) {
      // Handle successful login
      document.getElementById('login-error').textContent = '';
      updateUIForLoggedInUser(response);
      return true;
    } else {
      // Show error message
      const errorElem = document.getElementById('login-error');
      if (errorElem) {
        errorElem.textContent = response.message || "Login failed";
      }
      console.error("Login failed:", response.message);
      return false;
    }
  } catch (error) {
    console.error("Login error:", error);
    document.getElementById('login-error').textContent = 
      'Connection error. Please try again.';
    return false;
  }
}

// AI-generated code for ProxyEthica Network popup
// This file handles the popup UI interactions

document.addEventListener('DOMContentLoaded', () => {
    // UI elements
    const statusIndicator = document.getElementById('proxyStatus');
    const statusText = document.getElementById('statusText');
    const toggleButton = document.getElementById('toggleProxy');
    const dashboardButton = document.getElementById('openDashboard');
    const serverListElement = document.getElementById('serverList');
    
    // Get current proxy state
    chrome.runtime.sendMessage({ action: "getProxyState" }, (response) => {
        updateUI(response);
    });
    
    // Toggle proxy connection
    toggleButton.addEventListener('click', () => {
        chrome.runtime.sendMessage(
            { 
                action: toggleButton.textContent === "Connect Proxy" ? "enableProxy" : "disableProxy",
                server: selectedServer 
            }, 
            (response) => {
                if (response.success) {
                    // UI will be updated via the message listener
                } else {
                    alert("Failed to change proxy state");
                }
            }
        );
    });
    
    // Open dashboard
    dashboardButton.addEventListener('click', () => {
        chrome.tabs.create({ url: "dashboard.html" });
    });
    
    // Listen for proxy state changes
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "proxyStateChanged") {
            updateUI({
                enabled: message.enabled,
                currentServer: message.server,
                servers: serverList
            });
        } else if (message.action === "proxyError") {
            alert(`Proxy error: ${message.error}`);
            updateUI({ enabled: false });
        }
    });
    
    // Track server list and selected server
    let serverList = [];
    let selectedServer = null;
    
    // Update UI based on proxy state
    function updateUI(state) {
        if (state.enabled) {
            statusIndicator.classList.add('active');
            statusText.textContent = `Connected to ${state.currentServer?.name || 'unknown'}`;
            toggleButton.textContent = "Disconnect Proxy";
        } else {
            statusIndicator.classList.remove('active');
            statusText.textContent = "Proxy Disconnected";
            toggleButton.textContent = "Connect Proxy";
        }
        
        // Update server list
        serverList = state.servers || [];
        selectedServer = state.currentServer;
        
        if (serverList.length === 0) {
            serverListElement.innerHTML = "<p>No servers configured</p>";
        } else {
            serverListElement.innerHTML = "";
            serverList.forEach(server => {
                const serverElement = document.createElement('div');
                serverElement.className = 'server-item';
                serverElement.innerHTML = `
                    <input type="radio" name="server" id="server-${server.id}" 
                           ${server.id === selectedServer?.id ? 'checked' : ''}>
                    <label for="server-${server.id}">${server.name} (${server.type})</label>
                `;
                
                const radioButton = serverElement.querySelector('input');
                radioButton.addEventListener('change', () => {
                    selectedServer = server;
                });
                
                serverListElement.appendChild(serverElement);
            });
        }
    }
}); 