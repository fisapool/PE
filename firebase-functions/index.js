const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const firestore = admin.firestore();
const auth = admin.auth();

// Create user record when user registers
exports.createUserRecord = functions.auth.user().onCreate(async (user) => {
  try {
    // Create user document in Firestore
    await firestore.collection('users').doc(user.uid).set({
      email: user.email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
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
    
    // Generate API key
    const apiKey = generateApiKey(user.uid);
    await firestore.collection('apiKeys').doc(user.uid).set({
      key: apiKey,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error creating user record:", error);
    return { success: false, error: error.message };
  }
});

// Authenticate with API key
exports.authenticateApiKey = functions.https.onCall(async (data, context) => {
  try {
    const { apiKey } = data;
    
    if (!apiKey) {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'API key is required'
      );
    }
    
    // Extract user ID from API key
    const userIdPart = apiKey.split('_')[1];
    
    // Query API keys collection
    const apiKeySnapshot = await firestore
      .collection('apiKeys')
      .where('key', '==', apiKey)
      .limit(1)
      .get();
    
    if (apiKeySnapshot.empty) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Invalid API key'
      );
    }
    
    const apiKeyDoc = apiKeySnapshot.docs[0];
    const userId = apiKeyDoc.id;
    
    // Get user data
    const userDoc = await firestore.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'User not found'
      );
    }
    
    const userData = userDoc.data();
    
    return {
      success: true,
      user: {
        id: userId,
        email: userData.email,
        credits: userData.credits
      }
    };
  } catch (error) {
    console.error("API key authentication error:", error);
    throw new functions.https.HttpsError(
      'internal',
      error.message
    );
  }
});

// Get user credits
exports.getUserCredits = functions.https.onCall(async (data, context) => {
  try {
    // Ensure user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication required'
      );
    }
    
    const userId = context.auth.uid;
    const userDoc = await firestore.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'User not found'
      );
    }
    
    const userData = userDoc.data();
    
    return {
      success: true,
      credits: userData.credits,
      contributionStats: userData.contributionStats || {}
    };
  } catch (error) {
    console.error("Get credits error:", error);
    throw new functions.https.HttpsError(
      'internal',
      error.message
    );
  }
});

// Record proxy contribution
exports.recordProxyContribution = functions.https.onCall(async (data, context) => {
  try {
    // Ensure user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication required'
      );
    }
    
    const userId = context.auth.uid;
    const { bandwidthUsed, deviceId } = data;
    
    if (!bandwidthUsed || !deviceId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields'
      );
    }
    
    // Get user document
    const userRef = firestore.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'User not found'
      );
    }
    
    const userData = userDoc.data();
    
    // Calculate earned credits (1 credit per 1MB)
    const earnedCredits = bandwidthUsed / (1024 * 1024);
    const newCredits = userData.credits + earnedCredits;
    
    // Update user document with transaction
    await firestore.runTransaction(async (transaction) => {
      // Update credits
      transaction.update(userRef, { credits: newCredits });
      
      // Update contribution stats
      transaction.update(userRef, {
        'contributionStats.totalBandwidth': admin.firestore.FieldValue.increment(bandwidthUsed),
        'contributionStats.lastContribution': admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Add device to active devices if not already there
      if (!userData.contributionStats.activeDevices.includes(deviceId)) {
        transaction.update(userRef, {
          'contributionStats.activeDevices': admin.firestore.FieldValue.arrayUnion(deviceId)
        });
      }
    });
    
    // Add to contribution history
    await firestore.collection('contributions').add({
      userId,
      deviceId,
      bandwidthUsed,
      earnedCredits,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      success: true,
      credits: newCredits,
      earnedCredits
    };
  } catch (error) {
    console.error("Record contribution error:", error);
    throw new functions.https.HttpsError(
      'internal',
      error.message
    );
  }
});

// Helper function to generate API key
function generateApiKey(userId) {
  const randomPart = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now().toString(36);
  return `pk_${userId.substring(0, 6)}_${randomPart}_${timestamp}`;
} 