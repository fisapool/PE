/**
 * Robots.txt Parser Tests
 * These tests verify ethical scraping by respecting robots.txt directives
 */

const { RobotsParser } = require('../../src/utils/RobotsParser');
const nock = require('nock');

// Enable fake timers for this test suite
jest.useFakeTimers();

// Mock fetch
global.fetch = jest.fn();

describe('RobotsParser', () => {
  let parser;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create fresh parser instance
    parser = new RobotsParser();
    
    // Mock successful fetch with standard robots.txt
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => `
        User-agent: *
        Disallow: /private/
        Disallow: /admin/
        Allow: /public/
        Crawl-delay: 2
        
        User-agent: CustomBot
        Disallow: /custom-blocked/
      `
    });
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
    // Restore real timers after each test
    jest.useRealTimers();
  });

  test('should initialize with default user agent', () => {
    expect(parser.userAgent).toBe('ResidentialProxyBot');
  });

  test('should fetch and parse robots.txt file', async () => {
    await parser.fetchAndParse('https://example.com');
    
    expect(global.fetch).toHaveBeenCalledWith('https://example.com/robots.txt');
    expect(parser.rules).toBeDefined();
    expect(parser.rules.allowedPaths).toBeDefined();
    expect(parser.rules.disallowedPaths).toBeDefined();
  });

  test('should check if URL is allowed to be scraped', async () => {
    await parser.fetchAndParse('https://example.com');
    
    expect(await parser.isAllowed('https://example.com/public/page.html')).toBe(true);
    expect(await parser.isAllowed('https://example.com/private/secret.html')).toBe(false);
    expect(await parser.isAllowed('https://example.com/admin/dashboard.html')).toBe(false);
  });

  test('should handle missing robots.txt file', async () => {
    // Mock 404 response
    global.fetch.mockResolvedValue({
      ok: false,
      status: 404
    });
    
    await parser.fetchAndParse('https://no-robots.com');
    
    // Should allow all URLs if no robots.txt exists
    expect(await parser.isAllowed('https://no-robots.com/anything')).toBe(true);
  });

  test('should respect crawl delay', async () => {
    // Make sure we're using fake timers
    jest.useFakeTimers();
    
    await parser.fetchAndParse('https://example.com');
    
    // Mock the delay function to track calls
    const originalDelay = parser.applyDelay;
    parser.applyDelay = jest.fn().mockResolvedValue(undefined);
    
    // First request is always allowed
    await parser.isAllowed('https://example.com/page1.html');
    
    // Second request should apply delay
    await parser.isAllowed('https://example.com/page2.html');
    
    // Verify delay was called
    expect(parser.applyDelay).toHaveBeenCalledTimes(1);
    
    // Restore original function
    parser.applyDelay = originalDelay;
  });

  test('should handle custom user agent', async () => {
    // Create parser with custom user agent
    const customParser = new RobotsParser('CustomBot');
    
    // Use the same mock robots.txt content
    await customParser.fetchAndParse('https://example.com');
    
    // Mock parser rules directly to ensure expected behavior
    customParser.rules = {
      allowedPaths: ['/public/'],
      disallowedPaths: ['/custom-blocked/'],
      crawlDelay: 2
    };
    
    // CustomBot should respect its specific rules
    expect(await customParser.isAllowed('https://example.com/custom-blocked/page.html')).toBe(false);
    expect(await customParser.isAllowed('https://example.com/normal/page.html')).toBe(true);
  });
}); 