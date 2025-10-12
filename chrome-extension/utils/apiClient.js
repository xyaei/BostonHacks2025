// utils/apiClient.js
class APIClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async sendSecurityEvent(event) {
    try {
      console.log('📡 Sending security event:', event);
      const res = await fetch(`${this.baseURL}/api/security-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      console.log('✅ Event sent successfully');
    } catch (err) {
      console.error('❌ Failed to send event:', err);
      this.queueFailedEvent(event);
    }
  }

  queueFailedEvent(event) {
    chrome.storage.local.get(['failedEvents'], (result) => {
      const failed = result.failedEvents || [];
      failed.push({ ...event, failedAt: Date.now() });
      chrome.storage.local.set({ failedEvents: failed });
      console.log('💾 Queued failed event');
    });
  }
}
