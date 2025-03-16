import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc 
} from 'firebase/firestore';
import { app } from './firebase-config.js';

const auth = getAuth(app);
const db = getFirestore(app);

// User authentication
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { 
      success: true, 
      user: userCredential.user 
    };
  } catch (error) {
    console.error("Login error:", error);
    return { 
      success: false, 
      message: error.message 
    };
  }
}

// Other auth functions
export async function registerUser(email, password) {
  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create initial user document in Firestore
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      email: user.email,
      createdAt: new Date().toISOString(),
      credits: 100, // Starting credits
      contribution: {
        totalBandwidth: 0,
        lastContribution: null
      }
    });
    
    // Generate API key and store it separately for security
    const apiKey = generateSecureApiKey();
    const apiKeyRef = doc(db, "apiKeys", user.uid);
    await setDoc(apiKeyRef, {
      key: apiKey,
      createdAt: new Date().toISOString()
    });
    
    return {
      success: true,
      userId: user.uid,
      email: user.email
    };
  } catch (error) {
    console.error("Registration error:", error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Helper function to generate a secure API key
function generateSecureApiKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = '';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

export async function logoutUser() {
  // Implementation
}

export function getCurrentUser() {
  return auth.currentUser;
}

export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, callback);
} 