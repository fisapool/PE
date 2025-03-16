/**
 * Provides user-friendly error messages for Firebase errors
 */
export function getFirebaseErrorMessage(error) {
  // Authentication errors
  if (error.code?.startsWith('auth/')) {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'No account exists with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password is too weak. It should be at least 6 characters.';
      case 'auth/invalid-email':
        return 'The email address is not valid.';
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with the same email but different sign-in credentials.';
      case 'auth/operation-not-allowed':
        return 'This sign-in method is not allowed. Please contact support.';
      case 'auth/too-many-requests':
        return 'Too many failed login attempts. Please try again later.';
      default:
        return error.message || 'Authentication error. Please try again.';
    }
  }
  
  // Firestore errors
  if (error.code?.startsWith('firestore/')) {
    switch (error.code) {
      case 'firestore/permission-denied':
        return 'You do not have permission to access this data.';
      case 'firestore/unavailable':
        return 'The service is temporarily unavailable. Please try again later.';
      case 'firestore/not-found':
        return 'The requested document was not found.';
      default:
        return error.message || 'Database error. Please try again.';
    }
  }
  
  // Network or other errors
  if (error.message?.includes('network')) {
    return 'Network error. Please check your internet connection.';
  }
  
  // Default fallback
  return error.message || 'An error occurred. Please try again.';
}

/**
 * Logs errors to console with additional context
 */
export function logFirebaseError(error, context = '') {
  const timestamp = new Date().toISOString();
  const contextInfo = context ? ` [${context}]` : '';
  
  console.error(`[${timestamp}]${contextInfo} Firebase Error:`, {
    code: error.code || 'unknown',
    message: error.message || 'No message',
    stack: error.stack
  });
} 