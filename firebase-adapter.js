// Create this adapter file to centralize all Firebase imports
import { initializeApp } from './node_modules/firebase/app/dist/index.esm.js';
import { getAuth } from './node_modules/firebase/auth/dist/index.esm.js';
import { getFirestore } from './node_modules/firebase/firestore/dist/index.esm.js';
import firebaseConfig from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db }; 