import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent } from 'firebase/analytics';
import firebaseConfig from './firebase-config.js';

// Initialize Firebase if not already initialized
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  app = firebase.apps[0]; // Get the already initialized app
}

const analytics = getAnalytics(app);

// Track user actions
export function trackEvent(eventName, eventParams = {}) {
  try {
    logEvent(analytics, eventName, eventParams);
    console.debug(`Analytics event tracked: ${eventName}`, eventParams);
  } catch (error) {
    console.error('Error tracking analytics event:', error);
  }
}

// Common tracking events
export const Events = {
  LOGIN: 'user_login',
  SIGNUP: 'user_signup',
  PROXY_REQUEST: 'proxy_request',
  PROXY_ROTATE: 'proxy_rotate',
  CONTRIBUTION_START: 'contribution_start',
  CONTRIBUTION_END: 'contribution_end',
  ERROR: 'app_error'
};

// Helper function to track errors
export function trackError(errorType, errorDetails) {
  trackEvent(Events.ERROR, {
    error_type: errorType,
    error_details: errorDetails
  });
} 