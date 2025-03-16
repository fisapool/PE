/**
 * DNS Leak Prevention Tests
 * These tests verify protection against DNS leaks when using proxies
 */

const DnsLeakPrevention = require('../../src/utils/DnsLeakPrevention');

describe('DnsLeakPrevention', () => {
  let dnsLeakPrevention;

  beforeEach(() => {
    dnsLeakPrevention = new DnsLeakPrevention();
  });

  test('should initialize with default settings', () => {
    expect(dnsLeakPrevention).toBeDefined();
    expect(dnsLeakPrevention.active).toBe(true);
  });

  test('should detect DNS leaks in configurations', () => {
    // Mock a leaky proxy configuration
    const leakyConfig = {
      useSystemDns: true,
      bypassProxy: true
    };

    expect(dnsLeakPrevention.checkForLeaks(leakyConfig)).toBeTruthy();
  });

  test('should verify secure configurations', () => {
    // Mock a secure proxy configuration
    const secureConfig = {
      useSystemDns: false,
      bypassProxy: false,
      forceDnsProxy: true
    };

    expect(dnsLeakPrevention.checkForLeaks(secureConfig)).toBeFalsy();
  });

  test('should patch leaky configurations', () => {
    // Mock a leaky configuration
    const leakyConfig = {
      useSystemDns: true,
      bypassProxy: true
    };

    const patchedConfig = dnsLeakPrevention.fixLeaks(leakyConfig);

    expect(patchedConfig.useSystemDns).toBe(false);
    expect(patchedConfig.bypassProxy).toBe(false);
    expect(patchedConfig.forceDnsProxy).toBe(true);
  });

  test('should apply fixes to browser configurations', () => {
    // Mock browser settings object
    const browserSettings = {
      proxy: {
        type: 'manual',
        http: 'http://proxy.example.com:8080',
        https: 'https://proxy.example.com:8080',
        dns: null
      }
    };

    const secureSettings = dnsLeakPrevention.secureBrowser(browserSettings);

    expect(secureSettings.proxy.dns).toBe(secureSettings.proxy.http);
    expect(secureSettings.proxy.socks_remote_dns).toBe(true);
  });

  test('should handle WebRTC protection', () => {
    // Mock WebRTC settings
    const webRtcConfig = { iceServers: ['stun:stun.example.com'] };
    
    const secureWebRtcConfig = dnsLeakPrevention.blockWebRtcLeaks(webRtcConfig);
    
    expect(secureWebRtcConfig.iceServers).toEqual([]);
  });
}); 