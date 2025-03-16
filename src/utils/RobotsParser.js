/**
 * Robots.txt Parser
 * Ensures ethical scraping by respecting robots.txt directives
 * 
 * AI-generated code for the Residential Proxy Project
 */

const axios = require('axios');
const url = require('url');

class RobotsParser {
  constructor(userAgent = 'ProxyEthica/1.0') {
    this.userAgent = userAgent;
    this.rules = [];
    this.crawlDelay = 0;
    this.hostCache = new Map();
    this.lastRequestTime = 0;
  }

  /**
   * Fetch and parse a robots.txt file for a given URL
   * @param {string} urlToFetch - URL to fetch robots.txt from
   * @returns {Promise<void>}
   */
  async fetch(urlToFetch) {
    try {
      const parsedUrl = new URL(urlToFetch);
      const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}/robots.txt`;
      
      // Check cache first
      if (this.hostCache.has(parsedUrl.hostname)) {
        return;
      }
      
      const response = await axios.get(robotsUrl, {
        headers: {
          'User-Agent': this.userAgent
        },
        timeout: 5000
      });
      
      if (response.status === 200) {
        this._parseRobotsTxt(response.data);
        this.hostCache.set(parsedUrl.hostname, true);
      }
    } catch (error) {
      // If robots.txt doesn't exist, allow everything
      this.rules = [];
      this.crawlDelay = 0;
    }
  }

  /**
   * Get the crawl delay specified in robots.txt
   * @returns {number} - Crawl delay in seconds
   */
  getCrawlDelay() {
    return this.crawlDelay;
  }

  /**
   * Wait for the crawl delay before making another request
   * @returns {Promise<void>}
   */
  async waitForCrawlDelay() {
    if (this.crawlDelay <= 0) {
      return;
    }
    
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const delayMs = this.crawlDelay * 1000;
    
    if (timeSinceLastRequest < delayMs) {
      const waitTime = delayMs - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Check if a URL is allowed to be scraped
   * @param {string} urlToCheck - URL to check
   * @returns {Promise<boolean>} - Whether the URL is allowed
   */
  async isAllowed(urlToCheck) {
    try {
      const parsedUrl = new URL(urlToCheck);
      const hostname = parsedUrl.hostname;
      
      // Fetch robots.txt if not cached
      if (!this.hostCache.has(hostname)) {
        await this.fetch(`${parsedUrl.protocol}//${hostname}/`);
      }
      
      // If no rules, allow by default
      if (this.rules.length === 0) {
        return true;
      }
      
      const path = parsedUrl.pathname + parsedUrl.search;
      
      // Find applicable rules for this user agent
      const specificRules = this.rules.filter(rule => 
        rule.userAgent === this.userAgent
      );
      
      const genericRules = this.rules.filter(rule => 
        rule.userAgent === '*'
      );
      
      // Use specific rules if available, otherwise use generic rules
      const applicableRules = specificRules.length > 0 ? specificRules : genericRules;
      
      // If no applicable rules, allow by default
      if (applicableRules.length === 0) {
        return true;
      }
      
      // Check for explicit allow rules first (they take precedence)
      for (const rule of applicableRules) {
        if (rule.type === 'allow' && path.startsWith(rule.path)) {
          return true;
        }
      }
      
      // Then check for disallow rules
      for (const rule of applicableRules) {
        if (rule.type === 'disallow' && rule.path && path.startsWith(rule.path)) {
          return false;
        }
      }
      
      // If no matching rules, allow by default
      return true;
    } catch (error) {
      // If there's an error, allow by default for safety
      return true;
    }
  }
  
  /**
   * Parse robots.txt content
   * @private
   * @param {string} content - Robots.txt content
   */
  _parseRobotsTxt(content) {
    const lines = content.split('\n');
    let currentUserAgent = null;
    this.rules = [];
    this.crawlDelay = 0;
    
    for (let line of lines) {
      line = line.trim();
      
      // Skip comments and empty lines
      if (line.startsWith('#') || line === '') {
        continue;
      }
      
      // Split into directive and value
      const [directive, ...valueParts] = line.split(':');
      let value = valueParts.join(':').trim();
      
      // If no value, skip
      if (!value) {
        continue;
      }
      
      switch (directive.toLowerCase()) {
        case 'user-agent':
          currentUserAgent = value;
          break;
          
        case 'disallow':
          if (currentUserAgent) {
            this.rules.push({
              userAgent: currentUserAgent,
              type: 'disallow',
              path: value
            });
          }
          break;
          
        case 'allow':
          if (currentUserAgent) {
            this.rules.push({
              userAgent: currentUserAgent,
              type: 'allow',
              path: value
            });
          }
          break;
          
        case 'crawl-delay':
          if (currentUserAgent) {
            const delay = parseFloat(value);
            if (!isNaN(delay)) {
              this.crawlDelay = delay;
            }
          }
          break;
      }
    }
  }
}

module.exports = RobotsParser; 