/**
 * ProxyEthica Network - Background script
 * Simplified version with built-in SDK
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';

// Import utility functions only (not the core Firebase objects)
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from './node_modules/firebase/auth/dist/index.esm.js';
import { collection, doc, getDoc, setDoc, addDoc, updateDoc } from './node_modules/firebase/firestore/dist/index.esm.js';

// Import your Firebase config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "proxyethica.firebaseapp.com",
  projectId: "proxyethica"
  // ...other config properties
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log("ProxyEthica background script loaded");

// Add at the top of your background.js

console.log("Testing Firebase imports...");
try {
  // Check if Firebase objects exist
  if (typeof firebase !== 'undefined' && 
      typeof firebase.auth !== 'undefined' && 
      typeof firebase.firestore !== 'undefined') {
    console.log("Firebase successfully imported!");
  } else {
    console.error("Firebase not properly imported. Missing objects:", {
      firebase: typeof firebase,
      auth: typeof firebase?.auth,
      firestore: typeof firebase?.firestore
    });
  }
} catch (error) {
  console.error("Error testing Firebase imports:", error);
}

// Simple state management
const connectionStatus = {
  isContributing: false,
  startTime: null,
  bandwidthUsed: 0
};

// User account management
const userAccount = {
  userId: null,
  apiKey: null,
  email: null,
  contributionCredits: 0,
  isLoggedIn: false
};

// Load stored data at startup
chrome.storage.local.get(['proxyConsent'], function(result) {
  console.log('Loaded stored consent state:', result.proxyConsent);
  // If this is needed for initialization, use it here
});

// Load connection state when service worker starts
chrome.storage.local.get(['userData', 'proxyConnection'], function(result) {
  console.log('Loading stored user data');
  if (result.userData) {
    userAccount.userId = result.userData.userId || null;
    userAccount.apiKey = result.userData.apiKey || null;
    userAccount.email = result.userData.email || null;
    userAccount.contributionCredits = result.userData.contributionCredits || 0;
    userAccount.isLoggedIn = result.userData.isLoggedIn || false;
    
    // Initialize Firebase auth state
    if (userAccount.isLoggedIn) {
      auth.onAuthStateChanged((user) => {
        if (!user) {
          // If Firebase says user is logged out but we think they're logged in
          // Try to restore session
          auth.signInWithCustomToken(userAccount.apiKey)
            .catch((error) => {
              // If restoring fails, reset local login state
              logoutUser();
            });
        }
      });
    }
  }
  
  // Restore connection state if available
  if (result.proxyConnection) {
    console.log('Restoring connection state:', result.proxyConnection);
    connectionStatus.isContributing = result.proxyConnection.isContributing;
    connectionStatus.startTime = result.proxyConnection.startTime;
    connectionStatus.bandwidthUsed = result.proxyConnection.bandwidthUsed || 0;
    
    // Restart bandwidth tracking if needed
    if (connectionStatus.isContributing) {
      restartBandwidthTracking();
    }
  }
});

// Generate a device ID when needed
function generateDeviceId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Get or create device ID
async function getDeviceId() {
  try {
    const data = await chrome.storage.local.get('proxyDeviceId');
    if (data.proxyDeviceId) {
      return data.proxyDeviceId;
    } else {
      const newId = generateDeviceId();
      await chrome.storage.local.set({ proxyDeviceId: newId });
      return newId;
    }
  } catch (error) {
    console.error("Error getting device ID:", error);
    return generateDeviceId(); // Fallback
  }
}

// Show a notification
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title,
    message
  });
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Received message:", message);
  
  try {
    switch(message.action) {
      case 'getStatus':
        sendResponse({
          success: true,
          isContributing: connectionStatus.isContributing,
          connectionStats: {
            startTime: connectionStatus.startTime,
            bandwidthUsed: connectionStatus.bandwidthUsed
          }
        });
        break;
        
      case 'startProxy':
        connectionStatus.isContributing = true;
        connectionStatus.startTime = Date.now();
        
        // Store connection state in persistent storage
        chrome.storage.local.set({
          proxyConnection: {
            isContributing: true,
            startTime: Date.now(),
            bandwidthUsed: connectionStatus.bandwidthUsed
          }
        });
        
        console.log('Proxy started at:', {
          startTime: connectionStatus.startTime,
          formattedTime: new Date(connectionStatus.startTime).toISOString()
        });
        
        // Simulate some bandwidth usage over time
        if (connectionStatus.bandwidthInterval) {
          clearInterval(connectionStatus.bandwidthInterval);
        }
        
        connectionStatus.bandwidthInterval = setInterval(() => {
          if (connectionStatus.isContributing) {
            // Add 10-50 KB every second to simulate traffic
            const newBandwidth = Math.floor(Math.random() * 40000) + 10000;
            connectionStatus.bandwidthUsed += newBandwidth;
            
            // Calculate earned credits (for example, 1 credit per 1MB)
            const earnedCredits = newBandwidth / (1024 * 1024);
            userAccount.contributionCredits += earnedCredits;
            
            // Store updated bandwidth and user data
            updateStoredConnectionState();
            updateStoredUserData();
          }
        }, 1000);
        
        sendResponse({
          success: true,
          message: "Proxy started"
        });
        
        // Show notification
        showNotification('ProxyEthica', 'You are now contributing to the proxy network');
        break;
        
      case 'stopProxy':
        connectionStatus.isContributing = false;
        
        if (connectionStatus.bandwidthInterval) {
          clearInterval(connectionStatus.bandwidthInterval);
          connectionStatus.bandwidthInterval = null;
        }
        
        sendResponse({
          success: true, 
          message: "Proxy stopped"
        });
        
        // Show notification
        showNotification('ProxyEthica', 'Contribution to the proxy network has stopped');
        break;
        
      case 'updateConsent':
        // Store consent in local storage
        chrome.storage.local.set({
          proxyConsent: message.consent
        });
        
        sendResponse({
          success: true,
          message: message.consent ? "Consent granted" : "Consent revoked"
        });
        break;
        
      case 'saveSettings':
        // Store settings
        chrome.storage.local.set({
          proxySettings: message.settings
        });
        
        sendResponse({
          success: true,
          message: "Settings saved"
        });
        break;
        
      case 'getDeviceId':
        getDeviceId().then(deviceId => {
          sendResponse({ success: true, deviceId });
        });
        return true; // Keep connection open for async response
        
      case 'login':
        authenticateUser(message.email, message.password).then(result => {
          sendResponse(result);
        });
        return true;
        
      case 'getCredits':
        getCreditsBalance().then(result => {
          sendResponse(result);
        });
        return true;
        
      case 'checkLoginStatus':
        sendResponse({
          success: true,
          isLoggedIn: userAccount.isLoggedIn,
          email: userAccount.email,
          credits: userAccount.contributionCredits
        });
        break;
        
      case 'getProxy':
        proxyManager.getNewProxy(message.country, message.session).then(result => {
          sendResponse(result);
        });
        return true;
        
      case 'applyProxy':
        proxyManager.applyProxy(message.proxy).then(result => {
          sendResponse(result);
        });
        return true;
        
      case 'rotateProxy':
        proxyManager.rotateProxy().then(result => {
          sendResponse(result);
        });
        return true;
        
      case 'startAutoRotation':
        sendResponse(proxyManager.startAutoRotation(message.intervalMinutes || 10));
        break;
        
      case 'stopAutoRotation':
        sendResponse(proxyManager.stopAutoRotation());
        break;
        
      case 'clearProxy':
        proxyManager.clearProxySettings().then(result => {
          sendResponse(result);
        });
        return true;
        
      case 'logout':
        logoutUser().then(result => {
          sendResponse(result);
        }).catch(error => {
          sendResponse({ success: false, message: error.message });
        });
        return true; // Important: return true to indicate async response
        
      case 'createProxySession':
        createProxySession(message.proxyDetails).then(result => {
          sendResponse(result);
        });
        return true;
        
      case 'closeProxySession':
        closeProxySession().then(result => {
          sendResponse(result);
        });
        return true;
        
      default:
        sendResponse({
          success: true,
          message: "Extension is active but unknown action: " + message.action
        });
    }
  } catch (error) {
    console.error("Error handling message:", error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
  
  return true; // Keep connection open for async responses
});

// Show welcome notification on install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    showNotification(
      'ProxyEthica Installed',
      'Thank you for installing ProxyEthica Network. Click the extension icon to get started.'
    );
    
    // Initialize device ID
    getDeviceId().then(id => {
      console.log("Device ID initialized:", id);
    });
  }
});

// Register or login user
async function authenticateUser(email, password) {
  try {
    // Sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Get user data from Firestore
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.exists() ? userDoc.data() : {};
    
    // Get API key from separate collection for security
    const apiKeyDocRef = doc(db, "apiKeys", user.uid);
    const apiKeyDoc = await getDoc(apiKeyDocRef);
    const apiKey = apiKeyDoc.exists() ? apiKeyDoc.data().key : null;
    
    // Update memory state
    userAccount.userId = user.uid;
    userAccount.apiKey = apiKey;
    userAccount.email = user.email;
    userAccount.contributionCredits = userData.credits || 0;
    userAccount.isLoggedIn = true;
    
    // Store in persistent storage
    await updateStoredUserData();
    
    // Return success
    return {
      success: true,
      userId: user.uid,
      email: user.email,
      credits: userData.credits || 0
    };
  } catch (error) {
    console.error("Authentication error:", error);
    
    return {
      success: false,
      message: error.message
    };
  }
}

// Get available proxy credits
async function getCreditsBalance() {
  if (!userAccount.isLoggedIn) {
    return { success: false, message: "Not logged in" };
  }
  
  try {
    const response = await fetch('https://api.proxyethica.com/account/credits', {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${userAccount.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      userAccount.contributionCredits = data.credits;
      return { 
        success: true, 
        credits: data.credits,
        contributionStats: data.contributionStats || {}
      };
    } else {
      return { success: false, message: data.message };
    }
  } catch (error) {
    console.error("Error fetching credits:", error);
    return { success: false, message: "Connection error" };
  }
}

// Proxy management
const proxyManager = {
  currentProxy: null,
  proxyPool: [],
  rotationInterval: null,
  currentSessionId: null,
  
  // Get a new proxy from the server
  async getNewProxy(country = null, session = false) {
    if (!userAccount.isLoggedIn) {
      return { success: false, message: "Authentication required" };
    }
    
    try {
      // For development, use a simulated response
      // In production, replace with actual API call
      
      // Simulate API response for development
      const simulatedProxy = {
        host: '45.67.89.' + Math.floor(Math.random() * 255),
        port: 8000 + Math.floor(Math.random() * 1000),
        username: 'proxy_user',
        password: 'proxy_pass',
        country: country || 'US',
        expiresIn: 3600
      };
      
      const data = {
        success: true,
        proxy: simulatedProxy,
        remainingCredits: userAccount.contributionCredits - 10,
        sessionId: 'sess_' + Date.now()
      };
      
      /*
      // Real API call for production
      const response = await fetch('https://api.proxyethica.com/proxy/get', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userAccount.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          country,
          session,
          deviceId: await getDeviceId()
        })
      });
      
      const data = await response.json();
      */
      
      if (data.success) {
        // Deduct credits
        userAccount.contributionCredits = data.remainingCredits;
        
        // Add to proxy pool
        this.proxyPool.push({
          ...data.proxy,
          obtainedAt: Date.now(),
          sessionId: data.sessionId
        });
        
        // Set as current if we don't have one
        if (!this.currentProxy) {
          this.currentProxy = this.proxyPool[this.proxyPool.length - 1];
        }
        
        return { 
          success: true, 
          proxy: data.proxy,
          remainingCredits: data.remainingCredits
        };
      } else {
        return { 
          success: false, 
          message: data.message || "Failed to get proxy" 
        };
      }
    } catch (error) {
      console.error("Error getting proxy:", error);
      return { success: false, message: "Connection error" };
    }
  },
  
  // Apply proxy settings to Chrome
  async applyProxy(proxy = null) {
    const proxyToApply = proxy || this.currentProxy;
    
    if (!proxyToApply) {
      return { success: false, message: "No proxy available" };
    }
    
    try {
      // For Manifest V3, we need to use the chrome.proxy API without blocking
      // Store proxy auth credentials in local storage for the authentication handler
      await chrome.storage.local.set({
        proxyAuth: {
          host: proxyToApply.host,
          username: proxyToApply.username,
          password: proxyToApply.password
        }
      });
      
      // Configure proxy settings
      const config = {
        mode: "fixed_servers",
        rules: {
          singleProxy: {
            scheme: "http",
            host: proxyToApply.host,
            port: parseInt(proxyToApply.port)
          },
          bypassList: ["localhost", "127.0.0.1"]
        }
      };
      
      await chrome.proxy.settings.set({
        value: config,
        scope: 'regular'
      });
      
      // Update current proxy
      this.currentProxy = proxyToApply;
      
      return { 
        success: true, 
        message: "Proxy applied successfully",
        proxy: proxyToApply
      };
    } catch (error) {
      console.error("Error applying proxy:", error);
      return { success: false, message: "Failed to apply proxy settings" };
    }
  },
  
  // Rotate to a new proxy
  async rotateProxy() {
    if (this.proxyPool.length <= 1) {
      // Get a new proxy if we don't have alternatives
      const result = await this.getNewProxy();
      if (!result.success) {
        return result;
      }
    }
    
    // Find current index
    const currentIndex = this.proxyPool.findIndex(p => 
      p.host === this.currentProxy.host && p.port === this.currentProxy.port
    );
    
    // Get next proxy in pool (circular)
    const nextIndex = (currentIndex + 1) % this.proxyPool.length;
    this.currentProxy = this.proxyPool[nextIndex];
    
    // Apply the new proxy
    return this.applyProxy();
  },
  
  // Start automatic proxy rotation
  startAutoRotation(intervalMinutes = 10) {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
    }
    
    this.rotationInterval = setInterval(() => {
      this.rotateProxy().catch(error => {
        console.error("Auto-rotation error:", error);
      });
    }, intervalMinutes * 60 * 1000);
    
    return { 
      success: true, 
      message: `Auto-rotation started (${intervalMinutes} min interval)` 
    };
  },
  
  // Stop automatic rotation
  stopAutoRotation() {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
      this.rotationInterval = null;
      return { success: true, message: "Auto-rotation stopped" };
    }
    return { success: false, message: "Auto-rotation was not active" };
  },
  
  // Clear all proxy settings
  async clearProxySettings() {
    try {
      await chrome.proxy.settings.clear({ scope: 'regular' });
      
      // Clear stored auth
      await chrome.storage.local.remove('proxyAuth');
      
      this.currentProxy = null;
      
      return { success: true, message: "Proxy settings cleared" };
    } catch (error) {
      console.error("Error clearing proxy:", error);
      return { success: false, message: "Failed to clear proxy settings" };
    }
  }
};

