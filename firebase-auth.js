import { auth, db } from './firebase-config.js';

// Authentication service for ProxyEthica
const AuthService = {
  // Register a new user
  async registerUser(email, password) {
    try {
      // Create user in Firebase Auth
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      // Create user document in Firestore
      await db.collection('users').doc(user.uid).set({
        email: user.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        credits: 100, // Starting credits for new users
        contributionStats: {
          totalBandwidth: 0,
          lastContribution: null,
          activeDevices: []
        },
        proxyUsage: {
          currentProxies: [],
          usageHistory: []
        }
      });
      
      // Generate and store API key
      const apiKey = generateApiKey(user.uid);
      await db.collection('apiKeys').doc(user.uid).set({
        key: apiKey,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      return {
        success: true,
        user: {
          id: user.uid,
          email: user.email,
          apiKey: apiKey,
          credits: 100
        }
      };
    } catch (error) {
      console.error("Registration error:", error);
      return {
        success: false,
        message: error.message
      };
    }
  },
  
  // Login existing user
  async loginUser(email, password) {
    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      // Get user data from Firestore
      const userDoc = await db.collection('users').doc(user.uid).get();
      const userData = userDoc.data();
      
      // Get API key
      const apiKeyDoc = await db.collection('apiKeys').doc(user.uid).get();
      const apiKey = apiKeyDoc.exists ? apiKeyDoc.data().key : null;
      
      // If no API key exists, create one
      const finalApiKey = apiKey || await this.regenerateApiKey(user.uid);
      
      return {
        success: true,
        user: {
          id: user.uid,
          email: user.email,
          apiKey: finalApiKey,
          credits: userData.credits,
          contributionStats: userData.contributionStats
        }
      };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: error.message
      };
    }
  },
  
  // Logout current user
  async logoutUser() {
    try {
      await auth.signOut();
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      return {
        success: false,
        message: error.message
      };
    }
  },
  
  // Check if user is logged in
  async getCurrentUser() {
    return new Promise((resolve) => {
      // Firebase Auth state observer
      const unsubscribe = auth.onAuthStateChanged(user => {
        unsubscribe();
        if (user) {
          resolve({
            success: true,
            isLoggedIn: true,
            userId: user.uid,
            email: user.email
          });
        } else {
          resolve({
            success: true,
            isLoggedIn: false
          });
        }
      });
    });
  },
  
  // Generate new API key for user
  async regenerateApiKey(userId) {
    const apiKey = generateApiKey(userId);
    await db.collection('apiKeys').doc(userId).set({
      key: apiKey,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return apiKey;
  }
};

// Helper function to generate API key
function generateApiKey(userId) {
  // Create a unique API key using userId and random string
  const randomPart = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now().toString(36);
  return `pk_${userId.substring(0, 6)}_${randomPart}_${timestamp}`;
}

export default AuthService; 