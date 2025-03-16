/**
 * Proxy Network Client Application
 * Frontend logic for the proxy network management UI
 * 
 * AI-generated code for the Residential Proxy Project
 */

// Use IIFE to avoid global scope pollution
(function() {
  // Dashboard state
  const state = {
    servers: [],
    sessions: [],
    stats: {},
    selectedServer: null
  };

  // DOM elements
  const elements = {
    serverList: document.getElementById('server-list'),
    serverForm: document.getElementById('server-form'),
    sessionsList: document.getElementById('sessions-list'),
    statsDisplay: document.getElementById('stats-display'),
    alerts: document.getElementById('alerts')
  };

  // Initialize the application
  function init() {
    // Load initial data
    fetchServers();
    fetchSessions();
    fetchStats();

    // Set up event listeners
    setupEventListeners();
    
    // Set up refresh interval
    setInterval(() => {
      fetchSessions();
      fetchStats();
    }, 30000); // Refresh every 30 seconds
  }

  // Set up UI event listeners
  function setupEventListeners() {
    // Add server form submission
    if (elements.serverForm) {
      elements.serverForm.addEventListener('submit', handleServerFormSubmit);
    }
    
    // Global click handler for dynamic elements
    document.addEventListener('click', handleDocumentClick);
  }

  // Handle document click events (for dynamically created elements)
  function handleDocumentClick(event) {
    // Handle delete server buttons
    if (event.target.classList.contains('delete-server-btn')) {
      const serverId = event.target.dataset.serverId;
      if (serverId) {
        deleteServer(serverId);
      }
    }
    
    // Handle connect server buttons
    if (event.target.classList.contains('connect-server-btn')) {
      const serverId = event.target.dataset.serverId;
      if (serverId) {
        connectToServer(serverId);
      }
    }
    
    // Handle close session buttons
    if (event.target.classList.contains('close-session-btn')) {
      const sessionId = event.target.dataset.sessionId;
      if (sessionId) {
        closeSession(sessionId);
      }
    }
  }

  // Handle server form submission
  function handleServerFormSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(elements.serverForm);
    const serverData = {
      name: formData.get('server-name'),
      url: formData.get('server-url'),
      type: formData.get('server-type')
    };
    
    // Validate form data
    const validation = validateServerForm(serverData);
    
    if (!validation.isValid) {
      showAlert('error', 'Validation Error', Object.values(validation.errors).join('<br>'));
      return;
    }
    
    // Add the server
    addServer(serverData);
  }

  // Validate server form data
  function validateServerForm(formData) {
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

  // Check if URL is valid
  function isValidUrl(url) {
    try {
      const parsedUrl = new URL(url);
      return ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch (e) {
      return false;
    }
  }

  // API Functions
  
  // Fetch servers list
  function fetchServers() {
    fetch('/api/servers')
      .then(response => response.json())
      .then(data => {
        state.servers = data;
        renderServerList();
      })
      .catch(error => {
        console.error('Error fetching servers:', error);
        showAlert('error', 'Error', 'Failed to load servers');
      });
  }
  
  // Fetch active sessions
  function fetchSessions() {
    fetch('/api/proxy/sessions')
      .then(response => response.json())
      .then(data => {
        state.sessions = data.sessions;
        renderSessionsList();
      })
      .catch(error => {
        console.error('Error fetching sessions:', error);
      });
  }
  
  // Fetch proxy statistics
  function fetchStats() {
    fetch('/api/proxy/stats')
      .then(response => response.json())
      .then(data => {
        state.stats = data;
        renderStats();
      })
      .catch(error => {
        console.error('Error fetching stats:', error);
      });
  }
  
  // Add a new server
  function addServer(serverData) {
    fetch('/api/servers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(serverData)
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        showAlert('success', 'Success', `Server "${serverData.name}" added successfully`);
        elements.serverForm.reset();
        fetchServers();
      } else {
        showAlert('error', 'Error', data.message || 'Failed to add server');
      }
    })
    .catch(error => {
      console.error('Error adding server:', error);
      showAlert('error', 'Error', 'Failed to add server');
    });
  }
  
  // Delete a server
  function deleteServer(serverId) {
    if (!confirm('Are you sure you want to delete this server?')) {
      return;
    }
    
    fetch(`/api/servers/${serverId}`, {
      method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        showAlert('success', 'Success', 'Server deleted successfully');
        fetchServers();
      } else {
        showAlert('error', 'Error', data.message || 'Failed to delete server');
      }
    })
    .catch(error => {
      console.error('Error deleting server:', error);
      showAlert('error', 'Error', 'Failed to delete server');
    });
  }
  
  // Connect to a server
  function connectToServer(serverId) {
    fetch(`/api/servers/${serverId}/connect`, {
      method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        showAlert('success', 'Success', `Connected to server successfully`);
        fetchServers();
      } else {
        showAlert('error', 'Error', data.message || 'Failed to connect to server');
      }
    })
    .catch(error => {
      console.error('Error connecting to server:', error);
      showAlert('error', 'Error', 'Failed to connect to server');
    });
  }
  
  // Close a session
  function closeSession(sessionId) {
    fetch(`/api/proxy/sessions/${sessionId}`, {
      method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        showAlert('success', 'Success', 'Session closed successfully');
        fetchSessions();
      } else {
        showAlert('error', 'Error', data.message || 'Failed to close session');
      }
    })
    .catch(error => {
      console.error('Error closing session:', error);
      showAlert('error', 'Error', 'Failed to close session');
    });
  }

  // UI Rendering Functions
  
  // Render server list
  function renderServerList() {
    if (!elements.serverList) return;
    
    const html = state.servers.map(server => `
      <div class="server-item card mb-3">
        <div class="card-body">
          <h5 class="card-title">${server.name} <span class="badge ${server.status === 'connected' ? 'bg-success' : 'bg-warning'}">${server.status}</span></h5>
          <h6 class="card-subtitle mb-2 text-muted">${server.type}</h6>
          <p class="card-text">${server.url}</p>
          <div class="btn-group">
            <button class="btn btn-sm btn-primary connect-server-btn" data-server-id="${server.id}">Connect</button>
            <button class="btn btn-sm btn-danger delete-server-btn" data-server-id="${server.id}">Delete</button>
          </div>
        </div>
      </div>
    `).join('');
    
    elements.serverList.innerHTML = html || '<p>No servers added yet.</p>';
  }
  
  // Render sessions list
  function renderSessionsList() {
    if (!elements.sessionsList) return;
    
    const html = state.sessions.map(session => `
      <div class="session-item card mb-2">
        <div class="card-body">
          <h6 class="card-title">Session ID: ${session.sessionId}</h6>
          <p class="card-text">
            Created: ${new Date(session.created).toLocaleString()}<br>
            Last Activity: ${new Date(session.lastActivity).toLocaleString()}<br>
            URL: ${session.url}
          </p>
          <button class="btn btn-sm btn-danger close-session-btn" data-session-id="${session.sessionId}">Close Session</button>
        </div>
      </div>
    `).join('');
    
    elements.sessionsList.innerHTML = html || '<p>No active sessions.</p>';
  }
  
  // Render proxy statistics
  function renderStats() {
    if (!elements.statsDisplay) return;
    
    const stats = state.stats;
    
    const html = `
      <div class="card">
        <div class="card-body">
          <h5 class="card-title">Proxy Statistics</h5>
          <ul class="list-group">
            <li class="list-group-item">Active Sessions: ${stats.activeSessions || 0}</li>
            <li class="list-group-item">Proxy Pool Size: ${stats.poolSize || 0}</li>
            <li class="list-group-item">Total Bandwidth: ${formatBandwidth(stats.bandwidth?.total || 0)}</li>
            <li class="list-group-item">Today's Bandwidth: ${formatBandwidth(stats.bandwidth?.today || 0)}</li>
          </ul>
        </div>
      </div>
    `;
    
    elements.statsDisplay.innerHTML = html;
  }
  
  // Format bandwidth for display
  function formatBandwidth(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }
  
  // Show an alert message
  function showAlert(type, title, message) {
    if (!elements.alerts) return;
    
    const alertId = 'alert-' + Date.now();
    const alertHtml = `
      <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
        <strong>${title}:</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
    
    elements.alerts.innerHTML += alertHtml;
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      const alertElement = document.getElementById(alertId);
      if (alertElement) {
        alertElement.remove();
      }
    }, 5000);
  }

  // Initialize when the DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Expose functions for testing
  window.proxyApp = {
    validateServerForm,
    isValidUrl
  };
})(); 