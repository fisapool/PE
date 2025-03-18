
const https = require('https');
const MonitoringService = require('../src/utils/monitoring');

async function verifyDeployment() {
  const healthCheck = await MonitoringService.getServerHealth();
  
  if (!healthCheck.status === 'healthy') {
    throw new Error('Deployment health check failed');
  }
  
  console.log('Deployment verified successfully');
}

verifyDeployment().catch(console.error);
