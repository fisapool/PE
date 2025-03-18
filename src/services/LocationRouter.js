
const geoip = require('geoip-lite');

class LocationRouter {
  constructor() {
    this.proxyServers = new Map();
  }

  registerProxyServer(location, server) {
    if (!this.proxyServers.has(location)) {
      this.proxyServers.set(location, []);
    }
    this.proxyServers.get(location).push(server);
  }

  getOptimalProxy(clientIp, preferredLocation) {
    const geo = geoip.lookup(clientIp);
    const location = preferredLocation || (geo ? geo.country : 'US');
    
    let servers = this.proxyServers.get(location);
    if (!servers || servers.length === 0) {
      servers = this.proxyServers.get('US'); // Fallback
    }
    
    return servers[Math.floor(Math.random() * servers.length)];
  }
}

module.exports = new LocationRouter();
