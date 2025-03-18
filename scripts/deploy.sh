
#!/bin/bash

# ProxyEthica Deployment Script
echo "Starting ProxyEthica deployment..."

# Build the extension
npm run build

# Run tests
npm test

# Deploy Firebase functions
echo "Deploying Firebase functions..."
firebase deploy --only functions

# Deploy hosting
echo "Deploying to hosting..."
firebase deploy --only hosting

echo "Deployment complete!"
