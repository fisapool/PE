// ProxyEthica Admin Terminal
document.addEventListener('DOMContentLoaded', async function() {
  const terminalOutput = document.getElementById('terminal-output');
  const terminalInput = document.getElementById('terminal-input');
  const clearBtn = document.getElementById('clear-btn');
  const backBtn = document.getElementById('back-btn');
  const proxyStatusIndicator = document.getElementById('proxy-status-indicator');
  const proxyStatus = document.getElementById('proxy-status');
  const currentProxyEl = document.getElementById('current-proxy');
  const bandwidthUsedEl = document.getElementById('bandwidth-used');
  
  let proxyService;
  let commandHistory = [];
  let historyIndex = -1;
  let stats = {
    active: false,
    currentIP: null,
    bandwidthUsed: 0
  };

  // Initialize terminal
  initTerminal();
  
  // Set up event listeners
  terminalInput.addEventListener('keydown', handleInput);
  clearBtn.addEventListener('click', clearTerminal);
  backBtn.addEventListener('click', () => {
    window.location.href = 'about.html';
  });
  
  // Update status bar periodically
  setInterval(updateStatusBar, 2000);
  
  // Initialize terminal with welcome message
  function initTerminal() {
    addSystemLine("ProxyEthica Network Admin Terminal v1.0");
    addSystemLine("Type 'help' for a list of commands");
    addSystemLine("Loading proxy service...");
    
    // Import the proxy service and initialize it
    import('./proxy-service.js')
      .then(module => {
        proxyService = new module.default();
        proxyService.init().then(() => {
          addSuccessLine("Proxy service loaded successfully");
          updateStatusBar();
        }).catch(error => {
          addErrorLine(`Failed to initialize proxy service: ${error.message}`);
        });
      })
      .catch(error => {
        addErrorLine(`Failed to load proxy service module: ${error.message}`);
      });
  }
  
  // Handle terminal input
  function handleInput(e) {
    if (e.key === 'Enter') {
      const command = terminalInput.value.trim();
      
      if (command) {
        // Add to history
        commandHistory.push(command);
        historyIndex = commandHistory.length;
        
        // Display command
        addCommandLine(command);
        
        // Process command
        processCommand(command);
        
        // Clear input
        terminalInput.value = '';
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      navigateHistory(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      navigateHistory(1);
    }
  }
  
  // Navigate command history
  function navigateHistory(direction) {
    if (commandHistory.length === 0) return;
    
    historyIndex += direction;
    
    if (historyIndex < 0) {
      historyIndex = 0;
    } else if (historyIndex > commandHistory.length) {
      historyIndex = commandHistory.length;
      terminalInput.value = '';
      return;
    }
    
    if (historyIndex === commandHistory.length) {
      terminalInput.value = '';
    } else {
      terminalInput.value = commandHistory[historyIndex];
    }
    
    // Move cursor to end
    setTimeout(() => {
      terminalInput.selectionStart = terminalInput.value.length;
      terminalInput.selectionEnd = terminalInput.value.length;
    }, 0);
  }
  
  // Process command
  async function processCommand(command) {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    switch (cmd) {
      case 'help':
        showHelp();
        break;
      case 'status':
        showStatus();
        break;
      case 'start':
        startProxy();
        break;
      case 'stop':
        stopProxy();
        break;
      case 'rotate':
        rotateProxy();
        break;
      case 'bypass':
        handleBypass(args);
        break;
      case 'config':
        handleConfig(args);
        break;
      case 'stats':
        showStats();
        break;
      case 'clear':
        clearTerminal();
        break;
      case 'proxy':
        handleProxyCommand(args);
        break;
      case 'exit':
        window.location.href = 'about.html';
        break;
      case 'reset':
        resetSettings();
        break;
      default:
        addErrorLine(`Unknown command: ${cmd}. Type 'help' for available commands.`);
    }
  }
  
  // Show help
  function showHelp() {
    addInfoLine("Available commands:");
    addOutputLine("help                 - Show this help");
    addOutputLine("status               - Show current proxy status");
    addOutputLine("start                - Start proxy service");
    addOutputLine("stop                 - Stop proxy service");
    addOutputLine("rotate               - Rotate to a new proxy");
    addOutputLine("bypass list          - List bypass domains");
    addOutputLine("bypass add [domain]  - Add domain to bypass list");
    addOutputLine("bypass remove [domain] - Remove domain from bypass list");
    addOutputLine("config show          - Show current configuration");
    addOutputLine("config set [key] [value] - Set configuration value");
    addOutputLine("stats                - Show detailed statistics");
    addOutputLine("proxy list           - List available proxies");
    addOutputLine("proxy info           - Show current proxy details");
    addOutputLine("proxy test [ip:port] - Test connection to a proxy");
    addOutputLine("clear                - Clear terminal");
    addOutputLine("reset                - Reset all settings");
    addOutputLine("exit                 - Return to dashboard");
  }
  
  // Show current status
  async function showStatus() {
    if (!proxyService) {
      addErrorLine("Proxy service not loaded yet");
      return;
    }
    
    try {
      const serviceStats = proxyService.getStats();
      
      addInfoLine("Proxy Status:");
      addOutputLine(`Status: ${serviceStats.active ? 'Active' : 'Inactive'}`);
      
      if (serviceStats.active && serviceStats.currentIP) {
        addOutputLine(`Current IP: ${serviceStats.currentIP}:${serviceStats.currentPort}`);
        addOutputLine(`Location: ${serviceStats.currentCountry || 'Unknown'}`);
        addOutputLine(`Uptime: ${serviceStats.uptime} minutes`);
      }
      
      addOutputLine(`Bandwidth Used: ${serviceStats.bandwidthUsed.toFixed(2)} MB`);
      addOutputLine(`Requests Processed: ${serviceStats.requestCount}`);
      
    } catch (error) {
      addErrorLine(`Error getting status: ${error.message}`);
    }
  }
  
  // Start proxy
  async function startProxy() {
    if (!proxyService) {
      addErrorLine("Proxy service not loaded yet");
      return;
    }
    
    addSystemLine("Starting proxy service...");
    
    try {
      const result = await proxyService.start();
      
      if (result.success) {
        addSuccessLine(`Proxy service started. Using IP: ${result.proxy.ip}:${result.proxy.port}`);
        updateStatusBar();
      } else {
        addErrorLine(`Failed to start proxy: ${result.error}`);
      }
    } catch (error) {
      addErrorLine(`Error starting proxy: ${error.message}`);
    }
  }
  
  // Stop proxy
  async function stopProxy() {
    if (!proxyService) {
      addErrorLine("Proxy service not loaded yet");
      return;
    }
    
    addSystemLine("Stopping proxy service...");
    
    try {
      const result = await proxyService.stop();
      
      if (result.success) {
        addSuccessLine("Proxy service stopped");
        updateStatusBar();
      } else {
        addErrorLine(`Failed to stop proxy: ${result.error}`);
      }
    } catch (error) {
      addErrorLine(`Error stopping proxy: ${error.message}`);
    }
  }
  
  // Rotate proxy
  async function rotateProxy() {
    if (!proxyService) {
      addErrorLine("Proxy service not loaded yet");
      return;
    }
    
    addSystemLine("Rotating proxy...");
    
    try {
      const result = await proxyService.rotateProxy();
      
      if (result.success) {
        addSuccessLine(`Rotated to new proxy: ${result.proxy.ip}:${result.proxy.port}`);
        updateStatusBar();
      } else {
        addErrorLine(`Failed to rotate proxy: ${result.error}`);
      }
    } catch (error) {
      addErrorLine(`Error rotating proxy: ${error.message}`);
    }
  }
  
  // Handle bypass commands
  async function handleBypass(args) {
    if (!proxyService) {
      addErrorLine("Proxy service not loaded yet");
      return;
    }
    
    if (args.length === 0) {
      addErrorLine("Missing bypass command. Use 'bypass list', 'bypass add [domain]', or 'bypass remove [domain]'");
      return;
    }
    
    const subCommand = args[0].toLowerCase();
    
    try {
      switch (subCommand) {
        case 'list':
          const bypassList = await proxyService.getBypassList();
          
          if (bypassList.length === 0) {
            addInfoLine("No bypass domains configured");
          } else {
            addInfoLine("Bypass Domains:");
            bypassList.forEach(domain => {
              addOutputLine(`- ${domain}`);
            });
          }
          break;
          
        case 'add':
          if (args.length < 2) {
            addErrorLine("Missing domain. Usage: bypass add [domain]");
            return;
          }
          
          const domainToAdd = args[1].toLowerCase();
          const currentList = await proxyService.getBypassList();
          
          if (currentList.includes(domainToAdd)) {
            addWarningLine(`Domain '${domainToAdd}' is already in bypass list`);
          } else {
            currentList.push(domainToAdd);
            await proxyService.setBypassList(currentList);
            addSuccessLine(`Added '${domainToAdd}' to bypass list`);
            
            // If proxy is active, update settings
            if (proxyService.active && proxyService.currentProxy) {
              await proxyService.configureProxySettings(proxyService.currentProxy);
              addInfoLine("Updated proxy configuration with new bypass rules");
            }
          }
          break;
          
        case 'remove':
          if (args.length < 2) {
            addErrorLine("Missing domain. Usage: bypass remove [domain]");
            return;
          }
          
          const domainToRemove = args[1].toLowerCase();
          const bypassSites = await proxyService.getBypassList();
          
          if (!bypassSites.includes(domainToRemove)) {
            addWarningLine(`Domain '${domainToRemove}' is not in bypass list`);
          } else {
            const updatedList = bypassSites.filter(d => d !== domainToRemove);
            await proxyService.setBypassList(updatedList);
            addSuccessLine(`Removed '${domainToRemove}' from bypass list`);
            
            // If proxy is active, update settings
            if (proxyService.active && proxyService.currentProxy) {
              await proxyService.configureProxySettings(proxyService.currentProxy);
              addInfoLine("Updated proxy configuration with new bypass rules");
            }
          }
          break;
          
        default:
          addErrorLine(`Unknown bypass command: ${subCommand}`);
      }
    } catch (error) {
      addErrorLine(`Error handling bypass command: ${error.message}`);
    }
  }
  
  // Handle config commands
  async function handleConfig(args) {
    if (!proxyService) {
      addErrorLine("Proxy service not loaded yet");
      return;
    }
    
    if (args.length === 0) {
      addErrorLine("Missing config command. Use 'config show' or 'config set [key] [value]'");
      return;
    }
    
    const subCommand = args[0].toLowerCase();
    
    try {
      switch (subCommand) {
        case 'show':
          addInfoLine("Current Configuration:");
          addOutputLine(`Auto Rotate: ${proxyService.settings.autoRotate}`);
          addOutputLine(`Max Bandwidth: ${proxyService.settings.maxBandwidth} MB`);
          addOutputLine(`Allow Mobile: ${proxyService.settings.allowMobile}`);
          addOutputLine(`Allow Battery: ${proxyService.settings.allowBattery}`);
          addOutputLine(`Rotation Interval: ${proxyService.rotationInterval / (60 * 1000)} minutes`);
          break;
          
        case 'set':
          if (args.length < 3) {
            addErrorLine("Missing key or value. Usage: config set [key] [value]");
            return;
          }
          
          const key = args[1].toLowerCase();
          const value = args[2].toLowerCase();
          
          switch (key) {
            case 'autorotate':
              proxyService.settings.autoRotate = value === 'true';
              addSuccessLine(`Set Auto Rotate to ${proxyService.settings.autoRotate}`);
              break;
              
            case 'maxbandwidth':
              const bandwidth = parseInt(value);
              if (isNaN(bandwidth) || bandwidth < 0) {
                addErrorLine("Invalid bandwidth value. Must be a positive number.");
                return;
              }
              proxyService.settings.maxBandwidth = bandwidth;
              addSuccessLine(`Set Max Bandwidth to ${bandwidth} MB`);
              break;
              
            case 'allowmobile':
              proxyService.settings.allowMobile = value === 'true';
              addSuccessLine(`Set Allow Mobile to ${proxyService.settings.allowMobile}`);
              break;
              
            case 'allowbattery':
              proxyService.settings.allowBattery = value === 'true';
              addSuccessLine(`Set Allow Battery to ${proxyService.settings.allowBattery}`);
              break;
              
            case 'rotationinterval':
              const minutes = parseInt(value);
              if (isNaN(minutes) || minutes < 1) {
                addErrorLine("Invalid rotation interval. Must be at least 1 minute.");
                return;
              }
              proxyService.rotationInterval = minutes * 60 * 1000;
              addSuccessLine(`Set Rotation Interval to ${minutes} minutes`);
              
              // Restart auto-rotation if active
              if (proxyService.active && proxyService.settings.autoRotate) {
                proxyService.startAutoRotation();
                addInfoLine("Restarted auto-rotation with new interval");
              }
              break;
              
            default:
              addErrorLine(`Unknown configuration key: ${key}`);
          }
          
          // Save settings
          chrome.storage.local.set({ proxySettings: proxyService.settings });
          break;
          
        default:
          addErrorLine(`Unknown config command: ${subCommand}`);
      }
    } catch (error) {
      addErrorLine(`Error handling config command: ${error.message}`);
    }
  }
  
  // Show detailed stats
  async function showStats() {
    if (!proxyService) {
      addErrorLine("Proxy service not loaded yet");
      return;
    }
    
    try {
      const serviceStats = proxyService.getStats();
      
      addInfoLine("Detailed Statistics:");
      addOutputLine(`Total Bandwidth Used: ${serviceStats.bandwidthUsed.toFixed(2)} MB`);
      addOutputLine(`Total Contribution Time: ${serviceStats.contributionMinutes.toFixed(2)} minutes`);
      addOutputLine(`Total Requests: ${serviceStats.requestCount}`);
      addOutputLine(`Failed Requests: ${serviceStats.failedRequests}`);
      
      if (serviceStats.active) {
        addOutputLine(`Current Session Uptime: ${serviceStats.uptime} minutes`);
      }
      
      // Get the bypass list size
      const bypassList = await proxyService.getBypassList();
      addOutputLine(`Bypass Rules: ${bypassList.length}`);
      
      // Show proxy pool size
      addOutputLine(`Available Proxies: ${proxyService.proxyPool.length}`);
      
      // Show user contributed proxies
      addOutputLine(`User Contributed Proxies: ${proxyService.userContributedIPs.length}`);
      
    } catch (error) {
      addErrorLine(`Error getting statistics: ${error.message}`);
    }
  }
  
  // Reset all settings
  async function resetSettings() {
    if (!proxyService) {
      addErrorLine("Proxy service not loaded yet");
      return;
    }
    
    addWarningLine("Are you sure you want to reset all settings? Type 'confirm' to proceed or anything else to cancel:");
    
    // Add confirmation listener
    const confirmListener = async (e) => {
      if (e.key === 'Enter') {
        const confirmation = terminalInput.value.trim().toLowerCase();
        
        // Remove the listener
        terminalInput.removeEventListener('keydown', confirmListener);
        
        // Display command
        addCommandLine(terminalInput.value.trim());
        
        // Clear input
        terminalInput.value = '';
        
        if (confirmation === 'confirm') {
          addSystemLine("Resetting all settings...");
          
          try {
            // Stop proxy if active
            if (proxyService.active) {
              await proxyService.stop();
            }
            
            // Reset settings
            proxyService.settings = {
              autoRotate: true,
              maxBandwidth: 500,
              allowMobile: false,
              allowBattery: false
            };
            
            // Clear bypass list but keep default sites
            await proxyService.addDefaultBypassSites();
            
            // Clear user contributed IPs
            proxyService.userContributedIPs = [];
            
            // Reset stats
            proxyService.stats = {
              bandwidthUsed: 0,
              contributionMinutes: 0,
              requestCount: 0,
              failedRequests: 0
            };
            
            // Save to storage
            await chrome.storage.local.set({
              proxySettings: proxyService.settings,
              userProxies: [],
              proxyStats: proxyService.stats
            });
            
            addSuccessLine("All settings have been reset to defaults");
            updateStatusBar();
            
          } catch (error) {
            addErrorLine(`Error resetting settings: ${error.message}`);
          }
        } else {
          addInfoLine("Reset cancelled");
        }
        
        // Restore the original input handler
        terminalInput.addEventListener('keydown', handleInput);
      }
    };
    
    // Replace the input handler with the confirmation handler
    terminalInput.removeEventListener('keydown', handleInput);
    terminalInput.addEventListener('keydown', confirmListener);
  }
  
  // Handle proxy-related commands
  async function handleProxyCommand(args) {
    if (!proxyService) {
      addErrorLine("Proxy service not loaded yet");
      return;
    }
    
    if (args.length === 0) {
      addErrorLine("Missing proxy command. Use 'proxy list', 'proxy info', or 'proxy test [ip:port]'");
      return;
    }
    
    const subCommand = args[0].toLowerCase();
    
    try {
      switch (subCommand) {
        case 'list':
          addInfoLine("Available Proxies:");
          if (proxyService.proxyPool.length === 0) {
            addWarningLine("No proxies available in the pool");
          } else {
            // Show first 10 proxies to avoid flooding the terminal
            const proxiesToShow = proxyService.proxyPool.slice(0, 10);
            proxiesToShow.forEach((proxy, index) => {
              addOutputLine(`${index + 1}. ${proxy.ip}:${proxy.port} (${proxy.country || 'Unknown'}, ${proxy.type || 'unknown'})`);
            });
            
            if (proxyService.proxyPool.length > 10) {
              addInfoLine(`...and ${proxyService.proxyPool.length - 10} more`);
            }
          }
          break;
          
        case 'info':
          if (!proxyService.currentProxy) {
            addWarningLine("No proxy currently active");
          } else {
            addInfoLine("Current Proxy Details:");
            addOutputLine(`IP: ${proxyService.currentProxy.ip}`);
            addOutputLine(`Port: ${proxyService.currentProxy.port}`);
            addOutputLine(`Country: ${proxyService.currentProxy.country || 'Unknown'}`);
            addOutputLine(`City: ${proxyService.currentProxy.city || 'Unknown'}`);
            addOutputLine(`Type: ${proxyService.currentProxy.type || 'Unknown'}`);
            
            // Show when this proxy was last rotated
            if (proxyService.lastRotationTime) {
              const timeAgo = Math.floor((new Date() - proxyService.lastRotationTime) / (60 * 1000));
              addOutputLine(`Last Rotation: ${timeAgo} minutes ago`);
            }
          }
          break;
          
        case 'test':
          if (args.length < 2) {
            addErrorLine("Missing proxy address. Usage: proxy test [ip:port]");
            return;
          }
          
          const proxyAddress = args[1];
          const [ip, portStr] = proxyAddress.split(':');
          const port = parseInt(portStr);
          
          if (!ip || !portStr || isNaN(port)) {
            addErrorLine("Invalid proxy format. Use 'ip:port'");
            return;
          }
          
          addSystemLine(`Testing proxy ${ip}:${port}...`);
          
          // For a real implementation, you would test the proxy connection here
          // This is a simple simulation
          setTimeout(() => {
            const success = Math.random() > 0.3; // 70% chance of success for demo
            
            if (success) {
              addSuccessLine(`Test successful! Proxy ${ip}:${port} is working`);
              addInfoLine(`Response time: ${Math.floor(Math.random() * 200) + 50}ms`);
            } else {
              addErrorLine(`Test failed! Could not connect to proxy ${ip}:${port}`);
            }
          }, 1000);
          break;
          
        default:
          addErrorLine(`Unknown proxy command: ${subCommand}`);
      }
    } catch (error) {
      addErrorLine(`Error handling proxy command: ${error.message}`);
    }
  }
  
  // Update status bar
  async function updateStatusBar() {
    if (!proxyService) return;
    
    try {
      const serviceStats = proxyService.getStats();
      
      // Update indicators
      if (serviceStats.active) {
        proxyStatusIndicator.classList.remove('status-inactive');
        proxyStatusIndicator.classList.add('status-active');
        proxyStatus.textContent = 'Proxy: Active';
      } else {
        proxyStatusIndicator.classList.remove('status-active');
        proxyStatusIndicator.classList.add('status-inactive');
        proxyStatus.textContent = 'Proxy: Inactive';
      }
      
      // Update IP
      if (serviceStats.currentIP) {
        currentProxyEl.textContent = `IP: ${serviceStats.currentIP}`;
      } else {
        currentProxyEl.textContent = 'IP: None';
      }
      
      // Update bandwidth
      bandwidthUsedEl.textContent = `Bandwidth: ${serviceStats.bandwidthUsed.toFixed(2)} MB`;
      
    } catch (error) {
      console.error('Error updating status bar:', error);
    }
  }
  
  // Add line to terminal output with command styling
  function addCommandLine(command) {
    const line = document.createElement('p');
    line.className = 'output-line';
    line.innerHTML = `<span class="terminal-prompt">admin@proxyethica:~$</span> <span class="output-command">${escapeHtml(command)}</span>`;
    terminalOutput.appendChild(line);
    scrollToBottom();
  }
  
  // Add line to terminal output with error styling
  function addErrorLine(text) {
    const line = document.createElement('p');
    line.className = 'output-line output-error';
    line.textContent = text;
    terminalOutput.appendChild(line);
    scrollToBottom();
  }
  
  // Add line to terminal output with success styling
  function addSuccessLine(text) {
    const line = document.createElement('p');
    line.className = 'output-line output-success';
    line.textContent = text;
    terminalOutput.appendChild(line);
    scrollToBottom();
  }
  
  // Add line to terminal output with info styling
  function addInfoLine(text) {
    const line = document.createElement('p');
    line.className = 'output-line output-info';
    line.textContent = text;
    terminalOutput.appendChild(line);
    scrollToBottom();
  }
  
  // Add line to terminal output with warning styling
  function addWarningLine(text) {
    const line = document.createElement('p');
    line.className = 'output-line output-warning';
    line.textContent = text;
    terminalOutput.appendChild(line);
    scrollToBottom();
  }
  
  // Add line to terminal output with system styling
  function addSystemLine(text) {
    const line = document.createElement('p');
    line.className = 'output-line output-system';
    line.textContent = text;
    terminalOutput.appendChild(line);
    scrollToBottom();
  }
  
  // Add regular line to terminal output
  function addOutputLine(text) {
    const line = document.createElement('p');
    line.className = 'output-line';
    line.textContent = text;
    terminalOutput.appendChild(line);
    scrollToBottom();
  }
  
  // Clear terminal output
  function clearTerminal() {
    terminalOutput.innerHTML = '';
    addSystemLine("Terminal cleared");
  }
  
  // Scroll terminal to bottom
  function scrollToBottom() {
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  }
  
  // Escape HTML to prevent XSS
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}); 