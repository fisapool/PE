// Import Firebase from our central module
import { app, auth, db } from './firebase-module.js';

document.addEventListener('DOMContentLoaded', function() {
  console.log('Popup script loaded');
  
  // Your popup initialization code here
  
  // Example: Check login state
  auth.onAuthStateChanged(user => {
    if (user) {
      console.log('User is signed in:', user.email);
      // Update UI for signed-in user
    } else {
      console.log('No user signed in');
      // Update UI for signed-out user
    }
  });
}); 