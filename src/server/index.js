/**
 * Proxy Network Server Entry Point
 * 
 * AI-generated code for the Residential Proxy Project
 */

const ProxyNetworkServer = require('./ProxyNetworkServer');
const config = require('../config/proxyConfig');

// Create and start the server
const server = new ProxyNetworkServer({
  port: process.env.PORT || config.port || 3000,
  jwtSecret: process.env.JWT_SECRET || config.security.jwt.secret
});

// Handle startup
server.start()
  .then(() => {
    console.log(`Proxy Network Server started on port ${server.options.port}`);
  })
  .catch(error => {
    console.error('Failed to start Proxy Network Server:', error);
    process.exit(1);
  });

// Handle shutdown
const gracefulShutdown = () => {
  console.log('Shutting down Proxy Network Server...');
  server.stop()
    .then(() => {
      console.log('Server stopped successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error during shutdown:', error);
      process.exit(1);
    });
};

// Listen for termination signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = server; 