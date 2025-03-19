
const express = require('express');
const router = express.Router();
const { proxyRateLimiter } = require('../../middleware/rateLimiter');
const proxyAuth = require('../../middleware/proxyAuth');

router.use(proxyAuth);

// Get available proxies
router.get('/list', proxyRateLimiter, async (req, res) => {
  try {
    const proxies = await req.proxyService.getAvailableProxies();
    res.json({ success: true, proxies });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get proxy stats
router.get('/stats/:proxyId', proxyRateLimiter, async (req, res) => {
  try {
    const stats = await req.proxyService.getProxyStats(req.params.proxyId);
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rotate proxy
router.post('/rotate', proxyRateLimiter, async (req, res) => {
  try {
    const newProxy = await req.proxyService.rotateProxy(req.body.currentProxyId);
    res.json({ success: true, proxy: newProxy });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
