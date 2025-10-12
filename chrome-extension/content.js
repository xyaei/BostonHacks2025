// Content script for password monitoring and page analysis
console.log('🔒 CyberPet content script loaded');

class PasswordMonitor {
  constructor() {
    this.weakPasswords = [];
    this.init();
  }

  init() {
    // Monitor password input fields
    this.monitorPasswordFields();
    
    // Check for password fields on page load
    this.checkExistingPasswordFields();
    
    // Monitor dynamic content changes
    this.observeDOMChanges();
  }

  monitorPasswordFields() {
    document.addEventListener('input', (event) => {
      if (event.target.type === 'password') {
        this.analyzePasswordStrength(event.target.value);
      }
    });

    document.addEventListener('submit', (event) => {
      const passwordFields = document.querySelectorAll('input[type="password"]');
      passwordFields.forEach(field => {
        if (field.value) {
          this.analyzePasswordStrength(field.value);
        }
      });
    });
  }

  checkExistingPasswordFields() {
    const passwordFields = document.querySelectorAll('input[type="password"]');
    passwordFields.forEach(field => {
      if (field.value) {
        this.analyzePasswordStrength(field.value);
      }
    });
  }

  observeDOMChanges() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            const passwordFields = node.querySelectorAll ? node.querySelectorAll('input[type="password"]') : [];
            passwordFields.forEach(field => {
              field.addEventListener('input', (event) => {
                this.analyzePasswordStrength(event.target.value);
              });
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
    
    if (strength.strength === 'weak') {
      this.reportWeakPassword(strength);
    }
  }

  calculatePasswordStrength(password) {
    let score = 0;
    let feedback = [];

    // Length check
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

  // In content.js - fix the message sending
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

    console.log('🚨 Weak password detected:', strengthInfo);
  }
}

// Check for HTTP site
if (window.location.protocol === 'http:' && !window.location.hostname.includes('localhost')) {
  chrome.runtime.sendMessage({
    action: 'reportThreat',
    threat: {
      type: 'insecure_connection',
      message: `HTTP site: ${window.location.hostname}`,
      severity: 'warning',
      url: window.location.href,
      timestamp: new Date().toISOString()
    }
  });
}

// Initialize password monitoring
const passwordMonitor = new PasswordMonitor();