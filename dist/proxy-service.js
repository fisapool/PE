// AI-generated code for ProxyEthica Network
// Usage disclaimer: This proxy should be used ethically and legally

// Configuration storage
let proxyConfig = {
    enabled: false,
    servers: [],
    currentServer: null,
    retryCount: 0,
    maxRetries: 5
};

// Initialize proxy settings from storage
chrome.storage.local.get(['proxyConfig'], (result) => {
    if (result.proxyConfig) {
        proxyConfig = result.proxyConfig;
        if (proxyConfig.enabled && proxyConfig.currentServer) {
            enableProxy(proxyConfig.currentServer);
        }
    }
});

// Save configuration to storage
function saveConfig() {
    chrome.storage.local.set({ proxyConfig });
}

// Enable proxy with the specified server
function enableProxy(server) {
    if (!server || !server.url) {
        console.error("Invalid server configuration");
        return false;
    }
    
    // Validate URL format
    try {
        new URL(server.url);
    } catch (e) {
        console.error("Invalid server URL format:", e);
        return false;
    }
    
    const config = {
        mode: "fixed_servers",
        rules: {
            singleProxy: {
                scheme: "http",
                host: server.url.replace(/^https?:\/\//, '').split(':')[0],
                port: parseInt(server.url.split(':')[2] || "80")
            },
            bypassList: ["localhost", "127.0.0.1"]
        }
    };
    
    chrome.proxy.settings.set({ value: config, scope: 'regular' }, () => {
        if (chrome.runtime.lastError) {
            console.error("Proxy setup failed:", chrome.runtime.lastError);
            return false;
        }
        
        proxyConfig.enabled = true;
        proxyConfig.currentServer = server;
        proxyConfig.retryCount = 0;
        saveConfig();
        
        // Notify popup about state change
        chrome.runtime.sendMessage({ action: "proxyStateChanged", enabled: true, server });
        return true;
    });
    
    // Set up error handling for proxy connections
    chrome.webRequest.onErrorOccurred.addListener(
        handleProxyError,
        { urls: ["<all_urls>"] }
    );
    
    return true;
}

// Disable proxy
function disableProxy() {
    chrome.proxy.settings.clear({ scope: 'regular' }, () => {
        proxyConfig.enabled = false;
        saveConfig();
        
        // Notify popup about state change
        chrome.runtime.sendMessage({ action: "proxyStateChanged", enabled: false });
    });
    
    // Remove error listener when proxy is disabled
    chrome.webRequest.onErrorOccurred.removeListener(handleProxyError);
}

// Add a new proxy server
function addServer(name, type, url) {
    // Validate inputs
    if (!name || !url) {
        return { success: false, error: "Name and URL are required" };
    }
    
    // Validate URL format
    try {
        new URL(url);
    } catch (e) {
        return { success: false, error: "Invalid URL format" };
    }
    
    const server = {
        id: Date.now().toString(),
        name: name,
        type: type || "http",
        url: url,
        addedAt: new Date().toISOString()
    };
    
    proxyConfig.servers.push(server);
    saveConfig();
    
    return { success: true, server };
}

// Handle proxy errors and implement fallback strategy
function handleProxyError(details) {
    if (!proxyConfig.enabled || details.error.indexOf('PROXY_CONNECTION_FAILED') === -1) {
        return;
    }
    
    // Implement retry with exponential backoff
    if (proxyConfig.retryCount < proxyConfig.maxRetries) {
        proxyConfig.retryCount++;
        saveConfig();
        
        // Calculate delay with jitter to avoid thundering herd
        const baseDelay = Math.pow(2, proxyConfig.retryCount) * 1000;
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;
        
        setTimeout(() => {
            // Try another server if available
            if (proxyConfig.servers.length > 1) {
                const currentIndex = proxyConfig.servers.findIndex(s => 
                    s.id === proxyConfig.currentServer.id);
                const nextIndex = (currentIndex + 1) % proxyConfig.servers.length;
                enableProxy(proxyConfig.servers[nextIndex]);
            } else {
                // Just retry the same server
                enableProxy(proxyConfig.currentServer);
            }
        }, delay);
    } else {
        // Max retries reached, disable proxy
        disableProxy();
        chrome.runtime.sendMessage({ 
            action: "proxyError", 
            error: "Max retry attempts reached. Proxy disabled." 
        });
    }
}

// Message handler for communication with popup and other extension pages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case "getProxyState":
            sendResponse({
                enabled: proxyConfig.enabled,
                currentServer: proxyConfig.currentServer,
                servers: proxyConfig.servers
            });
            break;
            
        case "enableProxy":
            const success = enableProxy(message.server);
            sendResponse({ success });
            break;
            
        case "disableProxy":
            disableProxy();
            sendResponse({ success: true });
            break;
            
        case "addServer":
            const result = addServer(message.name, message.type, message.url);
            sendResponse(result);
            break;
            
        case "removeServer":
            const serverIndex = proxyConfig.servers.findIndex(s => s.id === message.serverId);
            if (serverIndex !== -1) {
                proxyConfig.servers.splice(serverIndex, 1);
                saveConfig();
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: "Server not found" });
            }
            break;
    }
    return true;
});

console.log("Proxy service initialized"); 