// background.js
importScripts('utils/apiClient.js', 'utils/urlAnalyzer.js');

console.log('🔒 CyberPet Guardian background service started');

class SecurityMonitor {
  constructor() {
    this.threats = [];
    this.currentTab = null;
    this.backendURL = 'http://localhost:8000';
    this.apiClient = new APIClient(this.backendURL);
    this.init();
  }

  init() {
    chrome.tabs.onActivated.addListener(this.handleTabChange.bind(this));
    chrome.webNavigation.onCompleted.addListener(this.handlePageLoad.bind(this));
    chrome.webRequest.onBeforeRequest.addListener(
      this.handleWebRequest.bind(this),
      { urls: ["<all_urls>"] }
    );
    chrome.tabs.onUpdated.addListener(this.checkHTTP.bind(this));
    chrome.alarms.create('securityCheck', { periodInMinutes: 1 });
    chrome.alarms.onAlarm.addListener(this.periodicCheck.bind(this));
    this.loadThreatsFromStorage();
  }

  async loadThreatsFromStorage() {
    try {
      const result = await chrome.storage.local.get(['threats']);
      this.threats = result.threats || [];
      this.updateBadge();
    } catch (error) {
      console.error('Error loading threats from storage:', error);
    }
  }

  async handleTabChange(activeInfo) {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      this.currentTab = tab;
      await this.analyzeCurrentPage(tab);
    } catch (error) {
      console.error('Error handling tab change:', error);
    }
  }

  async handlePageLoad(details) {
    if (details.frameId === 0) {
      try {
        const tab = await chrome.tabs.get(details.tabId);
        await this.analyzeCurrentPage(tab);
      } catch (error) {
        console.error('Error handling page load:', error);
      }
    }
  }

  async handleWebRequest(details) {
    const threat = await analyzeUrl(details.url);
    if (threat.isDangerous) {
      await this.reportThreat({
        type: 'phishing',
        message: threat.message,
        severity: 'danger',
        url: details.url,
        timestamp: new Date().toISOString()
      });
      this.updateExtensionIcon('warning');
    }
  }

  async checkHTTP(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url?.startsWith('http://') && !tab.url.startsWith('http://localhost')) {
      const threat = {
        type: 'insecure_connection',
        message: `HTTP site detected: ${new URL(tab.url).hostname}`,
        severity: 'warning',
        url: tab.url,
        timestamp: new Date().toISOString()
      };
      await this.reportThreat(threat);
      this.updateExtensionIcon('warning');
    }
  }

  async analyzeCurrentPage(tab) {
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) return;

    console.log('🔍 Analyzing page:', tab.url);
    const threat = await analyzeUrl(tab.url);

    if (threat.isDangerous) {
      await this.reportThreat({
        type: 'phishing',
        message: threat.message,
        severity: 'danger',
        url: tab.url,
        timestamp: new Date().toISOString()
      });
      this.updateExtensionIcon('danger');
    }

    this.updateBadge();
  }

  async reportThreat(threat) {
    this.threats.unshift(threat);
    if (this.threats.length > 50) this.threats.pop();

    await this.apiClient.sendSecurityEvent({
      event_type: threat.type,
      severity: threat.severity,
      message: threat.message,
      url: threat.url,
      timestamp: threat.timestamp
    });

    await this.updateStorage();
  }

  async updateStorage() {
    await chrome.storage.local.set({
      threats: this.threats,
      lastScan: new Date().toISOString(),
      threatCount: this.threats.filter(t => t.severity === 'danger').length
    });
  }

  updateExtensionIcon(status) {
    this.updateBadge();
  }

  updateBadge() {
    const dangerCount = this.threats.filter(t => t.severity === 'danger').length;
    chrome.action.setBadgeText({ text: dangerCount > 0 ? dangerCount.toString() : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF4444' });
  }

  async periodicCheck() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) await this.analyzeCurrentPage(tab);
  }
}

const securityMonitor = new SecurityMonitor();

// Message handler for popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request.action);

  if (request.action === 'getThreats') {
    chrome.storage.local.get(['threats', 'lastScan']).then(sendResponse);
    return true;
  }

  if (request.action === 'manualScan') {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab) {
        securityMonitor.analyzeCurrentPage(tab);
        sendResponse({ status: 'scan_completed' });
      } else {
        sendResponse({ status: 'no_active_tab' });
      }
    });
    return true;
  }
});
