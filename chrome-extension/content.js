// content.js - Real password monitoring
console.log('🔒 CyberPet content script loaded');

class PasswordMonitor {
  constructor() {
    this.monitoredFields = new Set();
    this.init();
  }

  init() {
    this.monitorPasswordFields();
    this.checkExistingPasswordFields();
    this.observeDOMChanges();
  }

  monitorPasswordFields() {
    document.addEventListener('input', (event) => {
      if (event.target.type === 'password' && event.target.value.length > 0) {
        this.analyzePasswordStrength(event.target.value);
      }
    });

    document.addEventListener('blur', (event) => {
      if (event.target.type === 'password' && event.target.value.length > 0) {
        this.analyzePasswordStrength(event.target.value);
      }
    });
  }

  checkExistingPasswordFields() {
    const passwordFields = document.querySelectorAll('input[type="password"]');
    passwordFields.forEach(field => {
      if (field.value && !this.monitoredFields.has(field)) {
        this.monitoredFields.add(field);
        this.analyzePasswordStrength(field.value);
      }
    });
  }

  observeDOMChanges() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            const passwordFields = node.querySelectorAll ? node.querySelectorAll('input[type="password"]') : [];
            passwordFields.forEach(field => {
              if (!this.monitoredFields.has(field)) {
                this.monitoredFields.add(field);
                field.addEventListener('input', (event) => {
                  this.analyzePasswordStrength(event.target.value);
                });
              }
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  analyzePasswordStrength(password) {
    if (!password || password.length < 4) return;

    const strength = this.calculatePasswordStrength(password);
    
    if (strength.strength === 'weak' || strength.strength === 'very-weak') {
      this.reportWeakPassword(strength);
    }
  }

  calculatePasswordStrength(password) {
    let score = 0;
    let feedback = [];

    // Length
    if (password.length >= 12) score += 2;
    else if (password.length >= 8) score += 1;
    else feedback.push('Too short');

    // Character variety
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    // Weak pattern checks
    const weakPatterns = [
      /^[0-9]+$/, /^[a-zA-Z]+$/, /^(.)\1+$/, 
      /password/i, /123456/, /qwerty/i, /admin/i,
      /letmein/i, /welcome/i, /12345678/, /123456789/
    ];
    
    const isWeak = weakPatterns.some(pattern => pattern.test(password));
    if (isWeak) {
      score = Math.max(0, score - 2);
      feedback.push('Common pattern detected');
    }

    // Determine strength
    let strength = 'weak';
    if (score >= 5) strength = 'strong';
    else if (score >= 3) strength = 'medium';

    return { strength, score, feedback };
  }

  reportWeakPassword(strengthInfo) {
    const threat = {
      type: 'weak_password',
      message: 'Weak password detected on page',
      severity: 'warning',
      strength: strengthInfo.strength,
      feedback: strengthInfo.feedback,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    // Send to background script
    chrome.runtime.sendMessage({
      action: 'reportThreat',
      threat: threat
    });
  }
}

// Check for HTTP site
if (window.location.protocol === 'http:' && !window.location.hostname.includes('localhost')) {
  chrome.runtime.sendMessage({
    action: 'reportThreat',
    threat: {
      type: 'insecure_connection',
      message: `Unencrypted HTTP connection: ${window.location.hostname}`,
      severity: 'warning',
      url: window.location.href,
      timestamp: new Date().toISOString()
    }
  });
}

// Initialize password monitoring
const passwordMonitor = new PasswordMonitor();
