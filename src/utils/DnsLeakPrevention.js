/**
 * DNS Leak Prevention Utility
 * Prevents DNS leaks when using residential proxies
 * 
 * AI-generated code for the Residential Proxy Project
 */

const { execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

class DnsLeakPrevention {
  constructor(options = {}) {
    this.active = options.active !== false;
    this.strictMode = options.strictMode || false;
    this.secureDnsServers = options.secureDnsServers || [
      '1.1.1.1',        // Cloudflare
      '9.9.9.9',        // Quad9
      '8.8.8.8'         // Google
    ];
    this.leakTests = [
      this._checkSystemDns,
      this._checkProxyBypass,
      this._checkWebRTC
    ];
    this.platform = os.platform();
    this.originalDnsSettings = null;
  }

  /**
   * Check if configuration has potential DNS leaks
   * @param {Object} config - Proxy configuration to check
   * @returns {boolean} - True if leaks detected
   */
  checkForLeaks(config) {
    if (!this.active) {
      return false;
    }

    // Run all leak tests and return true if any test detects a leak
    for (const test of this.leakTests) {
      if (test.call(this, config)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Fix potential DNS leaks in configuration
   * @param {Object} config - Proxy configuration to fix
   * @returns {Object} - Fixed configuration
   */
  fixLeaks(config) {
    if (!this.active) {
      return config;
    }

    const fixedConfig = { ...config };

    // Force DNS through proxy
    fixedConfig.useSystemDns = false;
    fixedConfig.forceDnsProxy = true;
    
    // Prevent proxy bypass
    fixedConfig.bypassProxy = false;
    
    // Disable WebRTC if possible
    if (fixedConfig.browser) {
      fixedConfig.disableWebRTC = true;
    }

    // Use secure DNS servers if available
    if (!fixedConfig.dnsServers) {
      fixedConfig.dnsServers = [...this.secureDnsServers];
    }

    return fixedConfig;
  }

  /**
   * Enable DNS leak prevention
   */
  enable() {
    this.active = true;
  }

  /**
   * Disable DNS leak prevention
   */
  disable() {
    this.active = false;
  }

  /**
   * Check if using system DNS instead of proxy DNS
   * @private
   * @param {Object} config - Proxy configuration
   * @returns {boolean} - True if leak detected
   */
  _checkSystemDns(config) {
    return config.useSystemDns === true || config.forceDnsProxy === false;
  }

  /**
   * Check if proxy bypass is enabled
   * @private
   * @param {Object} config - Proxy configuration
   * @returns {boolean} - True if leak detected
   */
  _checkProxyBypass(config) {
    return config.bypassProxy === true;
  }

  /**
   * Check if WebRTC is enabled (could leak real IP)
   * @private
   * @param {Object} config - Proxy configuration
   * @returns {boolean} - True if leak detected
   */
  _checkWebRTC(config) {
    // If browser config is present and WebRTC is not explicitly disabled
    return config.browser && config.disableWebRTC !== true;
  }

  /**
   * Verify if a DNS server is secure
   * @param {string} dnsServer - DNS server IP
   * @returns {boolean} - True if DNS server is considered secure
   */
  isSecureDnsServer(dnsServer) {
    return this.secureDnsServers.includes(dnsServer);
  }

  /**
   * Add a secure DNS server to the list
   * @param {string} dnsServer - DNS server IP to add
   */
  addSecureDnsServer(dnsServer) {
    if (!this.secureDnsServers.includes(dnsServer)) {
      this.secureDnsServers.push(dnsServer);
    }
  }

  /**
   * Generate a report on potential DNS leaks
   * @param {Object} config - Proxy configuration to check
   * @returns {Object} - Leak detection report
   */
  generateLeakReport(config) {
    const leaks = [];
    const report = {
      hasLeaks: false,
      leaks: [],
      recommendations: []
    };

    // Check for system DNS usage
    if (this._checkSystemDns(config)) {
      leaks.push({
        type: 'system_dns',
        severity: 'high',
        description: 'Using system DNS instead of proxy DNS'
      });
      report.recommendations.push('Configure to use proxy DNS instead of system DNS');
    }

    // Check for proxy bypass
    if (this._checkProxyBypass(config)) {
      leaks.push({
        type: 'proxy_bypass',
        severity: 'high',
        description: 'Proxy bypass is enabled'
      });
      report.recommendations.push('Disable proxy bypass settings');
    }

    // Check for WebRTC leaks
    if (this._checkWebRTC(config)) {
      leaks.push({
        type: 'webrtc',
        severity: 'medium',
        description: 'WebRTC could leak real IP address'
      });
      report.recommendations.push('Disable WebRTC in browser configurations');
    }

    // Update report
    report.hasLeaks = leaks.length > 0;
    report.leaks = leaks;
    
    return report;
  }

  /**
   * Secure browser settings to prevent DNS leaks
   * @param {Object} browserSettings - Browser settings to secure
   * @returns {Object} Secured browser settings
   */
  secureBrowser(browserSettings) {
    if (!browserSettings || !browserSettings.proxy) {
      return browserSettings;
    }
    
    const secureSettings = { ...browserSettings };
    const proxy = secureSettings.proxy;
    
    // Ensure all proxy types use same DNS
    if (proxy.http && !proxy.dns) {
      proxy.dns = proxy.http;
    }
    
    // Enable SOCKS remote DNS resolution
    proxy.socks_remote_dns = true;
    
    return secureSettings;
  }

  /**
   * Block WebRTC leaks that could reveal the real IP
   * @param {Object} webRtcConfig - WebRTC configuration
   * @returns {Object} Secured WebRTC configuration
   */
  blockWebRtcLeaks(webRtcConfig) {
    if (!webRtcConfig) return {};
    
    // Remove all STUN/TURN servers to prevent WebRTC from establishing connections
    return {
      ...webRtcConfig,
      iceServers: []
    };
  }

  /**
   * Detects if DNS leaks are possible in the current environment
   * @returns {boolean} - Whether DNS leaks are possible
   */
  isDnsLeakPossible() {
    // Check if running in a VM or container
    try {
      const cpuInfo = fs.readFileSync('/proc/cpuinfo', 'utf8');
      if (cpuInfo.includes('hypervisor') || cpuInfo.includes('VMware') || cpuInfo.includes('VirtualBox')) {
        return true;
      }
    } catch (error) {
      // /proc/cpuinfo not available, not on Linux
    }
    
    // Check for WebRTC (in browser contexts)
    if (typeof window !== 'undefined' && window.RTCPeerConnection) {
      return true;
    }
    
    return false;
  }

  /**
   * Gets the system's current DNS servers
   * @returns {Array<string>} - List of DNS servers
   */
  getCurrentDnsServers() {
    try {
      switch (this.platform) {
        case 'linux':
          const resolvConf = fs.readFileSync('/etc/resolv.conf', 'utf8');
          return resolvConf
            .split('\n')
            .filter(line => line.trim().startsWith('nameserver'))
            .map(line => line.replace('nameserver', '').trim());
        case 'darwin': // macOS
          const output = execSync('scutil --dns | grep "nameserver\\[[0-9]*\\]"').toString();
          return output
            .split('\n')
            .filter(Boolean)
            .map(line => line.replace(/.*nameserver\[\d+\] : /, '').trim());
        case 'win32':
          const ipconfig = execSync('ipconfig /all').toString();
          const dnsLines = ipconfig.match(/DNS Servers[\s.:]+([^\r\n]+)/g) || [];
          return dnsLines.map(line => line.replace(/DNS Servers[\s.:]+/, '').trim());
        default:
          return [];
      }
    } catch (error) {
      console.error('Error getting DNS servers:', error.message);
      return [];
    }
  }

  /**
   * Backs up current DNS settings before modification
   */
  backupDnsSettings() {
    this.originalDnsSettings = this.getCurrentDnsServers();
  }

  /**
   * Sets DNS servers to use the proxy's DNS
   * @param {Array<string>} dnsServers - DNS servers to use
   * @returns {boolean} - Whether DNS was successfully modified
   */
  setProxyDns(dnsServers) {
    if (!dnsServers || !dnsServers.length) {
      return false;
    }
    
    // Backup current settings if not already done
    if (!this.originalDnsSettings) {
      this.backupDnsSettings();
    }
    
    try {
      switch (this.platform) {
        case 'linux':
          // Only attempt if running as root
          if (process.getuid && process.getuid() === 0) {
            const resolveConfPath = '/etc/resolv.conf';
            const content = dnsServers.map(dns => `nameserver ${dns}`).join('\n');
            fs.writeFileSync(resolveConfPath, content);
            return true;
          }
          break;
        case 'darwin': // macOS
          if (process.getuid && process.getuid() === 0) {
            const networkSetup = execSync('networksetup -listallnetworkservices').toString();
            const services = networkSetup
              .split('\n')
              .filter(line => !line.includes('*') && line.trim())
              .slice(1);
            
            services.forEach(service => {
              dnsServers.forEach(dns => {
                execSync(`networksetup -setdnsservers "${service}" ${dns}`);
              });
            });
            return true;
          }
          break;
        case 'win32':
          // Requires elevated privileges
          try {
            const interfaces = execSync('netsh interface show interface').toString();
            const activeInterfaces = interfaces
              .split('\n')
              .filter(line => line.includes('Connected') && !line.includes('Loopback'))
              .map(line => line.match(/(\w+)$/)[1]);
            
            activeInterfaces.forEach(iface => {
              execSync(`netsh interface ip set dns "${iface}" static ${dnsServers[0]} primary`);
              dnsServers.slice(1).forEach((dns, idx) => {
                execSync(`netsh interface ip add dns "${iface}" ${dns} index=${idx + 2}`);
              });
            });
            return true;
          } catch (error) {
            console.error('Failed to set Windows DNS. Run as administrator:', error.message);
          }
          break;
      }
    } catch (error) {
      console.error('Error setting proxy DNS:', error.message);
    }
    
    // Fallback: provide guidance for manual configuration
    console.log('DNS modification requires elevated privileges. Consider manually setting DNS to:', dnsServers.join(', '));
    return false;
  }

  /**
   * Restores original DNS settings
   * @returns {boolean} - Whether settings were restored
   */
  restoreOriginalDns() {
    if (!this.originalDnsSettings) {
      return false;
    }
    
    return this.setProxyDns(this.originalDnsSettings);
  }

  /**
   * Provides instructions for DNS leak prevention
   * @returns {string} - Instructions for manual DNS leak prevention
   */
  getLeakPreventionInstructions() {
    return `
DNS Leak Prevention Instructions:
--------------------------------
1. Use a reliable VPN alongside the proxy
2. Disable WebRTC in your browser if applicable
3. Consider manually setting DNS servers to:
   - 1.1.1.1 (Cloudflare)
   - 8.8.8.8 (Google)
   - Or your proxy provider's recommended DNS servers

Current DNS Servers: ${this.getCurrentDnsServers().join(', ')}
`;
  }
}

module.exports = DnsLeakPrevention; 