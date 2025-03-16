const validateProxyUrl = require('../utils/validation').validateUrl;
const createProxySession = require('../services/ProxyConnectionService').createSession;
const rotateProxyIp = require('../services/ProxyConnectionService').rotateIp;
const handleProxyError = require('../utils/errorHandler').handleProxyError;
// Import any other functions you need to test

// Use dynamic imports for Firebase in tests
import { jest } from '@jest/globals';

// Mock Firebase
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn()
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn()
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn()
}));

describe('Proxy Utility Functions', () => {
  // URL Validation Tests
  describe('validateProxyUrl', () => {
    test('should accept valid proxy URLs', () => {
      expect(validateProxyUrl('https://proxy.example.com:8080')).toBeTruthy();
      expect(validateProxyUrl('http://123.45.67.89:3128')).toBeTruthy();
    });
    
    test('should reject invalid proxy URLs', () => {
      expect(validateProxyUrl('not-a-url')).toBeFalsy();
      expect(validateProxyUrl('ftp://invalid-protocol.com')).toBeFalsy();
      expect(validateProxyUrl('')).toBeFalsy();
    });
  });
  
  // Session Management Tests
  describe('createProxySession', () => {
    test('should create a valid proxy session', async () => {
      // Mock dependencies
      const mockConfig = { url: 'https://proxy.example.com', credentials: 'test-user:pass' };
      
      // Mock implementation
      createProxySession.mockResolvedValue({
        sessionId: 'test-session',
        expiresAt: Date.now() + 3600000
      });
      
      const result = await createProxySession(mockConfig);
      expect(result).toHaveProperty('sessionId');
    });
    
    test('should handle connection failures', async () => {
      const mockConfig = { url: 'https://invalid.proxy', credentials: 'test-user:pass' };
      await expect(createProxySession(mockConfig)).rejects.toThrow();
    });
  });
  
  // IP Rotation Tests
  describe('rotateProxyIp', () => {
    test('should successfully rotate to a new IP', async () => {
      const mockSession = { sessionId: 'test-session', currentIp: '1.2.3.4' };
      const result = await rotateProxyIp(mockSession);
      expect(result.currentIp).not.toBe('1.2.3.4');
      expect(result.sessionId).toBe('test-session');
    });
    
    test('should respect rate limits', async () => {
      // Test with multiple rapid rotation attempts
      const mockSession = { sessionId: 'test-session', currentIp: '1.2.3.4' };
      await rotateProxyIp(mockSession);
      
      // Should delay or throttle on rapid subsequent calls
      const startTime = Date.now();
      await rotateProxyIp(mockSession);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeGreaterThanOrEqual(1000); // At least 1s delay
    });
  });
  
  // Error Handling Tests
  describe('handleProxyError', () => {
    test('should mask credentials in error messages', () => {
      const error = new Error('Failed to connect with credentials user:password123');
      const handled = handleProxyError(error);
      expect(handled.message).not.toContain('password123');
      expect(handled.message).toContain('user:***');
    });
    
    test('should classify different error types', () => {
      const timeoutError = new Error('Connection timed out');
      expect(handleProxyError(timeoutError).type).toBe('timeout');
      
      const authError = new Error('Authentication failed');
      expect(handleProxyError(authError).type).toBe('auth');
    });
  });
}); 