// Helper function to restart bandwidth tracking
function restartBandwidthTracking() {
  if (connectionStatus.bandwidthInterval) {
    clearInterval(connectionStatus.bandwidthInterval);
  }
  
  connectionStatus.bandwidthInterval = setInterval(() => {
    if (connectionStatus.isContributing) {
      // Add 10-50 KB every second to simulate traffic
      const newBandwidth = Math.floor(Math.random() * 40000) + 10000;
      connectionStatus.bandwidthUsed += newBandwidth;
      
      // Calculate earned credits (for example, 1 credit per 1MB)
      const earnedCredits = newBandwidth / (1024 * 1024);
      userAccount.contributionCredits += earnedCredits;
      
      // Store updated bandwidth and user data
      updateStoredConnectionState();
      updateStoredUserData();
    }
  }, 1000);
}

// Helper function to update stored connection state
function updateStoredConnectionState() {
  chrome.storage.local.set({
    proxyConnection: {
      isContributing: connectionStatus.isContributing,
      startTime: connectionStatus.startTime,
      bandwidthUsed: connectionStatus.bandwidthUsed
    }
  });
}

// Helper function to update stored user data
function updateStoredUserData() {
  chrome.storage.local.set({
    userData: {
      userId: userAccount.userId,
      apiKey: userAccount.apiKey,
      email: userAccount.email,
      contributionCredits: userAccount.contributionCredits,
      isLoggedIn: userAccount.isLoggedIn,
      lastUpdated: Date.now()
    }
  });
}

