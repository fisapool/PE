/**
 * Proxy Utility Functions
 * Utility functions for working with proxies
 * 
 * AI-generated code for the Residential Proxy Project
 */

/**
 * Validate proxy URL format
 * @param {string} url - Proxy URL to validate
 * @returns {boolean} - Whether URL is valid
 */
function isValidProxyUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'socks:', 'socks4:', 'socks5:'].includes(parsed.protocol);
  } catch (error) {
    return false;
  }
}

/**
 * Format proxy URL with authentication
 * @param {Object} proxyConfig - Proxy configuration
 * @returns {string} - Formatted proxy URL
 */
function formatProxyUrl(proxyConfig) {
  if (!proxyConfig || !proxyConfig.host) {
    throw new Error('Invalid proxy configuration');
  }

  const { protocol = 'http', host, port, username, password } = proxyConfig;
  
  let url = `${protocol}://`;
  
  if (username && password) {
    // URL encode the username and password to handle special characters
    const encodedUsername = encodeURIComponent(username);
    const encodedPassword = encodeURIComponent(password);
    url += `${encodedUsername}:${encodedPassword}@`;
  }
  
  url += host;
  
  if (port) {
    url += `:${port}`;
  }
  
  return url;
}

/**
 * Handle proxy errors with appropriate messaging
 * @param {Error} error - Error object
 * @returns {Object} - Formatted error response
 */
function handleProxyError(error) {
  // Mask any API keys or credentials in the error message
  let message = error.message || 'Unknown proxy error';
  message = message.replace(/api[-_]?key=([^&]+)/gi, 'api_key=***REDACTED***');
  message = message.replace(/pass(word)?=([^&]+)/gi, 'password=***REDACTED***');
  
  // Determine error type
  let errorType = 'PROXY_ERROR';
  let statusCode = 500;
  
  if (message.includes('ECONNREFUSED') || message.includes('ECONNRESET')) {
    errorType = 'CONNECTION_ERROR';
    statusCode = 502;
  } else if (message.includes('ETIMEDOUT') || message.includes('timeout')) {
    errorType = 'TIMEOUT_ERROR';
    statusCode = 504;
  } else if (message.includes('authentication') || message.includes('unauthorized')) {
    errorType = 'AUTH_ERROR';
    statusCode = 401;
  }
  
  return {
    error: errorType,
    message,
    statusCode
  };
}

/**
 * Extract host and port from proxy URL
 * @param {string} proxyUrl - Full proxy URL
 * @returns {Object} - Host and port
 */
function extractProxyHostAndPort(proxyUrl) {
  try {
    const parsed = new URL(proxyUrl);
    return {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 
        (parsed.protocol === 'https:' ? 443 : 80)
    };
  } catch (error) {
    throw new Error(`Invalid proxy URL: ${error.message}`);
  }
}

/**
 * Get appropriate proxy protocol based on target URL
 * @param {string} targetUrl - URL to be accessed via proxy
 * @returns {string} - Recommended proxy protocol
 */
function getProxyProtocolForUrl(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    return parsed.protocol === 'https:' ? 'https' : 'http';
  } catch (error) {
    // Default to https for safety
    return 'https';
  }
}

module.exports = {
  isValidProxyUrl,
  formatProxyUrl,
  handleProxyError,
  extractProxyHostAndPort,
  getProxyProtocolForUrl
}; 