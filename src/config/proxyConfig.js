/**
 * Proxy Configuration
 * Central configuration for the proxy network
 * 
 * AI-generated code for the Residential Proxy Project
 */

// Load environment variables
require('dotenv').config();

// Base configuration
const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  logLevel: 'info',
  providers: {
    primary: {
      url: process.env.PROXY_PRIMARY_URL || 'https://proxy-provider.example.com',
      apiKey: process.env.PROXY_PRIMARY_KEY || '',
      maxConnections: parseInt(process.env.PROXY_MAX_CONNECTIONS || '100', 10)
    },
    fallback: {
      url: process.env.PROXY_FALLBACK_URL || 'https://fallback-proxy.example.com',
      apiKey: process.env.PROXY_FALLBACK_KEY || '',
      maxConnections: parseInt(process.env.PROXY_FALLBACK_MAX_CONNECTIONS || '50', 10)
    }
  },
  security: {
    rateLimits: {
      proxy: parseInt(process.env.RATE_LIMIT_PROXY || '30', 10),
      api: parseInt(process.env.RATE_LIMIT_API || '60', 10)
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'development-secret-key-change-in-production',
      expiresIn: process.env.JWT_EXPIRES_IN || '1d'
    }
  },
  consent: {
    requiredForUsage: true,
    expiresInDays: parseInt(process.env.CONSENT_EXPIRES_DAYS || '30', 10)
  }
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'development') {
  config.logLevel = 'debug';
} else if (process.env.NODE_ENV === 'production') {
  // Stricter settings for production
  config.security.rateLimits.proxy = parseInt(process.env.RATE_LIMIT_PROXY || '20', 10);
}

module.exports = config; 