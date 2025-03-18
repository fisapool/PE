import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

// Firebase configuration for ProxyEthica
const firebaseConfig = {
  apiKey: "AIzaSyATMS402xUExbNHEYAsdzDIwgbL2Ee11RM",
  authDomain: "proxyethica.firebaseapp.com",
  projectId: "proxyethica",
  storageBucket: "proxyethica.firebasestorage.app",
  messagingSenderId: "930281875475",
  appId: "1:930281875475:web:2f4c4c8cdfcce0d81e37e6",
  measurementId: "G-GXZY0TMVGH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('The current browser does not support offline persistence.');
    }
  });

export default firebaseConfig;

// Import Firebase Functions
import { getFunctions } from 'firebase/functions';

// Initialize Firebase Functions
const functions = getFunctions(app);

// For development in Chrome extension, use localhost emulator
if (process.env.NODE_ENV === 'development') {
  auth.useEmulator('http://localhost:9099');
  db.useEmulator('localhost', 8080);
  functions.useEmulator('localhost', 5001);
}

// Export the initialized Firebase services
export { app, auth, db, functions }; 