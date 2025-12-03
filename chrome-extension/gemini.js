// gemini.js - IMPROVED VERSION
class GeminiService {
    constructor() {
        this.apiKey = GEMINI_API_KEY;
        this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    }

    async analyzeSecurityThreat(threatData) {
        try {
            // Check if API key is set
            if (!this.apiKey || this.apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
                return this.getFallbackThreatAnalysis(threatData);
            }

            const prompt = `As a cybersecurity expert, analyze this security threat:

Threat: ${threatData.message}
Type: ${threatData.type} 
Severity: ${threatData.severity}

Provide 2-3 sentences explaining the risk and one practical recommendation.`;

            const response = await fetch(`${this.baseURL}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    safetySettings: [
                        {
                            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        }
                    ],
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 150,
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error('Gemini analysis failed:', error);
            return this.getFallbackThreatAnalysis(threatData);
        }
    }

    getFallbackThreatAnalysis(threatData) {
        const fallbackAnalyses = {
            'unsafe_page': 'This page poses security risks due to unencrypted connections or suspicious content. Avoid entering personal information and consider using HTTPS websites instead.',
            'insecure_connection': 'HTTP connections are not encrypted, making your data vulnerable to interception. Always look for HTTPS in the address bar for secure browsing.',
            'phishing_url': 'This appears to be a phishing attempt designed to steal your credentials. Never enter passwords or sensitive data on suspicious websites.',
            'tracker_blocked': 'Tracking scripts were blocked to protect your privacy. This prevents companies from monitoring your browsing activity without permission.',
            'weak_password': 'Weak passwords are easily guessed by attackers. Use longer passwords with mixed characters and enable two-factor authentication.',
            'system_scan': 'Regular security scans help identify vulnerabilities. Keep your software updated and avoid suspicious downloads.',
            'malicious_domain': 'This domain is associated with malicious activities. Your protection system has prevented potential harm.',
            'suspicious_request': 'A suspicious network request was blocked. This protects your device from potential malware or data theft.'
        };

        return fallbackAnalyses[threatData.type] || 'This security event has been logged. Stay vigilant and avoid suspicious online activities.';
    }

    async analyzeURLSafety(url) {
        try {
            if (!this.apiKey || this.apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
                return this.getBasicURLAnalysis(url);
            }

            const prompt = `Analyze this URL for security threats and provide specific insights: ${url}

Consider: HTTPS encryption, domain reputation, phishing indicators, typosquatting, and known malicious patterns.

Provide specific threats if found or confirm safety.`;

            const response = await fetch(`${this.baseURL}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    safetySettings: [
                        {
                            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        }
                    ],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 200,
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            const aiAnalysis = data.candidates[0].content.parts[0].text;
            return this.parseAIUrlResponse(aiAnalysis, url);
        } catch (error) {
            console.error('URL analysis failed:', error);
            return this.getBasicURLAnalysis(url);
        }
    }

    parseAIUrlResponse(aiText, url) {
        const lowerUrl = url.toLowerCase();
        
        // Extract safety assessment from AI text
        let safety = 'UNKNOWN';
        let confidence = 'MEDIUM';
        let threats = [];
        let aiInsights = aiText;

        // Analyze AI response to determine safety
        if (aiText.toLowerCase().includes('safe') || aiText.toLowerCase().includes('legitimate')) {
            safety = 'SAFE';
            confidence = 'HIGH';
        } else if (aiText.toLowerCase().includes('phishing') || aiText.toLowerCase().includes('malicious') || aiText.toLowerCase().includes('danger')) {
            safety = 'DANGEROUS';
            confidence = 'HIGH';
            threats = ['Potential phishing site', 'AI-detected malicious patterns'];
        } else if (aiText.toLowerCase().includes('suspicious') || aiText.toLowerCase().includes('caution')) {
            safety = 'SUSPICIOUS';
            confidence = 'MEDIUM';
            threats = ['Suspicious characteristics detected'];
        }

        // Override with basic checks for clear cases
        if (lowerUrl.startsWith('http://') && !lowerUrl.includes('localhost')) {
            safety = 'SUSPICIOUS';
            threats = ['Unencrypted HTTP connection'];
            aiInsights = 'This site uses unencrypted HTTP, making your data vulnerable to interception. ' + aiInsights;
        }

        // Check for typosquatting and known dangerous patterns
        const dangerousPatterns = this.getDangerousPatterns(lowerUrl);
        if (dangerousPatterns.length > 0) {
            safety = 'DANGEROUS';
            threats = threats.concat(dangerousPatterns);
            aiInsights = '⚠️ ' + dangerousPatterns.join(' ') + ' ' + aiInsights;
        }

        return {
            safety: safety,
            confidence: confidence,
            threats: threats.length > 0 ? threats : ['No immediate threats detected'],
            recommendation: 'Based on security analysis',
            aiInsights: aiInsights
        };
    }

    getDangerousPatterns(url) {
        const patterns = [];
        const lowerUrl = url.toLowerCase();

        // Typosquatting patterns (common misspellings)
        const typosquattingDomains = [
            'g00gle', 'go0gle', 'gogle', 'googel', 'googlee',
            'facebok', 'faceb00k', 'facbook', 'facebookk',
            'amaz0n', 'amazonn', 'amazn', 'amazon',
            'paypai', 'paypai', 'paypai', 'paypai',
            'micr0soft', 'micros0ft', 'microsoftt',
            'app1e', 'appie', 'applee',
            'netfl1x', 'netflixx', 'netflx',
            'y0utube', 'youtub', 'youttube',
            'linkdin', 'linkedinn', 'linkeden'
        ];

        // Suspicious keywords in domains
        const suspiciousKeywords = [
            'login-', 'verify-', 'update-', 'security-', 'account-',
            'free-', 'bitcoin', 'crypto', 'generator', 'cracked',
            'unlocked', 'premium-free', 'hack-', 'cheat-'
        ];

        // Check for typosquatting
        if (typosquattingDomains.some(domain => lowerUrl.includes(domain))) {
            patterns.push('Potential typosquatting domain detected');
        }

        // Check for suspicious keywords
        if (suspiciousKeywords.some(keyword => lowerUrl.includes(keyword))) {
            patterns.push('Suspicious keywords in domain');
        }

        // Check for HTTP
        if (lowerUrl.startsWith('http://') && !lowerUrl.includes('localhost')) {
            patterns.push('Unencrypted connection');
        }

        return patterns;
    }

    getBasicURLAnalysis(url) {
        const lowerUrl = url.toLowerCase();
        const dangerousPatterns = this.getDangerousPatterns(lowerUrl);
        
        if (dangerousPatterns.length > 0) {
            return {
                safety: 'DANGEROUS',
                confidence: 'HIGH',
                threats: dangerousPatterns,
                recommendation: 'Avoid this website - potential security risk',
                aiInsights: 'Automated analysis detected multiple security concerns including potential typosquatting and unencrypted connections.'
            };
        } else if (lowerUrl.startsWith('https://') && 
                  (lowerUrl.includes('google.com') || lowerUrl.includes('github.com') || lowerUrl.includes('stackoverflow.com'))) {
            return {
                safety: 'SAFE',
                confidence: 'HIGH',
                threats: ['None'],
                recommendation: 'This is a trusted and secure website',
                aiInsights: 'This appears to be a legitimate and well-established website with proper security measures.'
            };
        } else if (lowerUrl.startsWith('http://')) {
            return {
                safety: 'SUSPICIOUS',
                confidence: 'HIGH',
                threats: ['Unencrypted HTTP connection'],
                recommendation: 'Avoid entering sensitive information',
                aiInsights: 'This site uses unencrypted HTTP, which means your data could be intercepted by others on the network.'
            };
        } else {
            return {
                safety: 'UNKNOWN',
                confidence: 'LOW',
                threats: ['Unable to fully analyze'],
                recommendation: 'Proceed with caution',
                aiInsights: 'Limited information available. Exercise caution when visiting unfamiliar websites.'
            };
        }
    }
}