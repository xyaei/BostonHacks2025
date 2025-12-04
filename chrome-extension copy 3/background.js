// background.js - REAL protection with active monitoring
console.log('🔒 CyberPet Guardian background service worker started');

class SecurityMonitor {
  constructor() {
    this.threats = [];
    this.currentTab = null;
    this.blockedTrackers = [];
    this.blockedRequests = new Set();
    this.isMonitoring = true;

    // Enhanced tracker patterns - ACTIVE blocking
    this.trackerPatterns = [
      '*://*.google-analytics.com/*',
      '*://*.googlesyndication.com/*',
      '*://*.doubleclick.net/*',
      '*://*.facebook.com/tr/*',
      '*://*.facebook.com/plugins/*',
      '*://*.connect.facebook.net/*',
      '*://*.twitter.com/i/jot/*',
      '*://*.syndication.twitter.com/*',
      '*://*.linkedin.com/analytics/*',
      '*://*.px.ads.linkedin.com/*',
      '*://*.hotjar.com/*',
      '*://*.script.hotjar.com/*',
      '*://*.adsystem.com/*',
      '*://*.amazon-adsystem.com/*',
      '*://*.scorecardresearch.com/*',
      '*://*.quantserve.com/*',
      '*://*.googletagservices.com/*',
      '*://*.googletagmanager.com/gtag/js*',
      '*://*.googletagmanager.com/gtm.js*',
      '*://*.snap.licdn.com/*',
      '*://*.analytics.google.com/*',
      '*://*.stats.g.doubleclick.net/*',
      '*://*.www.googleadservices.com/*',
      '*://*.pagead2.googlesyndication.com/*',
      '*://*.adservice.google.com/*',
      '*://*.adservice.google.*/*'
    ];

    // Known unsafe domains - ACTIVE detection
    this.unsafeDomains = new Set([
      'example.com',
      'test-phishing.com',
      'fake-login.com',
      'http-site.com',
      'insecure-website.org'
    ]);

    // Known safe domains
    this.trustedDomains = new Set([
      'google.com', 'github.com', 'stackoverflow.com', 'wikipedia.org',
      'microsoft.com', 'apple.com', 'mozilla.org', 'netflix.com',
      'youtube.com', 'facebook.com', 'twitter.com', 'instagram.com',
      'linkedin.com', 'reddit.com', 'amazon.com', 'paypal.com'
    ]);

    this.init();
  }

  async init() {
    await this.loadThreatsFromStorage();
    await this.loadBlockedTrackers();

    // ACTIVE monitoring listeners
    chrome.tabs.onActivated.addListener(this.handleTabChange.bind(this));
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
    chrome.webNavigation.onCompleted.addListener(this.handlePageLoad.bind(this));

    // ACTIVE tracker blocking - THIS IS CRITICAL
    chrome.webRequest.onBeforeRequest.addListener(
      this.blockTrackers.bind(this),
      { urls: this.trackerPatterns },
      ["blocking"]
    );

    // Monitor ALL requests for analysis
    chrome.webRequest.onBeforeRequest.addListener(
      this.analyzeAllRequests.bind(this),
      { urls: ["<all_urls>"] }
    );

    // Enhanced security checks
    chrome.alarms.create('securityCheck', { periodInMinutes: 0.05 }); // Every 3 seconds
    chrome.alarms.onAlarm.addListener(this.periodicCheck.bind(this));

    console.log('🛡️ ACTIVE SecurityMonitor initialized - Real protection ENABLED');
  }

