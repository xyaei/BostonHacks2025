// utils/urlAnalyzer.js
export class URLAnalyzer {
  constructor() {
    this.suspiciousTLDs = ['.xyz', '.tk', '.ml', '.ga', '.cf', '.gq', '.top', '.club'];
    this.legitimateDomains = [
      'google.com', 'facebook.com', 'amazon.com', 'paypal.com',
      'microsoft.com', 'apple.com', 'netflix.com', 'twitter.com',
      'instagram.com', 'linkedin.com', 'github.com', 'stackoverflow.com'
    ];
  }

  async analyze(url) {
    const checks = {
      is_threat: false,
      threat_type: null,
      severity: 0,
      reason: ''
    };

    // Check 1: HTTPS
    if (url.startsWith('http://') && !url.includes('localhost')) {
      checks.is_threat = true;
      checks.threat_type = 'insecure_connection';
      checks.severity = 40;
      checks.reason = 'Using HTTP instead of HTTPS - data not encrypted';
      return checks;
    }

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');

      // Check 2: Suspicious TLD
      const hasSuspiciousTLD = this.suspiciousTLDs.some(tld => domain.endsWith(tld));
      if (hasSuspiciousTLD) {
        checks.is_threat = true;
        checks.threat_type = 'suspicious_domain';
        checks.severity = 60;
        checks.reason = 'Domain uses suspicious top-level domain often used in scams';
        return checks;
      }

      // Check 3: Typosquatting
      for (const legit of this.legitimateDomains) {
        const similarity = this.levenshteinSimilarity(domain, legit);
        if (similarity > 0.7 && similarity < 1.0) {
          checks.is_threat = true;
          checks.threat_type = 'phishing_typosquatting';
          checks.severity = 85;
          checks.reason = `Domain looks like fake version of ${legit}`;
          return checks;
        }
      }

      // Check 4: Phishing keywords in subdomain or path
      if (this.hasPhishingKeywords(url)) {
        checks.is_threat = true;
        checks.threat_type = 'phishing_url';
        checks.severity = 75;
        checks.reason = 'URL contains phishing keywords';
        return checks;
      }

    } catch (e) {
      // Invalid URL
      checks.is_threat = true;
      checks.threat_type = 'malformed_url';
      checks.severity = 30;
      checks.reason = 'Malformed or suspicious URL structure';
    }

    return checks;
  }

  levenshteinSimilarity(s1, s2) {
    if (!s1 || !s2) return 0;
    
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.editDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  editDistance(s1, s2) {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

  hasPhishingKeywords(url) {
    const keywords = [
      'verify', 'account', 'suspended', 'update', 'confirm',
      'secure', 'banking', 'signin', 'login', 'password-reset',
      'authenticate', 'validation', 'verification', 'security-update'
    ];
    const lowerUrl = url.toLowerCase();
    return keywords.some(keyword => lowerUrl.includes(keyword));
  }
}