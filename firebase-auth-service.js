
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  signOut, 
  onAuthStateChanged,
  getIdToken
} from 'firebase/auth';
import { doc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { app, auth, db, googleProvider, githubProvider } from './src/firebase-module.js';

// Email/Password authentication
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await updateUserSession(userCredential.user);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, message: error.message };
  }
}

export async function registerUser(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    await initializeUserData(user);
    await updateUserSession(user);
    
    return { success: true, user };
  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, message: error.message };
  }
}

// OAuth authentication
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await initializeUserData(result.user);
    await updateUserSession(result.user);
    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function signInWithGithub() {
  try {
    const result = await signInWithPopup(auth, githubProvider);
    await initializeUserData(result.user);
    await updateUserSession(result.user);
    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// Session management
async function updateUserSession(user) {
  const session = {
    uid: user.uid,
    email: user.email,
    lastLogin: new Date().toISOString()
  };
  localStorage.setItem('userSession', JSON.stringify(session));
}

// User data initialization
async function initializeUserData(user) {
  const userRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    await setDoc(userRef, {
      email: user.email,
      createdAt: new Date().toISOString(),
      credits: 100,
      contribution: {
        totalBandwidth: 0,
        lastContribution: null
      }
    });
  }
}

export async function logoutUser() {
  try {
    await signOut(auth);
    localStorage.removeItem('userSession');
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export function getCurrentUser() {
  return auth.currentUser;
}

export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, callback);
}
