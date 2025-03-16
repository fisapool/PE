import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-config.js';
import { getFirebaseErrorMessage } from './utils/firebase-error-handler.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signup-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const termsCheckbox = document.getElementById('terms');
  const errorMessage = document.getElementById('error-message');

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    errorMessage.textContent = '';
    errorMessage.classList.add('hidden');
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    // Validate inputs
    if (!email || !password || !confirmPassword) {
      showError('All fields are required');
      return;
    }
    
    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      showError('Password must be at least 8 characters long');
      return;
    }
    
    if (!termsCheckbox.checked) {
      showError('You must agree to the Terms of Service and Privacy Policy');
      return;
    }
    
    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: email,
        createdAt: new Date().toISOString(),
        credits: 100, // Starting credits
        contribution: {
          totalBandwidth: 0,
          lastContribution: null
        }
      });
      
      // Generate and store API key
      const apiKey = generateApiKey();
      await setDoc(doc(db, 'apiKeys', user.uid), {
        key: apiKey,
        createdAt: new Date().toISOString()
      });
      
      // Redirect to dashboard
      window.location.href = 'dashboard.html';
    } catch (error) {
      showError(getFirebaseErrorMessage(error));
      console.error('Registration error:', error);
    }
  });
  
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
  }
  
  function generateApiKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }
}); 