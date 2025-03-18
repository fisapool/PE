
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase-config';

class MonitoringService {
  static async logMetric(metricName, value, tags = {}) {
    const functions = getFunctions();
    const logMetricFn = httpsCallable(functions, 'logMetric');
    
    return logMetricFn({
      metric: metricName,
      value,
      timestamp: Date.now(),
      tags
    });
  }

  static async getServerHealth() {
    const healthCheck = httpsCallable(functions, 'healthCheck');
    return healthCheck();
  }

  static watchProxyLatency(proxyId) {
    const startTime = Date.now();
    return {
      end: () => {
        const latency = Date.now() - startTime;
        this.logMetric('proxy.latency', latency, { proxyId });
      }
    };
  }
}

export default MonitoringService;
