/**
 * Example server for ProxyEthica integration
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, '../')));

// Serve the example integration
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'web-integration.html'));
});

// Mock API endpoints for development
app.post('/device/register', (req, res) => {
  res.json({
    success: true,
    deviceId: req.body.deviceId,
    timestamp: new Date().toISOString()
  });
});

app.post('/device/consent', (req, res) => {
  res.json({
    success: true,
    deviceId: req.body.deviceId,
    consented: req.body.consented
  });
});

app.post('/device/available', (req, res) => {
  res.json({
    success: true,
    deviceId: req.body.deviceId,
    available: true
  });
});

app.post('/device/unavailable', (req, res) => {
  res.json({
    success: true,
    deviceId: req.body.deviceId,
    available: false
  });
});

app.post('/device/heartbeat', (req, res) => {
  res.json({
    success: true,
    deviceId: req.body.deviceId,
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Example server running at http://localhost:${PORT}`);
}); 