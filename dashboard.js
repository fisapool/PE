// AI-generated code for ProxyEthica Network Dashboard
// This file handles the dashboard UI interactions

document.addEventListener('DOMContentLoaded', () => {
    // UI elements
    const proxyStatusIndicator = document.getElementById('proxyStatusIndicator');
    const proxyStatusText = document.getElementById('proxyStatusText');
    const toggleProxyBtn = document.getElementById('toggleProxyBtn');
    const serverList = document.getElementById('serverList');
    const noServersMessage = document.getElementById('no-servers-message');
    const addServerForm = document.getElementById('addServerForm');
    const settingsForm = document.getElementById('settingsForm');
    const advancedSettingsForm = document.getElementById('advancedSettingsForm');
    const restrictBandwidthOption = document.getElementById('restrictBandwidthOption');
    const bandwidthLimitGroup = document.getElementById('bandwidthLimitGroup');

    // Tab navigation
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    // State variables
    let proxyState = {
        enabled: false,
        currentServer: null,
        servers: [],
        settings: {
            autoConnect: 'never',
            bypassLocal: true,
            preventDnsLeak: true,
            retryAttempts: 3,
            timeout: 30,
            rotation: 0,
            restrictBandwidth: false,
            bandwidthLimit: 100
        }
    };

    // Initialize dashboard
    function init() {
        // Get current proxy state
        chrome.runtime.sendMessage({ action: "getProxyState" }, (response) => {
            if (response) {
                proxyState.enabled = response.enabled || false;
                proxyState.currentServer = response.currentServer || null;
                proxyState.servers = response.servers || [];
                updateUI();
            }
        });

        // Get settings
        chrome.storage.local.get(['proxySettings'], (result) => {
            if (result.proxySettings) {
                proxyState.settings = { ...proxyState.settings, ...result.proxySettings };
                updateSettingsUI();
            }
        });

        // Set up tabs
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab');
                
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update active content
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === `${tabId}-tab`) {
                        content.classList.add('active');
                    }
                });
            });
        });

        // Set up bandwidth restriction toggle
        restrictBandwidthOption.addEventListener('change', () => {
            bandwidthLimitGroup.style.display = restrictBandwidthOption.checked ? 'block' : 'none';
        });

        // Set up event listeners
        setupEventListeners();
    }

    // Update UI based on current state
    function updateUI() {
        // Update status indicators
        if (proxyState.enabled) {
            proxyStatusIndicator.classList.add('active');
            proxyStatusText.textContent = `Connected to ${proxyState.currentServer?.name || 'unknown'}`;
            toggleProxyBtn.textContent = 'Disconnect Proxy';
        } else {
            proxyStatusIndicator.classList.remove('active');
            proxyStatusText.textContent = 'Disconnected';
            toggleProxyBtn.textContent = 'Connect Proxy';
        }
        
        // Update server list
        updateServerList();
        
        // Update settings UI
        updateSettingsUI();
        
        // Update statistics
        updateStatistics();
    }

    // Update the server list UI
    function updateServerList() {
        if (proxyState.servers.length === 0) {
            noServersMessage.style.display = 'block';
            serverList.innerHTML = '';
            return;
        }
        
        noServersMessage.style.display = 'none';
        serverList.innerHTML = '';
        
        proxyState.servers.forEach(server => {
            const isActive = proxyState.currentServer && proxyState.currentServer.id === server.id;
            
            const serverItem = document.createElement('div');
            serverItem.className = `server-item ${isActive ? 'active' : ''}`;
            
            serverItem.innerHTML = `
                <div class="server-name">${server.name}</div>
                <div class="server-type">${server.type.toUpperCase()}</div>
                <div class="server-actions">
                    <button class="secondary connect-btn" data-id="${server.id}">Connect</button>
                    <button class="danger remove-btn" data-id="${server.id}">Remove</button>
                </div>
            `;
            
            // Add event listeners to buttons
            const connectBtn = serverItem.querySelector('.connect-btn');
            const removeBtn = serverItem.querySelector('.remove-btn');
            
            connectBtn.addEventListener('click', () => {
                connectToServer(server);
            });
            
            removeBtn.addEventListener('click', () => {
                removeServer(server.id);
            });
            
            serverList.appendChild(serverItem);
        });
    }

    // Update settings UI
    function updateSettingsUI() {
        const settings = proxyState.settings;
        
        // Main settings
        document.getElementById('autoConnectOption').value = settings.autoConnect;
        document.getElementById('bypassLocalOption').checked = settings.bypassLocal;
        document.getElementById('preventDnsLeakOption').checked = settings.preventDnsLeak;
        document.getElementById('retryAttemptsOption').value = settings.retryAttempts;
        
        // Advanced settings
        document.getElementById('timeoutOption').value = settings.timeout;
        document.getElementById('rotationOption').value = settings.rotation;
        document.getElementById('restrictBandwidthOption').checked = settings.restrictBandwidth;
        document.getElementById('bandwidthLimit').value = settings.bandwidthLimit;
        
        // Show/hide bandwidth limit option
        bandwidthLimitGroup.style.display = settings.restrictBandwidth ? 'block' : 'none';
    }

    // Update statistics
    function updateStatistics() {
        // For demonstration, we'll use placeholder data
        document.getElementById('totalConnections').textContent = '0';
        document.getElementById('totalBandwidth').textContent = '0 MB';
        document.getElementById('averageSpeed').textContent = '0 KB/s';
        
        // Update connection history
        const historyContainer = document.getElementById('connectionHistory');
        historyContainer.innerHTML = '<p>No connection history available</p>';
    }

    // Set up event listeners
    function setupEventListeners() {
        // Toggle proxy button
        toggleProxyBtn.addEventListener('click', () => {
            if (proxyState.enabled) {
                // Disable proxy
                chrome.runtime.sendMessage({ action: "disableProxy" }, (response) => {
                    if (response && response.success) {
                        proxyState.enabled = false;
                        updateUI();
                    }
                });
            } else {
                // Enable proxy with current server, or first available if none selected
                const server = proxyState.currentServer || (proxyState.servers.length > 0 ? proxyState.servers[0] : null);
                
                if (server) {
                    connectToServer(server);
                } else {
                    alert("Please add a proxy server first");
                }
            }
        });
        
        // Add server form
        addServerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = document.getElementById('serverName').value.trim();
            const type = document.getElementById('serverType').value;
            const url = document.getElementById('serverUrl').value.trim();
            
            if (!name || !url) {
                alert("Please enter both server name and URL");
                return;
            }
            
            chrome.runtime.sendMessage(
                { action: "addServer", name, type, url },
                (response) => {
                    if (response && response.success) {
                        proxyState.servers.push(response.server);
                        
                        // Reset form
                        addServerForm.reset();
                        
                        // Update UI
                        updateServerList();
                    } else {
                        alert(`Failed to add server: ${response?.error || 'Unknown error'}`);
                    }
                }
            );
        });
        
        // Settings form
        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const settings = {
                autoConnect: document.getElementById('autoConnectOption').value,
                bypassLocal: document.getElementById('bypassLocalOption').checked,
                preventDnsLeak: document.getElementById('preventDnsLeakOption').checked,
                retryAttempts: parseInt(document.getElementById('retryAttemptsOption').value)
            };
            
            saveSettings({ ...proxyState.settings, ...settings });
        });
        
        // Advanced settings form
        advancedSettingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const settings = {
                timeout: parseInt(document.getElementById('timeoutOption').value),
                rotation: parseInt(document.getElementById('rotationOption').value),
                restrictBandwidth: document.getElementById('restrictBandwidthOption').checked,
                bandwidthLimit: parseInt(document.getElementById('bandwidthLimit').value)
            };
            
            saveSettings({ ...proxyState.settings, ...settings });
        });
        
        // Listen for messages from background
        chrome.runtime.onMessage.addListener((message) => {
            if (message.action === "proxyStateChanged") {
                proxyState.enabled = message.enabled;
                if (message.server) {
                    proxyState.currentServer = message.server;
                }
                updateUI();
            }
        });
    }

    // Connect to a specific server
    function connectToServer(server) {
        chrome.runtime.sendMessage(
            { action: "enableProxy", server },
            (response) => {
                if (response && response.success) {
                    proxyState.enabled = true;
                    proxyState.currentServer = server;
                    updateUI();
                } else {
                    alert("Failed to connect to proxy server");
                }
            }
        );
    }

    // Remove a server
    function removeServer(serverId) {
        if (confirm("Are you sure you want to remove this server?")) {
            chrome.runtime.sendMessage(
                { action: "removeServer", serverId },
                (response) => {
                    if (response && response.success) {
                        // Remove from local state
                        proxyState.servers = proxyState.servers.filter(s => s.id !== serverId);
                        
                        // If removing current server, update current server
                        if (proxyState.currentServer && proxyState.currentServer.id === serverId) {
                            proxyState.currentServer = null;
                        }
                        
                        updateUI();
                    } else {
                        alert(`Failed to remove server: ${response?.error || 'Unknown error'}`);
                    }
                }
            );
        }
    }

    // Save settings
    function saveSettings(settings) {
        chrome.storage.local.set({ proxySettings: settings }, () => {
            proxyState.settings = settings;
            alert("Settings saved successfully");
        });
    }

    // Helper function to format bytes
    function formatBytes(bytes) {
        if (!bytes || isNaN(bytes) || bytes === 0) return '0 B';
        
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Helper function to format speed
    function formatSpeed(bytesPerSecond) {
        if (!bytesPerSecond || isNaN(bytesPerSecond) || bytesPerSecond === 0) return '0 B/s';
        
        const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
        const i = Math.floor(Math.log(bytesPerSecond) / Math.log(1024));
        
        return parseFloat((bytesPerSecond / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Initialize the dashboard
    init();
}); 