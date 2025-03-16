/**
 * BandwidthTracker test file
 */

const BandwidthTracker = require('../../src/utils/BandwidthTracker');

describe('BandwidthTracker', () => {
  let tracker;
  
  beforeEach(() => {
    tracker = new BandwidthTracker({
      dailyLimit: 500, // 500MB daily limit
      sessionLimit: 100 // 100MB session limit
    });
  });
  
  test('should initialize with default values', () => {
    expect(tracker).toBeInstanceOf(BandwidthTracker);
    expect(tracker.dailyLimit).toBe(500);
    expect(tracker.sessionLimit).toBe(100);
  });
  
  test('should track sent and received data', () => {
    const sessionId = 'test-session';
    
    // Track 1MB sent
    tracker.trackSent(sessionId, 1024 * 1024);
    
    // Track 2MB received
    tracker.trackReceived(sessionId, 2 * 1024 * 1024);
    
    // Check session stats
    const stats = tracker.getSessionStats(sessionId);
    expect(stats.sent).toBeCloseTo(1);
    expect(stats.received).toBeCloseTo(2);
    expect(stats.total).toBeCloseTo(3);
  });
  
  test('should track full requests', () => {
    const sessionId = 'test-session';
    
    // Track a request with data
    tracker.trackRequest(sessionId, 
      { data: { test: 'data' } }, 
      { data: { response: 'large response with data' } }
    );
    
    // Verify tracking
    const stats = tracker.getSessionStats(sessionId);
    expect(stats.total).toBeGreaterThan(0);
  });
  
  test('should correctly identify when limits are reached', () => {
    const sessionId = 'test-session';
    
    // Create a tracker with small limits for testing
    const testTracker = new BandwidthTracker({
      dailyLimit: 5, // 5MB
      sessionLimit: 2, // 2MB
      onLimitReached: jest.fn()
    });
    
    // Add just under the limit
    testTracker.trackSent(sessionId, 1.9 * 1024 * 1024);
    
    // Check limits - should be under
    let limits = testTracker.checkLimits(sessionId);
    expect(limits.exceeded).toBe(false);
    
    // Add more to exceed limit
    testTracker.trackSent(sessionId, 0.2 * 1024 * 1024);
    
    // Check limits - should be exceeded
    limits = testTracker.checkLimits(sessionId);
    expect(limits.exceeded).toBe(true);
    expect(limits.session.percent).toBeGreaterThanOrEqual(100);
  });
});
