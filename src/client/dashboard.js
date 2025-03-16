/**
 * User Dashboard for monitoring and controlling proxy sharing
 * AI-generated code for the Residential Proxy Project
 */

class ProxyDashboard {
  constructor(selector, sdk) {
    this.container = document.querySelector(selector);
    this.sdk = sdk;
    this.elements = {};
    
    if (!this.container) {
      throw new Error(`Container element "${selector}" not found`);
    }
    
    if (!this.sdk) {
      throw new Error('ProxyClientSDK instance required');
    }
    
    this.render();
    this.attachEventListeners();
    this.startUpdating();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="proxy-dashboard">
        <div class="dashboard-header">
          <h2>Connection Sharing Status</h2>
          <div class="status-indicator ${this.sdk.state.isConnected ? 'active' : 'inactive'}">
            ${this.sdk.state.isConnected ? 'Active' : 'Inactive'}
          </div>
        </div>
        
        <div class="dashboard-stats">
          <div class="stat-box">
            <div class="stat-title">Bandwidth Used</div>
            <div class="stat-value" id="bandwidth-used">
              ${this.formatBandwidth(this.sdk.state.bandwidthUsed)}
            </div>
            <div class="stat-progress">
              <div class="progress-bar" style="width: ${(this.sdk.state.bandwidthUsed / this.sdk.options.maxBandwidthMB) * 100}%"></div>
            </div>
            <div class="stat-limit">Limit: ${this.formatBandwidth(this.sdk.options.maxBandwidthMB)}</div>
          </div>
          
          <div class="stat-box">
            <div class="stat-title">Connection Status</div>
            <div class="condition-item ${this.sdk.state.isWifi ? 'met' : 'unmet'}">
              <span class="icon">⚡</span> WiFi Connected
            </div>
            <div class="condition-item ${this.sdk.state.isCharging ? 'met' : 'unmet'}">
              <span class="icon">🔌</span> Device Charging
            </div>
            <div class="condition-item ${this.sdk.state.optedIn ? 'met' : 'unmet'}">
              <span class="icon">✓</span> Consent Given
            </div>
          </div>
        </div>
        
        <div class="dashboard-controls">
          <button id="toggle-sharing" class="btn ${this.sdk.state.isConnected ? 'btn-stop' : 'btn-start'}">
            ${this.sdk.state.isConnected ? 'Stop Sharing' : 'Start Sharing'}
          </button>
          <button id="show-consent" class="btn btn-secondary">
            View Consent Settings
          </button>
          <button id="opt-out" class="btn btn-danger">
            Opt Out Completely
          </button>
        </div>
        
        <div class="dashboard-footer">
          <div class="last-updated">
            Last updated: ${this.sdk.state.lastActive ? new Date(this.sdk.state.lastActive).toLocaleString() : 'Never'}
          </div>
        </div>
      </div>
    `;
    
    this.elements = {
      statusIndicator: this.container.querySelector('.status-indicator'),
      bandwidthUsed: this.container.querySelector('#bandwidth-used'),
      progressBar: this.container.querySelector('.progress-bar'),
      toggleButton: this.container.querySelector('#toggle-sharing'),
      consentButton: this.container.querySelector('#show-consent'),
      optOutButton: this.container.querySelector('#opt-out'),
      lastUpdated: this.container.querySelector('.last-updated'),
      wifiStatus: this.container.querySelector('.condition-item:nth-child(1)'),
      chargingStatus: this.container.querySelector('.condition-item:nth-child(2)'),
      consentStatus: this.container.querySelector('.condition-item:nth-child(3)')
    };
  }
  
  attachEventListeners() {
    // Toggle sharing button
    this.elements.toggleButton.addEventListener('click', async () => {
      if (this.sdk.state.isConnected) {
        await this.sdk.stopSharing();
      } else {
        if (!this.sdk.state.optedIn) {
          this.showConsentDialog();
          return;
        }
        await this.sdk.startSharing();
      }
      this.update();
    });
    
    // Consent settings button
    this.elements.consentButton.addEventListener('click', () => {
      this.showConsentDialog();
    });
    
    // Opt out button
    this.elements.optOutButton.addEventListener('click', async () => {
      if (confirm('Are you sure you want to opt out completely? This will disable connection sharing.')) {
        await this.sdk.optOut();
        this.update();
      }
    });
    
    // Listen to SDK events
    this.sdk.on('sharing-started', () => this.update());
    this.sdk.on('sharing-stopped', () => this.update());
    this.sdk.on('consent-changed', () => this.update());
    this.sdk.on('bandwidth-update', () => this.update());
  }
  
  showConsentDialog() {
    // Create a modal dialog for the consent form
    const modal = document.createElement('div');
    modal.className = 'consent-modal';
    modal.innerHTML = `
      <div class="consent-modal-content">
        <span class="close-button">&times;</span>
        <iframe src="consent-form.html" width="100%" height="600px" frameborder="0"></iframe>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle close button
    const closeButton = modal.querySelector('.close-button');
    closeButton.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    // Handle messages from iframe
    window.addEventListener('message', async (event) => {
      if (event.data.type === 'consent-response') {
        document.body.removeChild(modal);
        
        if (event.data.consented) {
          await this.sdk.requestUserConsent({ consented: true });
          if (this.sdk.checkDeviceConditions()) {
            await this.sdk.startSharing();
          }
        } else {
          await this.sdk.requestUserConsent({ consented: false });
        }
        
        this.update();
      }
    });
  }
  
