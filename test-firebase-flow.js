// Import Firebase services
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Test functions
async function testAuthentication() {
  console.log("Testing Firebase Authentication...");
  
  const testEmail = "test@proxyethica.com";
  const testPassword = "TestPassword123";
  
  try {
    // Try to sign in
    try {
      await signInWithEmailAndPassword(auth, testEmail, testPassword);
      console.log("✅ Login successful");
    } catch (error) {
      // If user doesn't exist, create one
      if (error.code === 'auth/user-not-found') {
        console.log("Creating test user...");
        await createUserWithEmailAndPassword(auth, testEmail, testPassword);
        console.log("✅ User creation successful");
      } else {
        throw error;
      }
    }
    
    // Get current user
    const user = auth.currentUser;
    console.log(`Current user: ${user.email} (${user.uid})`);
    
    return true;
  } catch (error) {
    console.error("❌ Authentication test failed:", error);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log("Starting Firebase integration tests...");
  
  // Test authentication
  const authResult = await testAuthentication();
  
  // Add more tests for other functionality
  
  console.log("Tests completed.");
}

runTests(); 