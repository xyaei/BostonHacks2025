# backend/security_detector.py

from urllib.parse import urlparse
from typing import Dict
import Levenshtein


class SecurityDetector:
    def __init__(self):
        self.suspicious_tlds = ['.xyz', '.tk',
                                '.ml', '.ga', '.cf', '.gq', '.top']
        self.legitimate_domains = [
            'google.com', 'facebook.com', 'amazon.com', 'paypal.com',
            'microsoft.com', 'apple.com', 'github.com', 'linkedin.com'
        ]
        self.phishing_keywords = [
            'verify', 'suspend', 'account', 'update', 'confirm',
            'secure', 'banking', 'urgent', 'immediately', 'click-here'
        ]

    def analyze_url(self, url: str) -> Dict:
        """Analyzes URL for phishing indicators"""
        result = {
            "is_threat": False,
            "severity": 0,
            "reason": "",
            "threat_type": "safe"
        }

        # Check 1: HTTPS
        if url.startswith('http://') and 'localhost' not in url:
            result["is_threat"] = True
            result["severity"] = 40
            result["reason"] = "Using insecure HTTP connection instead of HTTPS"
            result["threat_type"] = "insecure_connection"
            return result

        # Check 2: Suspicious TLD
        domain = self._extract_domain(url)
        for tld in self.suspicious_tlds:
            if domain.endswith(tld):
                result["is_threat"] = True
                result["severity"] = 65
                result["reason"] = f"Suspicious domain extension {tld} commonly used in scams"
                result["threat_type"] = "suspicious_domain"
                return result

        # Check 3: Typosquatting
        for legit in self.legitimate_domains:
            similarity = Levenshtein.ratio(domain, legit)
            if 0.75 < similarity < 1.0:
                result["is_threat"] = True
                result["severity"] = 90
                result["reason"] = f"Domain '{domain}' looks like fake version of '{legit}'"
                result["threat_type"] = "phishing_typosquatting"
                return result

        # Check 4: Phishing keywords
        url_lower = url.lower()
        found_keywords = [
            kw for kw in self.phishing_keywords if kw in url_lower]
        if len(found_keywords) >= 2:
            result["is_threat"] = True
            result["severity"] = 75
            result["reason"] = f"URL contains phishing keywords: {', '.join(found_keywords)}"
            result["threat_type"] = "phishing_url"
            return result

        return result

    def check_password_strength(self, metadata: Dict) -> Dict:
        """Analyzes password without storing it"""
        score = 0
        issues = []

        length = metadata.get('length', 0)
        has_upper = metadata.get('has_upper', False)
        has_lower = metadata.get('has_lower', False)
        has_numbers = metadata.get('has_numbers', False)
        has_special = metadata.get('has_special', False)

        if length < 8:
            score += 50
            issues.append("Password too short (minimum 8 characters)")
        elif length < 12:
            score += 20
            issues.append("Password should be at least 12 characters")

        if not has_upper:
            score += 15
            issues.append("Missing uppercase letters")
        if not has_lower:
            score += 15
            issues.append("Missing lowercase letters")
        if not has_numbers:
            score += 15
            issues.append("Missing numbers")
        if not has_special:
            score += 15
            issues.append("Missing special characters")

        strength = "weak" if score >= 60 else "medium" if score >= 30 else "strong"

        return {
            "strength": strength,
            "score": min(100, score),
            "issues": issues
        }

    def _extract_domain(self, url: str) -> str:
        try:
            parsed = urlparse(url)
            return parsed.netloc.replace('www.', '')
        except:
            return ""
