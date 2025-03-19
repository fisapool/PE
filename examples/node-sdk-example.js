
const ProxyEthicaSDK = require('../src/sdk/node');

// Initialize SDK
const client = new ProxyEthicaSDK({
  apiKey: 'YOUR_API_KEY',
  baseUrl: 'https://api.proxyethica.com'
});

// Example usage
async function example() {
  try {
    // Get available proxies
    const proxies = await client.getProxies();
    console.log('Available proxies:', proxies);

    // Get proxy stats
    const stats = await client.getProxyStats(proxies[0].id);
    console.log('Proxy stats:', stats);

    // Rotate proxy
    const newProxy = await client.rotateProxy(proxies[0].id);
    console.log('New proxy:', newProxy);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

example();
