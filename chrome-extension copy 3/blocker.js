// blocker.js - Content script for enhanced blocking
console.log('🚫 CyberPet blocker script loaded');

class PageBlocker {
    constructor() {
        this.init();
    }

    init() {
        this.checkPageSafety();
        this.monitorPageChanges();
    }

    checkPageSafety() {
        const currentUrl = window.location.href;
        
        // Check if this is a known dangerous page
        if (this.isDangerousPage(currentUrl)) {
            this.showWarningOverlay();
        }
    }

    isDangerousPage(url) {
        const dangerousPatterns = [
            /malicious-phishing\.xyz/i,
            /fake-paypal-login\.tk/i,
            /steal-password\.ml/i,
            /virus-download\.ga/i,
            /go0gle\.com/i,
            /facebo0k\.com/i,
            /paypa1\.com/i
        ];
        
        return dangerousPatterns.some(pattern => pattern.test(url));
    }

    showWarningOverlay() {
        const overlay = document.createElement('div');
        overlay.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(10, 25, 47, 0.95);
                z-index: 999999;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: white;
                font-family: 'Segoe UI', sans-serif;
                text-align: center;
                padding: 20px;
            ">
                <div style="font-size: 80px; margin-bottom: 20px;">🚫</div>
                <h1 style="color: #ff6b6b; margin-bottom: 15px; font-size: 28px;">Security Warning</h1>
                <p style="margin-bottom: 10px; font-size: 16px; max-width: 500px;">
                    CyberPet has blocked this page because it appears to be a known phishing website.
                </p>
                <p style="margin-bottom: 20px; font-size: 14px; color: #a8b2d1;">
                    This site matches patterns of known malicious websites that steal personal information.
                </p>
                <div style="display: flex; gap: 15px; margin-top: 20px;">
                    <button id="cyberpet-back" style="
                        padding: 12px 24px;
                        background: #64ffda;
                        color: #0a192f;
                        border: none;
                        border-radius: 20px;
                        font-weight: 600;
                        cursor: pointer;
                    ">Go Back to Safety</button>
                    <button id="cyberpet-proceed" style="
                        padding: 12px 24px;
                        background: #ff6b6b;
                        color: white;
                        border: none;
                        border-radius: 20px;
                        font-weight: 600;
                        cursor: pointer;
                    ">Proceed Anyway (Not Recommended)</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        document.getElementById('cyberpet-back').addEventListener('click', () => {
            window.history.back();
        });
        
        document.getElementById('cyberpet-proceed').addEventListener('click', () => {
            overlay.remove();
        });
    }

    monitorPageChanges() {
        // Monitor for dynamic content that might be dangerous
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        this.checkNewContent(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    checkNewContent(element) {
        // Check for suspicious iframes
        const iframes = element.querySelectorAll ? element.querySelectorAll('iframe') : [];
        iframes.forEach(iframe => {
            const src = iframe.src;
            if (src && this.isDangerousPage(src)) {
                iframe.remove();
                this.reportBlockedContent('suspicious iframe');
            }
        });

        // Check for suspicious scripts
        const scripts = element.querySelectorAll ? element.querySelectorAll('script[src]') : [];
        scripts.forEach(script => {
            const src = script.src;
            if (src && this.isDangerousPage(src)) {
                script.remove();
                this.reportBlockedContent('malicious script');
            }
        });
    }

    reportBlockedContent(type) {
        chrome.runtime.sendMessage({
            action: 'reportThreat',
            threat: {
                type: 'content_blocked',
                message: `Blocked ${type} on page`,
                severity: 'warning',
                url: window.location.href,
                timestamp: new Date().toISOString(),
                source: 'Content Blocker'
            }
        });
    }
}

// Initialize blocker
new PageBlocker();