// Add or update the logout function in background.js
async function logoutUser() {
  try {
    // Sign out from Firebase Auth
    await signOut(auth);
    
    // Reset user account data
    userAccount.userId = null;
    userAccount.apiKey = null;
    userAccount.email = null;
    userAccount.contributionCredits = 0;
    userAccount.isLoggedIn = false;
    
    // Update stored user data
    await chrome.storage.local.set({
      userData: {
        userId: null,
        apiKey: null,
        email: null,
        contributionCredits: 0,
        isLoggedIn: false,
        lastUpdated: Date.now()
      }
    });
    
    // Also clear any active proxy connections
    if (connectionStatus.isContributing) {
      await stopContribution();
    }
    
    return { success: true, message: "Logout successful" };
  } catch (error) {
    console.error("Error during logout:", error);
    return { success: false, message: error.message };
  }
}

// Test Firebase connection
async function testFirebaseConnection() {
  try {
    // Try to access Firestore
    const testDocRef = doc(db, "system", "connectionTest");
    await setDoc(testDocRef, {
      timestamp: new Date().toISOString(),
      connected: true
    });
    
    console.log('Firebase connection successful!');
    return true;
  } catch (error) {
    console.error('Firebase connection failed:', error);
    return false;
  }
}

// Call the test function when background script loads
testFirebaseConnection();

