
const { getFunctions, httpsCallable } = require('firebase/functions');

class MonitoringService {
  constructor() {
    this.metrics = new Map();
    this.METRICS_INTERVAL = 60000; // 1 minute
  }

  startMetricsCollection() {
    setInterval(() => this.flushMetrics(), this.METRICS_INTERVAL);
  }

  trackProxyLatency(proxyId, latencyMs) {
    const metric = this.metrics.get('proxy_latency') || [];
    metric.push({ proxyId, value: latencyMs, timestamp: Date.now() });
    this.metrics.set('proxy_latency', metric);
  }

  trackBandwidthUsage(proxyId, bytesTransferred) {
    const metric = this.metrics.get('bandwidth_usage') || [];
    metric.push({ proxyId, value: bytesTransferred, timestamp: Date.now() });
    this.metrics.set('bandwidth_usage', metric);
  }

  async flushMetrics() {
    const functions = getFunctions();
    const logMetrics = httpsCallable(functions, 'logMetrics');
    
    try {
      const metricsData = Object.fromEntries(this.metrics);
      await logMetrics(metricsData);
      this.metrics.clear();
    } catch (error) {
      console.error('Failed to flush metrics:', error);
    }
  }
}

module.exports = new MonitoringService();
