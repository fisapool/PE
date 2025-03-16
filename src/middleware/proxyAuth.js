/**
 * Proxy Authentication Middleware
 * Validates JWT tokens for API requests
 * 
 * AI-generated code for the Residential Proxy Project
 */

const jwt = require('jsonwebtoken');

/**
 * Middleware to verify authentication tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const proxyAuth = (req, res, next) => {
  // Check for Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Missing or invalid authorization header'
    });
  }

  // Extract token
  const token = authHeader.substring(7);

  try {
    // Verify token
    const secret = process.env.JWT_SECRET || 'test-secret';
    const decoded = jwt.verify(token, secret);
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please obtain a new token'
      });
    }
    
    // Attach user info to request
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please obtain a new token'
      });
    }
    
    return res.status(401).json({
      error: 'Invalid token',
      message: 'The provided token is not valid'
    });
  }
};

module.exports = proxyAuth;
