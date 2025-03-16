/**
 * Contributor Model
 * Represents a device that contributes to the proxy network
 * 
 * AI-generated code for the Residential Proxy Project
 */

class Contributor {
  /**
   * Create a new contributor
   * @param {Object} params - Contributor parameters
   */
  constructor({
    deviceId,
    ipAddress,
    isActive = false,
    consented = false,
    bandwidthLimit = 1000, // MB
    isWifi = false,
    isCharging = false
  }) {
    this.deviceId = deviceId;
    this.ipAddress = ipAddress;
    this.isActive = isActive;
    this.consented = consented;
    this.registeredAt = new Date();
    this.lastSeen = new Date();
    this.bandwidthLimit = bandwidthLimit;
    this.bandwidthUsed = 0;
    this.isWifi = isWifi;
    this.isCharging = isCharging;
    this.consentUpdatedAt = null;
  }
  
  /**
   * Track bandwidth usage
   * @param {number} megabytes - Megabytes used
   */
  trackBandwidth(megabytes) {
    if (typeof megabytes !== 'number' || megabytes < 0) {
      return;
    }
    
    this.bandwidthUsed += megabytes;
    this.lastSeen = new Date();
  }
  
  /**
   * Check if bandwidth limit is exceeded
   * @returns {boolean} - Whether limit is exceeded
   */
  isBandwidthExceeded() {
    return this.bandwidthUsed >= this.bandwidthLimit;
  }
  
  /**
   * Update consent status
   * @param {boolean} consent - New consent status
   */
  updateConsent(consent) {
    this.consented = !!consent;
    this.consentUpdatedAt = new Date();
  }
  
  /**
   * Generate status report for the contributor
   * @returns {Object} - Status report
   */
  getStatusReport() {
    return {
      deviceId: this.deviceId,
      isActive: this.isActive,
      consented: this.consented,
      bandwidthUsed: this.bandwidthUsed,
      bandwidthAvailable: Math.max(0, this.bandwidthLimit - this.bandwidthUsed),
      isWifi: this.isWifi,
      isCharging: this.isCharging,
      lastSeen: this.lastSeen
    };
  }
}

module.exports = Contributor;