// Add to background.js
async function recordBandwidthContribution() {
  if (!userAccount.isLoggedIn || connectionStatus.bandwidthUsed <= 0) {
    return false;
  }
  
  try {
    const timestamp = new Date().toISOString();
    const userId = userAccount.userId;
    const bandwidthUsed = connectionStatus.bandwidthUsed;
    
    // Calculate credits (1 credit per MB)
    const mbContributed = bandwidthUsed / (1024 * 1024);
    const earnedCredits = Math.floor(mbContributed);
    
    // Add contribution record
    const contributionRef = collection(db, "contributions");
    await addDoc(contributionRef, {
      userId: userId,
      timestamp: timestamp,
      bandwidthBytes: bandwidthUsed,
      creditsEarned: earnedCredits
    });
    
    // Update user document
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const currentCredits = userData.credits || 0;
      const currentBandwidth = userData.contribution?.totalBandwidth || 0;
      
      await updateDoc(userRef, {
        credits: currentCredits + earnedCredits,
        contribution: {
          totalBandwidth: currentBandwidth + bandwidthUsed,
          lastContribution: timestamp
        }
      });
      
      // Update local state
      userAccount.contributionCredits += earnedCredits;
      connectionStatus.bandwidthUsed = 0;
      
      // Update stored data
      updateStoredUserData();
      updateStoredConnectionState();
      
      return {
        success: true,
        creditsEarned: earnedCredits,
        totalCredits: currentCredits + earnedCredits
      };
    }
    
    return { success: false, message: "User document not found" };
  } catch (error) {
    console.error("Error recording contribution:", error);
    return { success: false, message: error.message };
  }
}

