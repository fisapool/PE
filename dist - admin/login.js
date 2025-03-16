// ProxyEthica Login JS
document.addEventListener('DOMContentLoaded', function() {
  console.log('Login page loaded');
  
  // Tab switching
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Update active tab button
      tabButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      // Show corresponding tab content
      const tabId = this.getAttribute('data-tab');
      tabContents.forEach(tab => tab.classList.remove('active'));
      document.getElementById(tabId + '-tab').classList.add('active');
    });
  });
  
  // Login form submission
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const errorMessage = document.getElementById('login-error');
      
      // Simple validation
      if (!email || !password) {
        errorMessage.textContent = 'Please enter both email and password';
        errorMessage.style.display = 'block';
        return;
      }
      
      // Demo login (would be an API call in production)
      if (email === 'demo@proxyethica.com' && password === 'password123') {
        // Store authentication status
        chrome.storage.local.set({
          isAuthenticated: true,
          user: {
            email: email,
            name: 'Demo User',
            joined: new Date().toISOString()
          }
        }, function() {
          // Redirect to dashboard
          window.location.href = 'about.html';
        });
      } else {
        // Show error for demo
        errorMessage.textContent = 'Invalid credentials. Try demo@proxyethica.com / password123';
        errorMessage.style.display = 'block';
      }
    });
  }
  
  // Sign-up form submission
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const name = document.getElementById('signup-name').value;
      const email = document.getElementById('signup-email').value;
      const password = document.getElementById('signup-password').value;
      const confirm = document.getElementById('signup-confirm').value;
      const errorMessage = document.getElementById('signup-error');
      
      // Simple validation
      if (!name || !email || !password) {
        errorMessage.textContent = 'Please fill in all required fields';
        errorMessage.style.display = 'block';
        return;
      }
      
      if (password !== confirm) {
        errorMessage.textContent = 'Passwords do not match';
        errorMessage.style.display = 'block';
        return;
      }
      
      if (password.length < 8) {
        errorMessage.textContent = 'Password must be at least 8 characters';
        errorMessage.style.display = 'block';
        return;
      }
      
      // Demo signup (would be an API call in production)
      chrome.storage.local.set({
        isAuthenticated: true,
        user: {
          name: name,
          email: email,
          joined: new Date().toISOString()
        }
      }, function() {
        // Redirect to dashboard
        window.location.href = 'about.html';
      });
    });
  }
  
  // Skip login button
  const skipLoginBtn = document.getElementById('skip-login');
  if (skipLoginBtn) {
    skipLoginBtn.addEventListener('click', function() {
      chrome.storage.local.set({
        isAuthenticated: false,
        skipLogin: true
      }, function() {
        // Redirect to dashboard
        window.location.href = 'about.html';
      });
    });
  }
  
  // Forgot password link
  const forgotPasswordLink = document.getElementById('forgot-password');
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', function(e) {
      e.preventDefault();
      alert('Password reset functionality would be implemented here in production.');
    });
  }
  
  // Check if user is already authenticated
  chrome.storage.local.get(['isAuthenticated', 'skipLogin'], function(result) {
    if (result.isAuthenticated || result.skipLogin) {
      // Already authenticated or skipped, redirect to dashboard
      window.location.href = 'about.html';
    }
  });
}); 