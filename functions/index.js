const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// Hello world function to test deployment
exports.helloWorld = functions.https.onCall((data, context) => {
  return {
    message: "Hello from ProxyEthica Firebase Functions!"
  };
});

// More functions will be added later 

// Validate proxy requests with server-side validation
exports.validateProxyRequest = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to request a proxy'
    );
  }
  
  const userId = context.auth.uid;
  
  try {
    // Check if user has enough credits
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }
    
    const userData = userDoc.data();
    const currentCredits = userData.credits || 0;
    const requiredCredits = data.requestType === 'premium' ? 5 : 1;
    
    if (currentCredits < requiredCredits) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Insufficient credits'
      );
    }
    
    // Process the request
    // ... (implementation details)
    
    // Deduct credits
    await userRef.update({
      credits: currentCredits - requiredCredits
    });
    
    // Return proxy credentials
    return {
      success: true,
      proxy: {
        ip: '123.45.67.89', // This would be a real proxy from your pool
        port: 8080,
        username: 'proxyethica_' + userId.substring(0, 8),
        password: generatePassword(),
        expiresAt: Date.now() + 3600000 // 1 hour from now
      }
    };
  } catch (error) {
    console.error('Error in validateProxyRequest:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Helper function to generate a secure password
function generatePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
} 