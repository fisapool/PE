/**
 * RotatingProxyList tests
 */

const RotatingProxyList = require('../../src/utils/RotatingProxyList');

describe('RotatingProxyList', () => {
  let proxyList;
  const sampleProxies = [
    { id: 'proxy1', url: 'http://proxy1.example.com:8080' },
    { id: 'proxy2', url: 'http://proxy2.example.com:8080' },
    { id: 'proxy3', url: 'http://proxy3.example.com:8080' }
  ];

  beforeEach(() => {
    proxyList = new RotatingProxyList({
      proxies: [...sampleProxies]
    });
  });

  test('should initialize with provided proxies', () => {
    expect(proxyList.proxies).toHaveLength(3);
    expect(proxyList.currentIndex).toBe(0);
  });

  test('should return current proxy', () => {
    const current = proxyList.getCurrent();
    expect(current).toEqual(sampleProxies[0]);
  });

  test('should rotate proxies sequentially', () => {
    expect(proxyList.currentIndex).toBe(0);
    
    const nextProxy = proxyList.rotate();
    expect(proxyList.currentIndex).toBe(1);
    expect(nextProxy).toEqual(sampleProxies[1]);
    
    proxyList.rotate();
    expect(proxyList.currentIndex).toBe(2);
    
    // Should wrap around to the beginning
    proxyList.rotate();
    expect(proxyList.currentIndex).toBe(0);
  });

  test('should rotate proxies randomly when strategy is random', () => {
    proxyList = new RotatingProxyList({
      proxies: [...sampleProxies],
      rotationStrategy: 'random'
    });
    
    // Mock Math.random to return predictable values
    const originalRandom = Math.random;
    Math.random = jest.fn().mockReturnValue(0.5);
    
    proxyList.rotate();
    // With 3 proxies and Math.random = 0.5, should pick index 1
    expect(proxyList.currentIndex).toBe(1);
    
    // Restore original Math.random
    Math.random = originalRandom;
  });

  test('should add a proxy to the list', () => {
    const newProxy = { id: 'proxy4', url: 'http://proxy4.example.com:8080' };
    proxyList.addProxy(newProxy);
    
    expect(proxyList.proxies).toHaveLength(4);
    expect(proxyList.proxies[3]).toEqual(newProxy);
  });

  test('should remove a proxy from the list', () => {
    const result = proxyList.removeProxy('proxy2');
    
    expect(result).toBe(true);
    expect(proxyList.proxies).toHaveLength(2);
    expect(proxyList.proxies.find(p => p.id === 'proxy2')).toBeUndefined();
  });

  test('should set entire proxy list', () => {
    const newProxies = [
      { id: 'new1', url: 'http://new1.example.com:8080' },
      { id: 'new2', url: 'http://new2.example.com:8080' }
    ];
    
    proxyList.setProxies(newProxies);
    
    expect(proxyList.proxies).toEqual(newProxies);
    expect(proxyList.currentIndex).toBe(0);
  });

  test('should handle auto refresh with callback', () => {
    jest.useFakeTimers();
    
    const refreshCallback = jest.fn().mockResolvedValue([
      { id: 'refreshed1', url: 'http://refreshed.example.com:8080' }
    ]);
    
    proxyList = new RotatingProxyList({
      proxies: [...sampleProxies],
      refreshInterval: 60000
    });
    
    proxyList.setRefreshCallback(refreshCallback);
    
    // Fast-forward time
    jest.advanceTimersByTime(60000);
    
    expect(refreshCallback).toHaveBeenCalled();
    
    jest.useRealTimers();
  });

  test('should handle empty proxy lists gracefully', () => {
    proxyList = new RotatingProxyList();
    
    expect(proxyList.getCurrent()).toBeNull();
    expect(proxyList.rotate()).toBeNull();
  });
}); 