// Add to background.js
async function createProxySession(proxyDetails) {
  if (!userAccount.isLoggedIn) {
    return { success: false, message: "Not logged in" };
  }
  
  try {
    const timestamp = new Date().toISOString();
    const userId = userAccount.userId;
    
    // Create a new proxy session document
    const sessionData = {
      userId: userId,
      ip: proxyDetails.ip,
      port: proxyDetails.port,
      country: proxyDetails.country || 'Unknown',
      createdAt: timestamp,
      active: true,
      lastUsed: timestamp
    };
    
    // Add to Firestore
    const sessionRef = collection(db, "proxySessions");
    const docRef = await addDoc(sessionRef, sessionData);
    
    // Store session ID locally
    proxyManager.currentSessionId = docRef.id;
    
    // Update local management
    proxyManager.currentProxy = proxyDetails;
    
    return { 
      success: true, 
      sessionId: docRef.id,
      proxyDetails
    };
  } catch (error) {
    console.error("Error creating proxy session:", error);
    return { success: false, message: error.message };
  }
}

// Add to background.js
async function closeProxySession() {
  if (!proxyManager.currentSessionId) {
    return { success: true, message: "No active session" };
  }
  
  try {
    // Update the session in Firestore
    const sessionRef = doc(db, "proxySessions", proxyManager.currentSessionId);
    await updateDoc(sessionRef, {
      active: false,
      closedAt: new Date().toISOString()
    });
    
    // Clear local references
    proxyManager.currentSessionId = null;
    proxyManager.currentProxy = null;
    
    return { success: true };
  } catch (error) {
    console.error("Error closing proxy session:", error);
    return { success: false, message: error.message };
  }
} 