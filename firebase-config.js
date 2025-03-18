
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Firebase configuration
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
const functions = getFunctions(app);

// Enable offline persistence
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('The current browser does not support offline persistence.');
    }
  });

// Development environment configuration
if (process.env.NODE_ENV === 'development') {
  auth.useEmulator('http://0.0.0.0:9099');
  db.useEmulator('0.0.0.0', 8080);
  connectFunctionsEmulator(functions, '0.0.0.0', 5001);
}

export { app, auth, db, functions };
export default firebaseConfig;
