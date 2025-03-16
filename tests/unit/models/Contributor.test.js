/**
 * Tests for Contributor model
 */

const Contributor = require('../../../src/models/Contributor');

describe('Contributor Model', () => {
  test('should create a new contributor with default values', () => {
    const contributor = new Contributor({
      deviceId: 'device123',
      ipAddress: '192.168.1.1'
    });
    
    expect(contributor.deviceId).toBe('device123');
    expect(contributor.ipAddress).toBe('192.168.1.1');
    expect(contributor.isActive).toBe(false);
    expect(contributor.consented).toBe(false);
    expect(contributor.registeredAt).toBeInstanceOf(Date);
  });
  
  test('should accept custom values on creation', () => {
    const contributor = new Contributor({
      deviceId: 'device456',
      ipAddress: '192.168.1.2',
      isActive: true,
      consented: true,
      bandwidthLimit: 500
    });
    
    expect(contributor.deviceId).toBe('device456');
    expect(contributor.isActive).toBe(true);
    expect(contributor.consented).toBe(true);
    expect(contributor.bandwidthLimit).toBe(500);
  });
  
  test('should track bandwidth usage correctly', () => {
    const contributor = new Contributor({
      deviceId: 'device789',
      bandwidthLimit: 100
    });
    
    contributor.trackBandwidth(50);
    expect(contributor.bandwidthUsed).toBe(50);
    
    contributor.trackBandwidth(30);
    expect(contributor.bandwidthUsed).toBe(80);
  });
  
  test('should detect when bandwidth limit is exceeded', () => {
    const contributor = new Contributor({
      deviceId: 'device101',
      bandwidthLimit: 100
    });
    
    contributor.trackBandwidth(90);
    expect(contributor.isBandwidthExceeded()).toBe(false);
    
    contributor.trackBandwidth(20);
    expect(contributor.isBandwidthExceeded()).toBe(true);
  });
  
  test('should update consent status', () => {
    const contributor = new Contributor({
      deviceId: 'device202'
    });
    
    expect(contributor.consented).toBe(false);
    
    contributor.updateConsent(true);
    expect(contributor.consented).toBe(true);
    expect(contributor.consentUpdatedAt).toBeInstanceOf(Date);
    
    contributor.updateConsent(false);
    expect(contributor.consented).toBe(false);
  });
  
  test('should generate status report', () => {
    const contributor = new Contributor({
      deviceId: 'device303',
      ipAddress: '192.168.1.3',
      isActive: true,
      consented: true,
      bandwidthLimit: 1000,
      isWifi: true,
      isCharging: true
    });
    
    contributor.trackBandwidth(200);
    
    const report = contributor.getStatusReport();
    
    expect(report).toHaveProperty('deviceId', 'device303');
    expect(report).toHaveProperty('isActive', true);
    expect(report).toHaveProperty('bandwidthUsed', 200);
    expect(report).toHaveProperty('bandwidthAvailable', 800);
    expect(report).toHaveProperty('isWifi', true);
    expect(report).toHaveProperty('isCharging', true);
  });
}); 