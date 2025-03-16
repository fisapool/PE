// Add this at the very top
alert('ProxyEthica script loaded');

// Wait for the DOM to be fully loaded before attaching event listeners
document.addEventListener('DOMContentLoaded', function() {
  console.log('ProxyEthica popup initialized');
  
  // Get references to main UI elements
  const consentScreen = document.getElementById('consent-screen');
  const mainScreen = document.getElementById('main-screen');
  const optInBtn = document.getElementById('opt-in-btn');
  const learnMoreBtn = document.getElementById('learn-more-btn');
  const toggleProxyBtn = document.getElementById('toggle-proxy');
  const statusText = document.getElementById('status-text');
  const statusDot = document.getElementById('status-dot');
  
  // Initialize Firebase (safely)
  try {
    // Firebase initialization would go here
    // For now, we'll just log that we would initialize Firebase
    console.log('Firebase would be initialized here');
    
    // Check if user has already opted in
    chrome.storage.local.get(['optedIn'], function(result) {
      if (result.optedIn) {
        showMainScreen();
      }
    });
  } catch (error) {
    console.error("Firebase initialization error:", error);
    // Show error in UI
    if (statusText) {
      statusText.textContent = 'Error: Firebase connection failed';
      statusText.style.color = 'red';
    }
  }
  
  // Handle Opt In button click
  if (optInBtn) {
    optInBtn.addEventListener('click', function() {
      console.log('Opt In clicked');
      // Save opt-in status
      chrome.storage.local.set({optedIn: true}, function() {
        showMainScreen();
      });
    });
  }
  
  // Handle Learn More button click
  if (learnMoreBtn) {
    learnMoreBtn.addEventListener('click', function() {
      console.log('Learn More clicked');
      chrome.tabs.create({url: 'about.html'});
    });
  }
  
  // Handle Toggle Proxy button click
  if (toggleProxyBtn) {
    toggleProxyBtn.addEventListener('click', function() {
      console.log('Toggle Proxy clicked');
      const isContributing = toggleProxyBtn.textContent === 'Stop Contributing';
      
      if (isContributing) {
        // Stop contributing
        toggleProxyBtn.textContent = 'Start Contributing';
        statusText.textContent = 'Disconnected';
        statusDot.style.backgroundColor = '#ff3b30';
      } else {
        // Start contributing
        toggleProxyBtn.textContent = 'Stop Contributing';
        statusText.textContent = 'Connected';
        statusDot.style.backgroundColor = '#34c759';
      }
      
      // Send message to background script
      chrome.runtime.sendMessage({
        action: isContributing ? 'stopProxy' : 'startProxy'
      });
    });
  }
  
  // Setup other button handlers
  setupAdditionalEventListeners();
  
  // Function to show the main screen
  function showMainScreen() {
    if (consentScreen && mainScreen) {
      consentScreen.classList.add('hidden');
      mainScreen.classList.remove('hidden');
    }
  }
  
  // Function to set up additional event listeners
  function setupAdditionalEventListeners() {
    // Login button
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', function() {
        const email = document.getElementById('email-input').value;
        const password = document.getElementById('password-input').value;
        console.log('Login attempted with:', email);
        // Implement actual login logic here
      });
    }
    
    // Sign up button
    const signupBtn = document.getElementById('signup-btn');
    if (signupBtn) {
      signupBtn.addEventListener('click', function() {
        console.log('Signup clicked');
        chrome.tabs.create({url: 'signup.html'});
      });
    }
    
    // Proxy management buttons
    const getProxyBtn = document.getElementById('get-proxy-btn');
    if (getProxyBtn) {
      getProxyBtn.addEventListener('click', function() {
        console.log('Get Proxy clicked');
        document.getElementById('current-proxy').textContent = '123.45.67.89:8080';
        document.getElementById('proxy-status').textContent = 'Active';
      });
    }
    
    const rotateProxyBtn = document.getElementById('rotate-proxy-btn');
    if (rotateProxyBtn) {
      rotateProxyBtn.addEventListener('click', function() {
        console.log('Rotate Proxy clicked');
        document.getElementById('current-proxy').textContent = '98.76.54.32:8080';
      });
    }
    
    // Opt Out button
    const optOutBtn = document.getElementById('opt-out-btn');
    if (optOutBtn) {
      optOutBtn.addEventListener('click', function() {
        console.log('Opt Out clicked');
        chrome.storage.local.set({optedIn: false}, function() {
          if (consentScreen && mainScreen) {
            mainScreen.classList.add('hidden');
            consentScreen.classList.remove('hidden');
          }
        });
      });
    }
  }
}); 