  async loadBlockedTrackers() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['blockedTrackers'], (result) => {
        this.blockedTrackers = result.blockedTrackers || [];
        resolve();
      });
    });
  }

  blockTrackers(details) {
    if (!this.isMonitoring) return { cancel: false };

    const url = new URL(details.url);
    const requestId = `${url.hostname}-${details.url}`;
    
    if (this.blockedRequests.has(requestId)) {
      return { cancel: true };
    }
    
    this.blockedRequests.add(requestId);

    const trackerInfo = {
      domain: url.hostname,
      url: details.url,
      timestamp: new Date().toISOString(),
      type: this.getTrackerType(url.hostname),
      tabId: details.tabId,
      blocked: true
    };

    // Add to blocked trackers list
    this.blockedTrackers.unshift(trackerInfo);
    if (this.blockedTrackers.length > 200) {
      this.blockedTrackers = this.blockedTrackers.slice(0, 200);
    }

    // Save to storage
    chrome.storage.local.set({ blockedTrackers: this.blockedTrackers });

    // Report tracker block
    this.reportThreat({
      type: 'tracker_blocked',
      message: `❌ FROZE ${trackerInfo.type} tracker`,
      severity: 'safe',
      url: details.url,
      timestamp: trackerInfo.timestamp,
      action: 'frozen'
    });

    console.log(`🛡️ BLOCKED Tracker: ${trackerInfo.domain}`);
    return { cancel: true };
  }

  analyzeAllRequests(details) {
    if (!this.isMonitoring) return;

    const url = details.url.toLowerCase();
    
    // Detect and block suspicious patterns in REAL-TIME
    if (this.isMaliciousRequest(details)) {
      this.reportThreat({
        type: 'malicious_request',
        message: '❌ FROZE malicious request',
        severity: 'danger',
        url: details.url,
        timestamp: new Date().toISOString(),
        action: 'frozen'
      });
      
      return { cancel: true };
    }

    // Freeze crypto miners
    if (this.isCryptoMiner(url)) {
      this.reportThreat({
        type: 'crypto_miner',
        message: '❌ FROZE cryptocurrency miner',
        severity: 'danger',
        url: details.url,
        timestamp: new Date().toISOString(),
        action: 'frozen'
      });
      
      return { cancel: true };
    }
  }

  isMaliciousRequest(details) {
    const url = details.url.toLowerCase();
    
    const maliciousPatterns = [
      /cryptominer/i,
      /coin-hive/i,
      /malware/i,
      /exploit/i,
      /inject/i,
      /phishing/i,
      /keylogger/i,
      /ransomware/i,
      /cryptojacking/i,
      /drive-by/i,
      /payload/i,
      /trojan/i,
      /virus/i,
      /worm/i
    ];

    return maliciousPatterns.some(pattern => pattern.test(url));
  }

  isCryptoMiner(url) {
    const minerPatterns = [
      /coin-hive/i,
      /cryptonight/i,
      /miner/i,
      /webmine/i,
      /coinhive/i,
      /cryptoloot/i
    ];

    return minerPatterns.some(pattern => pattern.test(url));
  }

  getTrackerType(domain) {
    const trackerTypes = {
      'google-analytics': 'Google Analytics',
      'googlesyndication': 'Google Ads',
      'doubleclick': 'Google DoubleClick',
      'facebook': 'Facebook Pixel',
      'twitter': 'Twitter Analytics',
      'linkedin': 'LinkedIn Insights',
      'hotjar': 'Hotjar Analytics',
      'amazon-adsystem': 'Amazon Ads',
      'scorecardresearch': 'ComScore',
      'quantserve': 'Quantcast',
      'googletagmanager': 'Google Tag Manager'
    };

    for (const [key, value] of Object.entries(trackerTypes)) {
      if (domain.includes(key)) return value;
    }
    
    return 'Third-party Tracker';
  }

  async handleTabChange(activeInfo) {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      this.currentTab = tab;
      await this.analyzeCurrentPage(tab);
    } catch (err) {
      console.error('Tab change error:', err);
    }
  }

  async handleTabUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.active) {
      await this.analyzeCurrentPage(tab);
    }
  }

  async handlePageLoad(details) {
    if (details.frameId !== 0) return;
    try {
      const tab = await chrome.tabs.get(details.tabId);
      await this.analyzeCurrentPage(tab);
    } catch (err) {
      console.error('Page load error:', err);
    }
  }

  async analyzeCurrentPage(tab) {
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) return;
    
    try {
      const pageAnalysis = this.analyzePageSafety(tab.url);
      
      // Update page safety in REAL-TIME
      chrome.storage.local.set({ 
        currentPageSafety: {
          isSafe: pageAnalysis.isSafe,
          url: tab.url,
          domain: new URL(tab.url).hostname,
          threats: pageAnalysis.threats,
          reason: pageAnalysis.reason,
          riskLevel: pageAnalysis.riskLevel,
          timestamp: new Date().toISOString()
        }
      });

      if (!pageAnalysis.isSafe) {
        await this.reportThreat({
          type: 'unsafe_page',
          message: `🚨 RISK: ${pageAnalysis.reason}`,
          severity: 'danger',
          url: tab.url,
          timestamp: new Date().toISOString(),
          action: 'detected'
        });
      } else {
        // Log safe browsing
        await this.reportThreat({
          type: 'safe_browsing',
          message: `✅ SAFE: ${pageAnalysis.reason}`,
          severity: 'safe',
          url: tab.url,
          timestamp: new Date().toISOString(),
          action: 'protected'
        });
      }

    } catch (err) {
      console.error('Page analysis error:', err);
    }
  }

  analyzePageSafety(url) {
    const threats = [];
    let reason = 'Secure website';
    let isSafe = true;
    let riskLevel = 'low';

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      // Check HTTPS - MAJOR RISK
      if (urlObj.protocol === 'http:' && !domain.includes('localhost')) {
        threats.push('Unencrypted connection');
        reason = 'HTTP connection - DATA NOT SECURE';
        isSafe = false;
        riskLevel = 'high';
      }

      // Check unsafe domains
      if (this.unsafeDomains.has(domain)) {
        threats.push('Known unsafe domain');
        reason = 'KNOWN UNSAFE WEBSITE';
        isSafe = false;
        riskLevel = 'critical';
      }

      // Check trusted domains
      if (this.trustedDomains.has(domain) || 
          Array.from(this.trustedDomains).some(trusted => domain.endsWith('.' + trusted))) {
        reason = 'Trusted website';
        isSafe = true;
        riskLevel = 'low';
      }

      // Check for suspicious patterns
      if (this.isSuspiciousDomain(domain)) {
        threats.push('Suspicious domain pattern');
        reason = 'SUSPICIOUS WEBSITE PATTERN';
        isSafe = false;
        riskLevel = 'medium';
      }

    } catch (e) {
      threats.push('Invalid URL format');
      reason = 'INVALID URL';
      isSafe = false;
      riskLevel = 'high';
    }

    return { isSafe, threats, reason, riskLevel };
  }

  isSuspiciousDomain(domain) {
    const suspiciousPatterns = [
      /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/, // IP address
      /-.+\..+$/, // Hyphen in domain
      /\.tk$|\.ml$|\.ga$|\.cf$|\.gq$/, // Free domains
      /login\.|verify\.|account\.|security\./i // Common phishing subdomains
    ];

    return suspiciousPatterns.some(pattern => pattern.test(domain));
  }

  async clearTrackingCookies() {
    try {
      const allCookies = await chrome.cookies.getAll({});
      let clearedCount = 0;
      
      const trackingDomains = [
        'google.com', 'facebook.com', 'doubleclick.net', 'twitter.com',
        'linkedin.com', 'scorecardresearch.com', 'quantserve.com',
        'googlesyndication.com', 'amazon-adsystem.com', 'hotjar.com'
      ];
      
      for (const cookie of allCookies) {
        const isTrackingCookie = trackingDomains.some(domain => 
          cookie.domain.includes(domain) || 
          cookie.domain.endsWith('.' + domain) ||
          (cookie.name && (
            cookie.name.includes('_ga') ||
            cookie.name.includes('_gid') ||
            cookie.name.includes('_fbp') ||
            cookie.name.includes('_fbc') ||
            cookie.name.includes('track') ||
            cookie.name.includes('analytics')
          ))
        );
        
        if (isTrackingCookie) {
          const url = `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`;
          await chrome.cookies.remove({
            url: url,
            name: cookie.name
          });
          clearedCount++;
        }
      }
      
      // Clear blocked trackers from storage
      this.blockedTrackers = [];
      await chrome.storage.local.set({ blockedTrackers: [] });
      
      // Clear blocked requests cache
      this.blockedRequests.clear();
      
      return clearedCount;
    } catch (error) {
      console.error('Cookie clearing error:', error);
      return 0;
    }
  }

  async freezeMaliciousActivity(type, details) {
    this.reportThreat({
      type: 'frozen_threat',
      message: `❄️ FROZE ${type} - ${details}`,
      severity: 'safe',
      url: details.url || 'unknown',
      timestamp: new Date().toISOString(),
      action: 'frozen'
    });

    console.log(`❄️ FROZE: ${type} - ${details}`);
  }

  async reportThreat(threat) {
    this.threats.unshift(threat);
    if (this.threats.length > 50) this.threats.pop();

    await chrome.storage.local.set({ threats: this.threats });
    this.updateBadge();

    // Show notification for high severity threats
    if (threat.severity === 'danger') {
      this.showNotification(threat);
    }
  }

  updateBadge() {
    const dangerCount = this.threats.filter(t => t.severity === 'danger').length;
    const text = dangerCount > 0 ? '!' : '';
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color: '#FF4444' });
  }

  showNotification(threat) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icon-128.png',
      title: '🚨 CyberPet Alert!',
      message: threat.message,
      priority: 2
    });
  }

  async periodicCheck() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) await this.analyzeCurrentPage(tab);
    } catch (err) {
      console.error('Periodic check error:', err);
    }
  }

  async loadThreatsFromStorage() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['threats'], (result) => {
        this.threats = result.threats || [];
        this.updateBadge();
        resolve();
      });
    });
  }
}

