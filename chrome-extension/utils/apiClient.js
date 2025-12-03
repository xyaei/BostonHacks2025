// utils/apiClient.js
export class APIClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async sendSecurityEvent(event) {
    try {
      const response = await fetch(`${this.baseURL}/api/security-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to send security event:', error);
      this.queueFailedEvent(event);
    }
  }

  async logGoodBehavior(seconds) {
    try {
      await fetch(`${this.baseURL}/api/good-behavior`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ time_safe: seconds })
      });
    } catch (error) {
      console.error('Failed to log good behavior:', error);
    }
  }

  async getPetState() {
    try {
      const response = await fetch(`${this.baseURL}/api/pet-state`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get pet state:', error);
      return null;
    }
  }

  queueFailedEvent(event) {
    chrome.storage.local.get(['failedEvents'], (result) => {
      const failed = result.failedEvents || [];
      failed.push(event);
      chrome.storage.local.set({ failedEvents: failed });
    });
  }
}