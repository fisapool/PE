import { db } from './firebase-config.js';

// Database service for ProxyEthica
const DatabaseService = {
  // Get user data
  async getUserData(userId) {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        return { success: false, message: "User not found" };
      }
      
      const userData = userDoc.data();
      
      return {
        success: true,
        userData: {
          id: userDoc.id,
          email: userData.email,
          credits: userData.credits,
          contributionStats: userData.contributionStats,
          proxyUsage: userData.proxyUsage
        }
      };
    } catch (error) {
      console.error("Error getting user data:", error);
      return { success: false, message: error.message };
    }
  },
  
  // Update user credits
  async updateCredits(userId, newCredits) {
    try {
      await db.collection('users').doc(userId).update({
        credits: newCredits
      });
      
      return { success: true, credits: newCredits };
    } catch (error) {
      console.error("Error updating credits:", error);
      return { success: false, message: error.message };
    }
  },
  
  // Record proxy contribution
  async recordProxyContribution(userId, bandwidthUsed, deviceId) {
    try {
      // Get user document
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        return { success: false, message: "User not found" };
      }
      
      const userData = userDoc.data();
      
      // Calculate earned credits (1 credit per 1MB)
      const earnedCredits = bandwidthUsed / (1024 * 1024);
      const newCredits = userData.credits + earnedCredits;
      
      // Update user document with transaction to prevent race conditions
      await db.runTransaction(async (transaction) => {
        // Update credits
        transaction.update(userRef, { credits: newCredits });
        
        // Update contribution stats
        transaction.update(userRef, {
          'contributionStats.totalBandwidth': firebase.firestore.FieldValue.increment(bandwidthUsed),
          'contributionStats.lastContribution': firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Add device to active devices if not already there
        if (!userData.contributionStats.activeDevices.includes(deviceId)) {
          transaction.update(userRef, {
            'contributionStats.activeDevices': firebase.firestore.FieldValue.arrayUnion(deviceId)
          });
        }
      });
      
      // Add to contribution history
      await db.collection('contributions').add({
        userId,
        deviceId,
        bandwidthUsed,
        earnedCredits,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      return {
        success: true,
        credits: newCredits,
        earnedCredits
      };
    } catch (error) {
      console.error("Error recording contribution:", error);
      return { success: false, message: error.message };
    }
  },
  
  // Get proxy from pool
  async getProxy(userId, country = null) {
    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        return { success: false, message: "User not found" };
      }
      
      const userData = userDoc.data();
      
      // Check if user has enough credits
      if (userData.credits < 10) {
        return { success: false, message: "Insufficient credits" };
      }
      
      // Get proxy from pool
      let proxyQuery = db.collection('proxyPool').where('available', '==', true);
      
      if (country) {
        proxyQuery = proxyQuery.where('country', '==', country);
      }
      
      const proxySnapshot = await proxyQuery.limit(1).get();
      
      if (proxySnapshot.empty) {
        return { success: false, message: "No proxies available" };
      }
      
      const proxyDoc = proxySnapshot.docs[0];
      const proxyData = proxyDoc.data();
      
      // Deduct credits
      const newCredits = userData.credits - 10;
      await userRef.update({
        credits: newCredits
      });
      
      // Mark proxy as used
      const sessionId = `sess_${Date.now()}_${userId.substring(0, 6)}`;
      await proxyDoc.ref.update({
        available: false,
        lastUsed: firebase.firestore.FieldValue.serverTimestamp(),
        currentSession: sessionId,
        currentUser: userId
      });
      
      // Record proxy usage
      await db.collection('proxyUsage').add({
        userId,
        proxyId: proxyDoc.id,
        sessionId,
        startTime: firebase.firestore.FieldValue.serverTimestamp(),
        country: proxyData.country,
        creditsUsed: 10
      });
      
      // Add to user's current proxies
      await userRef.update({
        'proxyUsage.currentProxies': firebase.firestore.FieldValue.arrayUnion({
          proxyId: proxyDoc.id,
          sessionId,
          startTime: firebase.firestore.FieldValue.serverTimestamp()
        })
      });
      
      // Return proxy info
      return {
        success: true,
        proxy: {
          host: proxyData.host,
          port: proxyData.port,
          username: proxyData.username,
          password: proxyData.password,
          country: proxyData.country,
          expiresIn: 3600
        },
        remainingCredits: newCredits,
        sessionId
      };
    } catch (error) {
      console.error("Error getting proxy:", error);
      return { success: false, message: error.message };
    }
  }
};

export default DatabaseService; 