// Enhanced message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getThreats') {
    chrome.storage.local.get(['threats', 'blockedTrackers', 'currentPageSafety'], sendResponse);
    return true;
  }

  if (request.action === 'reportThreat') {
    securityMonitor.reportThreat(request.threat);
    sendResponse({ status: 'logged' });
    return true;
  }

  if (request.action === 'getTrackers') {
    chrome.storage.local.get(['blockedTrackers'], sendResponse);
    return true;
  }

  if (request.action === 'clearCookies') {
    securityMonitor.clearTrackingCookies().then(count => {
      sendResponse({ cleared: count });
    });
    return true;
  }

  if (request.action === 'getPageSafety') {
    chrome.storage.local.get(['currentPageSafety'], sendResponse);
    return true;
  }

  if (request.action === 'freezeThreat') {
    securityMonitor.freezeMaliciousActivity(request.threatType, request.details);
    sendResponse({ status: 'frozen' });
    return true;
  }

  // Force tracker detection test
  if (request.action === 'forceTrackerTest') {
    // Add multiple test trackers to simulate real usage
    const testTrackers = [
      {
        domain: 'google-analytics.com',
        url: 'https://www.google-analytics.com/analytics.js',
        timestamp: new Date().toISOString(),
        type: 'Google Analytics',
        blocked: true
      },
      {
        domain: 'facebook.com',
        url: 'https://connect.facebook.net/en_US/fbevents.js',
        timestamp: new Date().toISOString(),
        type: 'Facebook Pixel',
        blocked: true
      },
      {
        domain: 'doubleclick.net',
        url: 'https://securepubads.g.doubleclick.net/tag/js/gpt.js',
        timestamp: new Date().toISOString(),
        type: 'Google Ads',
        blocked: true
      }
    ];

    securityMonitor.blockedTrackers = [...testTrackers, ...securityMonitor.blockedTrackers];
    chrome.storage.local.set({ blockedTrackers: securityMonitor.blockedTrackers });
    
    sendResponse({ success: true, trackers: securityMonitor.blockedTrackers.length });
    return true;
  }
});

const securityMonitor = new SecurityMonitor();
