class RotatingProxyList {
  constructor(options = {}) {
    this.proxyPool = new Map();
    this.activeProxies = new Set();
    this.rotationInterval = options.rotationInterval || 300000; // 5 minutes
    this.maxRetries = options.maxRetries || 3;
    this.geoFilter = options.geoFilter || null;
    this.lastRotation = null;
  }

  async addProxy(proxy) {
    if (!this._validateProxy(proxy)) {
      throw new Error('Invalid proxy configuration');
    }

    const proxyId = `${proxy.host}:${proxy.port}`;
    this.proxyPool.set(proxyId, {
      ...proxy,
      status: 'available',
      performance: {
        successRate: 100,
        avgSpeed: 0,
        totalRequests: 0
      },
      lastUsed: null
    });
  }

  async getNextProxy(requirements = {}) {
    const available = Array.from(this.proxyPool.values())
      .filter(proxy => 
        proxy.status === 'available' &&
        (!requirements.country || proxy.country === requirements.country) &&
        (!requirements.minSpeed || proxy.performance.avgSpeed >= requirements.minSpeed)
      );

    if (available.length === 0) {
      throw new Error('No suitable proxies available');
    }

    // Sort by performance and last used time
    available.sort((a, b) => {
      const scoreA = this._calculateScore(a);
      const scoreB = this._calculateScore(b);
      return scoreB - scoreA;
    });

    const selected = available[0];
    selected.lastUsed = Date.now();
    selected.status = 'active';
    this.activeProxies.add(selected.host + ':' + selected.port);

    return selected;
  }

  async rotateProxy(currentProxy, force = false) {
    if (!force && this.lastRotation && 
        Date.now() - this.lastRotation < this.rotationInterval) {
      return null;
    }

    try {
      const newProxy = await this.getNextProxy({
        country: currentProxy.country,
        minSpeed: currentProxy.performance.avgSpeed * 0.8
      });

      if (currentProxy) {
        const proxyId = `${currentProxy.host}:${currentProxy.port}`;
        const proxy = this.proxyPool.get(proxyId);
        if (proxy) {
          proxy.status = 'available';
          this.activeProxies.delete(proxyId);
        }
      }

      this.lastRotation = Date.now();
      return newProxy;
    } catch (error) {
      console.error('Rotation failed:', error);
      return currentProxy;
    }
  }

  updateProxyStatus(proxyId, stats) {
    const proxy = this.proxyPool.get(proxyId);
    if (!proxy) return;

    proxy.performance.totalRequests++;
    proxy.performance.successRate = 
      (proxy.performance.successRate * (proxy.performance.totalRequests - 1) + 
       (stats.success ? 100 : 0)) / proxy.performance.totalRequests;

    if (stats.speed) {
      proxy.performance.avgSpeed = 
        (proxy.performance.avgSpeed * (proxy.performance.totalRequests - 1) + 
         stats.speed) / proxy.performance.totalRequests;
    }
  }

  _calculateScore(proxy) {
    const timeSinceUsed = proxy.lastUsed ? Date.now() - proxy.lastUsed : Infinity;
    const timeScore = Math.min(timeSinceUsed / this.rotationInterval, 1);
    return (proxy.performance.successRate / 100) * 0.4 + 
           (proxy.performance.avgSpeed / 1000) * 0.3 + 
           timeScore * 0.3;
  }

  _validateProxy(proxy) {
    return proxy.host && 
           proxy.port && 
           proxy.type && 
           ['http', 'socks5'].includes(proxy.type.toLowerCase());
  }
}

module.exports = RotatingProxyList;