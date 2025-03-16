/**
 * Main application entry point
 * AI-generated code for the Residential Proxy Project
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Determine if we're running in server or client mode
const mode = process.env.MODE || 'server';

if (mode === 'server') {
  // Start the server
  require('./server');
} else if (mode === 'client') {
  // Import the client library for CLI use
  const ProxyAPIClient = require('./client/ProxyAPIClient');
  const client = new ProxyAPIClient();
  
  // Handle CLI arguments
  const [,, url, ...args] = process.argv;
  
  if (url) {
    console.log(`Making proxy request to ${url}...`);
    
    client.requestWithProviderFallback(url)
      .then(response => {
        console.log('Request successful:');
        console.log(response);
        process.exit(0);
      })
      .catch(error => {
        console.error('Request failed:', error.message);
        process.exit(1);
      });
  } else {
    console.log('Usage: npm start:client [url]');
    process.exit(1);
  }
} else {
  console.error(`Unknown mode: ${mode}. Use 'server' or 'client'.`);
  process.exit(1);
} 