  update() {
    // Update status indicator
    this.elements.statusIndicator.className = `status-indicator ${this.sdk.state.isConnected ? 'active' : 'inactive'}`;
    this.elements.statusIndicator.textContent = this.sdk.state.isConnected ? 'Active' : 'Inactive';
    
    // Update bandwidth display
    this.elements.bandwidthUsed.textContent = this.formatBandwidth(this.sdk.state.bandwidthUsed);
    this.elements.progressBar.style.width = `${(this.sdk.state.bandwidthUsed / this.sdk.options.maxBandwidthMB) * 100}%`;
    
    // Update connection status indicators
    this.elements.wifiStatus.className = `condition-item ${this.sdk.state.isWifi ? 'met' : 'unmet'}`;
    this.elements.chargingStatus.className = `condition-item ${this.sdk.state.isCharging ? 'met' : 'unmet'}`;
    this.elements.consentStatus.className = `condition-item ${this.sdk.state.optedIn ? 'met' : 'unmet'}`;
    
    // Update button states
    this.elements.toggleButton.className = `btn ${this.sdk.state.isConnected ? 'btn-stop' : 'btn-start'}`;
    this.elements.toggleButton.textContent = this.sdk.state.isConnected ? 'Stop Sharing' : 'Start Sharing';
    
    // Update last active timestamp
    this.elements.lastUpdated.textContent = `Last updated: ${new Date().toLocaleString()}`;
  }
  
  startUpdating() {
    // Update the dashboard every 5 seconds
    setInterval(() => this.update(), 5000);
  }
  
  formatBandwidth(megabytes) {
    if (megabytes < 1) {
      return `${Math.round(megabytes * 1024)} KB`;
    } else {
      return `${megabytes.toFixed(2)} MB`;
    }
  }
}

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProxyDashboard;
} else {
  window.ProxyDashboard = ProxyDashboard;
}

// Ensure form validation is testable
export function validateServerForm(formData) {
  const errors = {};
  
  if (!formData.name || formData.name.trim() === '') {
    errors.name = 'Server name is required';
  }
  
  if (!formData.url || formData.url.trim() === '') {
    errors.url = 'URL is required';
  } else if (!isValidUrl(formData.url)) {
    errors.url = 'Please enter a valid URL';
  }
  
  if (!formData.type) {
    errors.type = 'Server type must be selected';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Add URL validation helper (exported for testing)
export function isValidUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch (e) {
    return false;
  }
}

// Provide feedback for server addition
export function handleServerAddition(serverData) {
  // Validation before submission
  const validation = validateServerForm(serverData);
  
  if (!validation.isValid) {
    return {
      success: false,
      message: 'Validation failed',
      errors: validation.errors
    };
  }
  
  // Process server addition logic here
  
  return {
    success: true,
    message: `Server "${serverData.name}" added successfully`
  };
} 