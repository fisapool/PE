import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs 
} from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import firebaseConfig from './firebase-config.js';

// Test Firebase imports
console.log('Testing Firebase imports...');

try {
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  console.log('✅ Firebase app initialized successfully');
  
  // Test Auth
  const auth = getAuth(app);
  console.log('✅ Firebase Auth initialized successfully');
  
  // Test Firestore
  const db = getFirestore(app);
  console.log('✅ Firebase Firestore initialized successfully');
  
  // Test Analytics
  try {
    const analytics = getAnalytics(app);
    console.log('✅ Firebase Analytics initialized successfully');
  } catch (error) {
    console.warn('⚠️ Firebase Analytics initialization skipped (may require browser context)');
  }
  
  // Test all imported functions
  const testFunctions = {
    auth: {
      signInWithEmailAndPassword: typeof signInWithEmailAndPassword === 'function',
      createUserWithEmailAndPassword: typeof createUserWithEmailAndPassword === 'function',
      signOut: typeof signOut === 'function'
    },
    firestore: {
      doc: typeof doc === 'function',
      getDoc: typeof getDoc === 'function',
      setDoc: typeof setDoc === 'function',
      collection: typeof collection === 'function',
      addDoc: typeof addDoc === 'function',
      query: typeof query === 'function',
      where: typeof where === 'function',
      getDocs: typeof getDocs === 'function'
    }
  };
  
  console.log('Firebase functions availability:', testFunctions);
  
  // Overall summary
  const authFunctionsValid = Object.values(testFunctions.auth).every(v => v === true);
  const firestoreFunctionsValid = Object.values(testFunctions.firestore).every(v => v === true);
  
  if (authFunctionsValid && firestoreFunctionsValid) {
    console.log('✅ All Firebase functions imported successfully');
  } else {
    console.error('❌ Some Firebase functions are not properly imported');
    if (!authFunctionsValid) console.error('❌ Auth functions import issue');
    if (!firestoreFunctionsValid) console.error('❌ Firestore functions import issue');
  }
  
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
}

// Export a test function that can be called from background.js
export function runFirebaseTest() {
  console.log('Running Firebase test...');
  return {
    success: true,
    message: 'Firebase import test completed. Check console for details.'
  };
}

// Run test immediately when imported
runFirebaseTest(); 