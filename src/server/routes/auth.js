const express = require('express');
const router = express.Router();
const { validateEmail, validatePassword } = require('../../utils/validation');
const { handleProxyError } = require('../../utils/errorHandler');

// User signup endpoint
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Email and password are required'
      });
    }
    
    if (!validateEmail(email)) {
      return res.status(400).json({ 
        error: 'Invalid email',
        message: 'Please provide a valid email address'
      });
    }
    
    if (!validatePassword(password)) {
      return res.status(400).json({ 
        error: 'Invalid password',
        message: 'Password must be at least 8 characters with letters and numbers'
      });
    }
    
    // Create user account
    // Replace with your actual user creation logic
    const user = await createUser(email, password);
    
    // Return success response without sensitive data
    res.status(201).json({
      message: 'Account created successfully',
      userId: user.id
    });
  } catch (error) {
    const handledError = handleProxyError(error);
    
    // Send appropriate error response
    res.status(handledError.status || 500).json({
      error: handledError.type || 'server_error',
      message: handledError.message || 'An unexpected error occurred'
    });
  }
});

// Helper function to create a user
async function createUser(email, password) {
  // Replace with your actual implementation (database storage, etc.)
  // This is just a placeholder
  return {
    id: `user_${Date.now()}`,
    email,
    createdAt: new Date()
  };
}

module.exports = router; 