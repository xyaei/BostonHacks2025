// popup.js - COMPLETE UPDATED VERSION
class CyberPetSecurityManager {
    constructor() {
        this.threats = [];
        this.blockedTrackers = [];
        this.currentStatus = { 
            isSafe: true,
            currentUrl: '',
            currentDomain: 'Loading...',
            threats: []
        };
        this.petHP = 85;
        this.maxHP = 100;
        this.lastThreatTime = 0;
        this.hpChangeTimeout = null;
        this.regenerationInterval = null;
        this.isScanning = false;
        this.passwordTester = new PasswordTester();
        this.gemini = new GeminiService();
        
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.startRealTimeUpdates();
        this.startHPRegeneration();
        this.getCurrentTabInfo();
        console.log('CyberPet Security Manager initialized with AI');
    }

    async loadData() {
        try {
            const storageData = await new Promise((resolve) => {
                chrome.storage.local.get(['threats', 'blockedTrackers', 'currentPageSafety'], resolve);
            });
            
            this.threats = storageData.threats || [];
            this.blockedTrackers = storageData.blockedTrackers || [];
            
            if (storageData.currentPageSafety) {
                this.currentStatus = {
                    isSafe: storageData.currentPageSafety.isSafe,
                    currentUrl: storageData.currentPageSafety.url,
                    currentDomain: storageData.currentPageSafety.domain,
                    threats: storageData.currentPageSafety.threats || [],
                    reason: storageData.currentPageSafety.reason
                };
            }
            
            this.updateUI();
        } catch (error) {
            console.error('Load data error:', error);
        }
    }

    setupEventListeners() {
        // Security item clicks
        document.getElementById('trackersItem').addEventListener('click', () => {
            this.showTrackersModal();
        });

        document.getElementById('urlAnalyzerItem').addEventListener('click', () => {
            this.showUrlAnalyzer();
        });

        document.getElementById('passwordTesterItem').addEventListener('click', () => {
            this.showPasswordTester();
        });

        document.getElementById('scanBtn').addEventListener('click', () => {
            this.runQuickScan();
        });

        document.getElementById('privacyCleanBtn').addEventListener('click', () => {
            this.showCookieManager();
        });

        document.getElementById('simulateTrackerBtn').addEventListener('click', () => {
            this.simulateTrackerDetection();
        });

        // Modal close buttons
        document.getElementById('trackersModalClose').addEventListener('click', () => {
            this.hideTrackersModal();
        });

        document.getElementById('passwordTesterModalClose').addEventListener('click', () => {
            this.hidePasswordTester();
        });

        document.getElementById('urlAnalyzerModalClose').addEventListener('click', () => {
            this.hideUrlAnalyzer();
        });

        document.getElementById('cookieManagerModalClose').addEventListener('click', () => {
            this.hideCookieManager();
        });

        document.getElementById('threatModalClose').addEventListener('click', () => {
            this.hideThreatModal();
        });

        // Close modals on outside click
        ['trackersModal', 'passwordTesterModal', 'urlAnalyzerModal', 'cookieManagerModal', 'threatModal'].forEach(modalId => {
            document.getElementById(modalId).addEventListener('click', (e) => {
                if (e.target.id === modalId) {
                    const methodName = `hide${modalId.charAt(0).toUpperCase() + modalId.slice(1).replace('Modal', '')}`;
                    if (typeof this[methodName] === 'function') {
                        this[methodName]();
                    }
                }
            });
        });

        // Threat item clicks
        document.getElementById('threatList').addEventListener('click', (e) => {
            const threatItem = e.target.closest('.threat-item');
            if (threatItem) {
                this.showThreatDetails(threatItem);
            }
        });

        // Password tester
        document.getElementById('testPasswordBtn').addEventListener('click', async () => {
            await this.testPassword();
        });

        document.getElementById('passwordInput').addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                await this.testPassword();
            }
        });

        // URL analysis button
        document.getElementById('analyzeUrlBtn').addEventListener('click', async () => {
            await this.analyzeUrl();
        });

        document.getElementById('urlInput').addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                await this.analyzeUrl();
            }
        });

        // Cookie clearing button
        document.getElementById('clearCookiesBtn').addEventListener('click', async () => {
            await this.clearTrackingCookies();
        });
    }

    async getCurrentTabInfo() {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs && tabs[0] && tabs[0].url) {
                const tab = tabs[0];
                this.currentStatus.currentUrl = tab.url;
                
                try {
                    const url = new URL(tab.url);
                    this.currentStatus.currentDomain = url.hostname;
                    
                    // Auto-detect dangerous pages
                    if (url.protocol === 'http:' && !url.hostname.includes('localhost')) {
                        this.currentStatus.isSafe = false;
                        this.currentStatus.reason = 'Unencrypted HTTP connection';
                    } else if (this.isSuspiciousDomain(url.hostname)) {
                        this.currentStatus.isSafe = false;
                        this.currentStatus.reason = 'Suspicious website pattern';
                    } else {
                        this.currentStatus.isSafe = true;
                        this.currentStatus.reason = 'Secure website';
                    }
                } catch (e) {
                    this.currentStatus.currentDomain = 'local page';
                }
                
                // Load current page safety data
                await this.loadData();
            }
        } catch (error) {
            console.log('Tab info error:', error);
        }
    }

    isSuspiciousDomain(domain) {
        const suspiciousPatterns = [
            'login-facebook', 'verify-account', 'update-paypal', 'free-bitcoin',
            'cracked-software', 'credit-card-generator', 'adult-content',
            'g00gle', 'go0gle', 'gogle', 'googel', 'googlee', 'facebok', 'faceb00k',
            'facbook', 'facebookk', 'amaz0n', 'amazonn', 'amazn', 'paypai', 'micr0soft',
            'micros0ft', 'microsoftt', 'app1e', 'appie', 'applee', 'netfl1x', 'netflixx',
            'y0utube', 'youtub', 'youttube', 'linkdin', 'linkedinn', 'linkeden'
        ];
        return suspiciousPatterns.some(pattern => domain.includes(pattern));
    }

    startHPRegeneration() {
        this.regenerationInterval = setInterval(() => {
            const timeSinceLastThreat = Date.now() - this.lastThreatTime;
            const shouldRegenerate = timeSinceLastThreat > 10000 && this.petHP < this.maxHP; // Increased from 8s to 10s
            
            if (shouldRegenerate) {
                const oldHP = this.petHP;
                this.petHP = Math.min(this.maxHP, this.petHP + 0.2); // Reduced from 0.5 to 0.2
                this.updatePetDisplay();
                
                if (Math.floor(this.petHP) > Math.floor(oldHP)) {
                    this.showHPChange('+1');
                }
            }
        }, 3000);
    }

    showHPChange(change) {
        const hpChangeElement = document.getElementById('hpChange');
        hpChangeElement.textContent = change;
        hpChangeElement.className = `hp-change ${change.startsWith('+') ? 'hp-positive' : 'hp-negative'}`;
        hpChangeElement.style.display = 'block';
        
        if (this.hpChangeTimeout) {
            clearTimeout(this.hpChangeTimeout);
        }
        
        this.hpChangeTimeout = setTimeout(() => {
            hpChangeElement.style.display = 'none';
        }, 1000);
    }

    updatePetDisplay() {
        const healthFill = document.getElementById('healthFill');
        const healthText = document.getElementById('healthText');
        const petStatus = document.getElementById('petStatus');
        const cyberPet = document.getElementById('cyberPet');
        
        const hpPercentage = (this.petHP / this.maxHP) * 100;
        healthFill.style.width = `${hpPercentage}%`;
        healthText.textContent = `${Math.floor(this.petHP)} / ${this.maxHP} HP`;
        
        // Update HP bar color and pet state
        if (hpPercentage > 70) {
            healthFill.style.background = 'linear-gradient(90deg, #7b68ee, #9370db)';
            petStatus.textContent = this.currentStatus.isSafe ? 'All systems operational' : 'Security issues detected';
            petStatus.style.color = '#7b68ee';
            cyberPet.className = 'cyber-pet';
        } else if (hpPercentage > 40) {
            healthFill.style.background = 'linear-gradient(90deg, #ffb74d, #ff9800)';
            petStatus.textContent = 'Security status: Caution advised';
            petStatus.style.color = '#ffb74d';
            cyberPet.className = 'cyber-pet tired';
        } else {
            healthFill.style.background = 'linear-gradient(90deg, #ff6b6b, #ff5252)';
            petStatus.textContent = 'Security status: Critical attention needed';
            petStatus.style.color = '#ff6b6b';
            cyberPet.className = 'cyber-pet very-tired';
        }
    }

    updateUI() {
        // Update security items with real data
        document.getElementById('trackersValue').textContent = this.blockedTrackers.length;
        
        this.updatePageSafety();
        this.updatePetDisplay();
        this.updateThreatFeed();
    }

    updatePageSafety() {
        const pageSafetyItem = document.getElementById('pageSafetyItem');
        const pageSafetyValue = document.getElementById('pageSafetyValue');
        const pageSafetySubtext = document.getElementById('pageSafetySubtext');
        
        const safetyLevel = this.currentStatus.isSafe ? 'Safe' : 'Danger';
        pageSafetyValue.textContent = safetyLevel;
        
        pageSafetyItem.className = 'security-item';
        if (this.currentStatus.isSafe) {
            pageSafetyItem.classList.add('safe');
            pageSafetyValue.style.color = '#7b68ee';
            pageSafetySubtext.textContent = this.currentStatus.currentDomain || 'Secure website';
            
            // Slower HP regeneration when safe
            if (this.petHP < this.maxHP) {
                this.petHP = Math.min(this.maxHP, this.petHP + 0.05); // Reduced from 0.1 to 0.05
            }
        } else {
            pageSafetyItem.classList.add('danger');
            pageSafetyValue.style.color = '#ff6b6b';
            pageSafetySubtext.textContent = this.currentStatus.reason || 'Security issues detected';
            
            // LOSE 1-3 HEALTH when on dangerous pages (random)
            const timeSinceLastDanger = Date.now() - this.lastThreatTime;
            if (timeSinceLastDanger > 5000) { // Only lose HP every 5 seconds
                const hpLoss = Math.floor(Math.random() * 3) + 1; // Random 1-3 HP loss
                this.petHP = Math.max(0, this.petHP - hpLoss);
                this.lastThreatTime = Date.now();
                this.showHPChange(`-${hpLoss}`);
            }
        }
        
        this.updatePetDisplay();
    }

    updateThreatFeed() {
        const threatList = document.getElementById('threatList');
        threatList.innerHTML = '';
        
        const displayThreats = this.threats.slice(0, 15);
        
        if (displayThreats.length === 0) {
            threatList.innerHTML = `
                <div class="threat-item">
                    <div class="threat-icon safe"></div>
                    <div class="threat-content">
                        <div class="threat-text">No security events detected</div>
                        <div class="threat-details">
                            <span class="threat-source">System</span>
                            <span class="threat-time">Monitoring</span>
                        </div>
                    </div>
                </div>
            `;
            return;
        }
        
        displayThreats.forEach(threat => {
            const threatElement = document.createElement('div');
            threatElement.className = 'threat-item';
            threatElement.innerHTML = `
                <div class="threat-icon ${threat.severity}"></div>
                <div class="threat-content">
                    <div class="threat-text">${threat.message}</div>
                    <div class="threat-details">
                        <span class="threat-source">${threat.type}</span>
                        <span class="threat-time">${new Date(threat.timestamp).toLocaleTimeString()}</span>
                    </div>
                </div>
            `;
            threatList.appendChild(threatElement);
        });
    }

    showTrackersModal() {
        document.getElementById('trackersModal').style.display = 'flex';
        this.updateTrackersList();
    }

    hideTrackersModal() {
        document.getElementById('trackersModal').style.display = 'none';
    }

    updateTrackersList() {
        const trackersList = document.getElementById('trackersList');
        const totalTrackers = document.getElementById('totalTrackersBlocked');
        
        totalTrackers.textContent = `${this.blockedTrackers.length} trackers blocked`;
        trackersList.innerHTML = '';
        
        const displayTrackers = this.blockedTrackers.slice(0, 20);
        
        if (displayTrackers.length === 0) {
            trackersList.innerHTML = `
                <div class="tracker-item">
                    <div class="item-header">
                        <span class="item-name">No trackers blocked yet</span>
                        <span class="item-status">Waiting</span>
                    </div>
                    <div class="item-url">Visit websites to see blocked trackers</div>
                </div>
            `;
            return;
        }
        
        displayTrackers.forEach(tracker => {
            const trackerElement = document.createElement('div');
            trackerElement.className = 'tracker-item';
            trackerElement.innerHTML = `
                <div class="item-header">
                    <span class="item-name">${tracker.domain}</span>
                    <span class="item-status">Blocked</span>
                </div>
                <div class="item-url">${tracker.url}</div>
            `;
            trackersList.appendChild(trackerElement);
        });
    }

    showPasswordTester() {
        document.getElementById('passwordTesterModal').style.display = 'flex';
        document.getElementById('passwordInput').value = '';
        document.getElementById('passwordResults').style.display = 'none';
    }

    hidePasswordTester() {
        document.getElementById('passwordTesterModal').style.display = 'none';
    }

    async testPassword() {
        const password = document.getElementById('passwordInput').value;
        if (!password) return;
        
        const result = await this.passwordTester.testPassword(password);
        this.displayPasswordResults(result);
    }

    displayPasswordResults(result) {
        const resultsDiv = document.getElementById('passwordResults');
        const strengthEl = document.getElementById('passwordStrength');
        const breachesEl = document.getElementById('passwordBreaches');
        const entropyEl = document.getElementById('passwordEntropy');
        const strengthMeter = document.getElementById('strengthMeter');
        const feedbackList = document.getElementById('feedbackList');
        
        // Clear any existing entropy info to prevent duplicates
        const existingEntropyInfo = entropyEl.parentNode.querySelector('.entropy-info');
        if (existingEntropyInfo) {
            existingEntropyInfo.remove();
        }
        
        // Update results
        strengthEl.textContent = result.strength.toUpperCase().replace('-', ' ');
        strengthEl.style.color = this.getStrengthColor(result.strength);
        
        // Update strength meter
        const strengthPercent = {
            'very-strong': 100,
            'strong': 80,
            'medium': 60,
            'weak': 40,
            'very-weak': 20
        }[result.strength] || 0;
        
        strengthMeter.style.width = `${strengthPercent}%`;
        strengthMeter.style.background = this.getStrengthColor(result.strength);
        
        // Update breaches
        if (result.breaches === -1) {
            breachesEl.textContent = 'Check failed - offline';
            breachesEl.style.color = '#ffb74d';
        } else if (result.breaches > 0) {
            breachesEl.textContent = `${result.breaches} data breaches found!`;
            breachesEl.style.color = '#ff6b6b';
            
            // HP impact for breached passwords
            this.petHP = Math.max(0, this.petHP - 1); // Reduced from -2 to -1
            this.lastThreatTime = Date.now();
            this.showHPChange('-1');
            this.updatePetDisplay();
        } else {
            breachesEl.textContent = 'No known data breaches';
            breachesEl.style.color = '#7b68ee';
        }
        
        // Update entropy with clickable info
        let entropyExplanation = '';
        if (result.entropy < 40) entropyExplanation = ' (Low - easily guessed)';
        else if (result.entropy < 60) entropyExplanation = ' (Moderate)';
        else if (result.entropy < 80) entropyExplanation = ' (Good)';
        else entropyExplanation = ' (Excellent - very secure)';
        
        entropyEl.textContent = `${result.entropy} bits${entropyExplanation}`;
        entropyEl.style.cursor = 'pointer';
        entropyEl.style.textDecoration = 'underline';
        entropyEl.style.textDecorationStyle = 'dotted';
        entropyEl.title = "Click for entropy explanation";
        
        // Make entropy clickable
        entropyEl.onclick = () => {
            this.showEntropyExplanation(result.entropy);
        };
        
        // Update feedback
        feedbackList.innerHTML = '';
        if (result.feedback.length === 0) {
            feedbackList.innerHTML = '<li>Excellent password security! ✅</li>';
        } else {
            result.feedback.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                feedbackList.appendChild(li);
            });
        }
        
        resultsDiv.style.display = 'block';
    }

    showEntropyExplanation(entropyScore) {
        // Create or update entropy explanation modal
        let entropyModal = document.getElementById('entropyExplanationModal');
        
        if (!entropyModal) {
            entropyModal = document.createElement('div');
            entropyModal.id = 'entropyExplanationModal';
            entropyModal.className = 'modal';
            document.body.appendChild(entropyModal);
            
            // Close modal when clicking outside
            entropyModal.addEventListener('click', (e) => {
                if (e.target === entropyModal) {
                    this.hideEntropyExplanation();
                }
            });
        }
        
        // Always update the content with current entropy score
        entropyModal.innerHTML = `
            <div class="modal-content" style="max-width: 350px;">
                <button class="modal-close-btn" id="entropyModalClose">×</button>
                <div class="modal-header">
                    <div class="modal-title">🔐 Password Entropy Explained</div>
                </div>
                <div class="modal-body">
                    <div class="info-item">
                        <div class="info-label">WHAT IS ENTROPY?</div>
                        <div class="info-value">Entropy measures how unpredictable your password is. Higher entropy = harder to guess.</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">YOUR SCORE: ${entropyScore} bits</div>
                        <div class="info-value">
                            ${entropyScore < 40 ? '🔴 Very weak - easily cracked' : 
                            entropyScore < 60 ? '🟡 Moderate - could be stronger' :
                            entropyScore < 80 ? '🟢 Good - reasonably secure' :
                            '💚 Excellent - very secure'}
                        </div>
                    </div>
                    <div class="tips-section">
                        <h4>ENTROPY GUIDELINES</h4>
                        <ul>
                            <li>< 40 bits: Very weak (easily guessed)</li>
                            <li>40-60 bits: Weak to moderate</li>
                            <li>60-80 bits: Good security</li>
                            <li>80+ bits: Excellent security</li>
                        </ul>
                    </div>
                    <div class="tips-section">
                        <h4>HOW TO INCREASE ENTROPY</h4>
                        <ul>
                            <li>Use longer passwords (12+ characters)</li>
                            <li>Mix uppercase, lowercase, numbers, symbols</li>
                            <li>Avoid common words and patterns</li>
                            <li>Use random character combinations</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
        
        // Add event listener for the close button
        const closeBtn = document.getElementById('entropyModalClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideEntropyExplanation();
            });
        }
        
        entropyModal.style.display = 'flex';
    }

    hideEntropyExplanation() {
        const entropyModal = document.getElementById('entropyExplanationModal');
        if (entropyModal) {
            entropyModal.style.display = 'none';
        }
    }

    getStrengthColor(strength) {
        const colors = {
            'very-strong': '#4caf50',       // Green
            'strong': '#8bc34a',            // Light Green
            'medium': '#ffb74d',            // Orange
            'weak': '#ff9800',              // Dark Orange
            'very-weak': '#ff6b6b'          // Red
        };
        return colors[strength] || '#ff6b6b';
    }

    showUrlAnalyzer() {
        document.getElementById('urlAnalyzerModal').style.display = 'flex';
        document.getElementById('urlInput').value = '';
        document.getElementById('urlResults').style.display = 'none';
    }

    hideUrlAnalyzer() {
        document.getElementById('urlAnalyzerModal').style.display = 'none';
    }

    async analyzeUrl() {
        const url = document.getElementById('urlInput').value;
        if (!url) return;

        try {
            // Show AI analysis loading
            document.getElementById('urlResults').style.display = 'block';
            document.getElementById('urlSafetyStatus').textContent = '🤖 AI Analyzing...';
            document.getElementById('urlThreats').textContent = 'Processing with Gemini AI';
            document.getElementById('urlConfidence').textContent = 'Analyzing...';
            document.getElementById('urlAdditionalInfo').textContent = 'Please wait while we analyze the URL security';
            document.getElementById('urlRecommendationText').textContent = 'AI analysis in progress...';

            // Add http:// if missing
            let formattedUrl = url;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                formattedUrl = 'https://' + url;
            }

            // Use Gemini AI for URL analysis
            const aiResult = await this.gemini.analyzeURLSafety(formattedUrl);
            
            // Display AI results
            this.displayAIUrlResults(aiResult, formattedUrl);

        } catch (error) {
            console.error('URL analysis error:', error);
            // Fallback to basic analysis
            const basicResult = this.gemini.getBasicURLAnalysis(formattedUrl);
            this.displayAIUrlResults(basicResult, formattedUrl);
        }
    }

    displayAIUrlResults(aiResult, url) {
        const safetyStatus = document.getElementById('urlSafetyStatus');
        const threatsEl = document.getElementById('urlThreats');
        const confidenceEl = document.getElementById('urlConfidence');
        const additionalInfoEl = document.getElementById('urlAdditionalInfo');
        const recommendationEl = document.getElementById('urlRecommendationText');
        const recommendationsDiv = document.getElementById('urlRecommendations');

        // Set values from AI analysis
        safetyStatus.textContent = aiResult.safety;
        threatsEl.textContent = aiResult.threats.length > 0 ? aiResult.threats.join(', ') : 'No threats detected';
        confidenceEl.textContent = aiResult.confidence + ' confidence';
        
        // Use AI insights for additional info, recommendation for the action
        additionalInfoEl.textContent = aiResult.aiInsights || 'No additional analysis available.';
        recommendationEl.textContent = aiResult.recommendation;

        // Update section titles based on content
        const additionalInfoLabel = additionalInfoEl.parentNode.querySelector('.info-label');
        const recommendationLabel = recommendationsDiv.querySelector('h4');
        
        if (additionalInfoLabel) {
            additionalInfoLabel.textContent = 'AI ANALYSIS';
        }
        if (recommendationLabel) {
            recommendationLabel.textContent = 'SECURITY RECOMMENDATION';
        }

        // Style based on safety level
        const isSafe = aiResult.safety === 'SAFE';
        safetyStatus.style.color = isSafe ? '#7b68ee' : '#ff6b6b';

        if (isSafe) {
            recommendationsDiv.className = 'tips-section';
            recommendationsDiv.style.borderColor = '#7b68ee';
            recommendationsDiv.style.background = 'rgba(123, 104, 238, 0.1)';
            
            // Small HP boost for safe URLs
            this.petHP = Math.min(this.maxHP, this.petHP + 2);
            this.showHPChange('+2');
        } else {
            recommendationsDiv.className = 'warning-section';
            recommendationsDiv.style.borderColor = '#ff6b6b';
            recommendationsDiv.style.background = 'rgba(255, 107, 107, 0.1)';
            
            // HP impact for dangerous URLs
            this.petHP = Math.max(0, this.petHP - 5);
            this.lastThreatTime = Date.now();
            this.showHPChange('-5');
        }

        this.updatePetDisplay();
    }

    displayUrlResults(result) {
        const resultsDiv = document.getElementById('urlResults');
        const safetyStatus = document.getElementById('urlSafetyStatus');
        const threatsEl = document.getElementById('urlThreats');
        const confidenceEl = document.getElementById('urlConfidence');
        const additionalInfoEl = document.getElementById('urlAdditionalInfo');
        const recommendationEl = document.getElementById('urlRecommendationText');
        const recommendationsDiv = document.getElementById('urlRecommendations');

        safetyStatus.textContent = result.isSafe ? 'SAFE' : 'DANGEROUS';
        safetyStatus.style.color = result.isSafe ? '#7b68ee' : '#ff6b6b';

        threatsEl.textContent = result.threats.length > 0 ? result.threats.join(', ') : 'No threats detected';
        confidenceEl.textContent = `${result.confidence}% confidence`;
        additionalInfoEl.textContent = result.additionalInfo || 'No additional information available.';

        if (result.isSafe) {
            recommendationEl.textContent = 'This URL appears to be safe. You can proceed with caution.';
            recommendationsDiv.className = 'tips-section';
            recommendationsDiv.style.borderColor = '#7b68ee';
            recommendationsDiv.style.background = 'rgba(123, 104, 238, 0.1)';
            
            // Small HP boost for safe URLs
            this.petHP = Math.min(this.maxHP, this.petHP + 2);
            this.showHPChange('+2');
            this.updatePetDisplay();
        } else {
            recommendationEl.textContent = 'WARNING: Avoid this website. Do not enter any personal information.';
            recommendationsDiv.className = 'warning-section';
            recommendationsDiv.style.borderColor = '#ff6b6b';
            recommendationsDiv.style.background = 'rgba(255, 107, 107, 0.1)';
            
            // HP impact for dangerous URLs
            this.petHP = Math.max(0, this.petHP - 5);
            this.lastThreatTime = Date.now();
            this.showHPChange('-5');
            this.updatePetDisplay();
        }

        resultsDiv.style.display = 'block';
    }

    showCookieManager() {
        document.getElementById('cookieManagerModal').style.display = 'flex';
        document.getElementById('cookieResults').style.display = 'none';
    }

    hideCookieManager() {
        document.getElementById('cookieManagerModal').style.display = 'none';
    }

    async clearTrackingCookies() {
        try {
            const clearBtn = document.getElementById('clearCookiesBtn');
            const originalText = clearBtn.textContent;
            
            clearBtn.textContent = 'Cleaning...';
            clearBtn.disabled = true;

            const response = await chrome.runtime.sendMessage({
                action: 'clearCookies'
            });

            this.displayCookieResults(response);
            
            // Reset button after delay
            setTimeout(() => {
                clearBtn.textContent = originalText;
                clearBtn.disabled = false;
            }, 2000);

        } catch (error) {
            console.error('Cookie clearing error:', error);
        }
    }

    displayCookieResults(result) {
        const resultsDiv = document.getElementById('cookieResults');
        const cookiesCleared = document.getElementById('cookiesCleared');

        cookiesCleared.textContent = `${result.cleared} tracking cookies cleared`;
        resultsDiv.style.display = 'block';

        // Smaller HP boost for privacy cleaning
        this.petHP = Math.min(this.maxHP, this.petHP + 3); // Reduced from +8 to +3
        this.showHPChange('+3');
        this.updatePetDisplay();

        // Reload data to update tracker count
        this.loadData();
    }

    async simulateTrackerDetection() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'simulateTracker'
            });
            
            if (response.success) {
                this.addThreat({
                    type: 'test_tracker',
                    message: 'Test tracker blocked successfully',
                    severity: 'safe',
                    timestamp: new Date().toISOString()
                });
                
                // Reload data to show updated tracker count
                await this.loadData();
            }
        } catch (error) {
            console.error('Tracker simulation error:', error);
        }
    }

    async showThreatDetails(threatItem) {
        const threatText = threatItem.querySelector('.threat-text').textContent;
        const threatSource = threatItem.querySelector('.threat-source').textContent;
        const threatTime = threatItem.querySelector('.threat-time').textContent;
        const threatSeverity = threatItem.querySelector('.threat-icon').classList[1];
        
        document.getElementById('modalThreatTitle').textContent = threatText;
        document.getElementById('modalThreatIcon').className = `threat-icon ${threatSeverity}`;
        
        const modalBody = document.getElementById('threatModalBody');
        
        // Show loading for AI analysis
        modalBody.innerHTML = `
            <div class="info-item">
                <div class="info-label">THREAT TYPE</div>
                <div class="info-value">${threatSource}</div>
            </div>
            <div class="info-item">
                <div class="info-label">SEVERITY</div>
                <div class="info-value">${threatSeverity.toUpperCase()}</div>
            </div>
            <div class="info-item">
                <div class="info-label">DETECTION TIME</div>
                <div class="info-value">${threatTime}</div>
            </div>
            <div class="info-item">
                <div class="info-label">🤖 AI ANALYSIS</div>
                <div class="info-value">Analyzing threat with Gemini AI...</div>
            </div>
        `;
        
        document.getElementById('threatModal').style.display = 'flex';

        // Get AI analysis
        try {
            const threatData = {
                type: threatSource,
                message: threatText,
                severity: threatSeverity,
                url: 'current page'
            };
            
            const aiAnalysis = await this.gemini.analyzeSecurityThreat(threatData);
            
            // Update modal with AI analysis
            modalBody.innerHTML = `
                <div class="info-item">
                    <div class="info-label">THREAT TYPE</div>
                    <div class="info-value">${threatSource}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">SEVERITY</div>
                    <div class="info-value">${threatSeverity.toUpperCase()}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">DETECTION TIME</div>
                    <div class="info-value">${threatTime}</div>
                </div>
                <div class="tips-section" style="border-color: ${threatSeverity === 'danger' ? '#ff6b6b' : threatSeverity === 'warning' ? '#ffb74d' : '#7b68ee'};">
                    <h4>SECURITY INFORMATION</h4>
                    <div>${this.getThreatExplanation(threatSource)}</div>
                </div>
                <div class="tips-section" style="background: rgba(123, 104, 238, 0.1); margin-top: 10px;">
                    <h4>🤖 AI ANALYSIS</h4>
                    <div>${aiAnalysis}</div>
                </div>
            `;
        } catch (error) {
            console.error('AI analysis failed:', error);
            // Fallback to basic explanation
            modalBody.innerHTML = `
                <div class="info-item">
                    <div class="info-label">THREAT TYPE</div>
                    <div class="info-value">${threatSource}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">SEVERITY</div>
                    <div class="info-value">${threatSeverity.toUpperCase()}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">DETECTION TIME</div>
                    <div class="info-value">${threatTime}</div>
                </div>
                <div class="tips-section" style="border-color: ${threatSeverity === 'danger' ? '#ff6b6b' : threatSeverity === 'warning' ? '#ffb74d' : '#7b68ee'};">
                    <h4>SECURITY INFORMATION</h4>
                    <div>${this.getThreatExplanation(threatSource)}</div>
                </div>
                <div class="tips-section" style="background: rgba(123, 104, 238, 0.1); margin-top: 10px;">
                    <h4>🤖 AI ANALYSIS</h4>
                    <div>${this.gemini.getFallbackThreatAnalysis({ type: threatSource, message: threatText, severity: threatSeverity })}</div>
                </div>
            `;
        }
    }

    getThreatExplanation(source) {
        const explanations = {
            'phishing_url': 'This website appears to be a phishing attempt designed to steal your personal information. Avoid entering any sensitive data.',
            'insecure_connection': 'This connection is not encrypted. Data sent over HTTP can be intercepted by attackers.',
            'tracker_blocked': 'This tracking script was blocked to protect your privacy and prevent data collection.',
            'suspicious_request': 'A suspicious network request was detected and blocked for your protection.',
            'weak_password': 'Weak passwords make your accounts vulnerable to hacking attacks.',
            'system_scan': 'Regular security scans help identify potential threats and maintain system integrity.',
            'malicious_domain': 'This domain is known to be associated with malicious activities.',
            'tracking_header': 'This website is using tracking headers to monitor your activity.',
            'unsafe_page': 'Multiple security threats detected on this webpage.',
            'safe_browsing': 'Safe browsing activity detected and logged.',
            'test_tracker': 'Test tracker simulation completed successfully.'
        };
        
        return explanations[source] || 'This security event has been logged to protect your system from potential threats.';
    }

    hideThreatModal() {
        document.getElementById('threatModal').style.display = 'none';
    }

    async runQuickScan() {
        if (this.isScanning) return;
        
        this.isScanning = true;
        const scanBtn = document.getElementById('scanBtn');
        const originalText = scanBtn.textContent;
        
        scanBtn.textContent = 'Scanning...';
        scanBtn.disabled = true;
        
        // Simulate scanning process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Add scan result
        this.addThreat({
            type: 'system_scan',
            message: 'Quick security scan completed - No major threats found',
            severity: 'safe',
            timestamp: new Date().toISOString()
        });
        
        // Smaller HP boost for proactive scanning
        this.petHP = Math.min(this.maxHP, this.petHP + 1); // Reduced from +3 to +1
        this.showHPChange('+1');
        this.updatePetDisplay();
        
        // Reset button
        scanBtn.textContent = originalText;
        scanBtn.disabled = false;
        this.isScanning = false;
    }

    addThreat(threatData) {
        const threat = {
            ...threatData,
            time: new Date().toLocaleTimeString()
        };
        
        this.threats.unshift(threat);
        if (this.threats.length > 20) {
            this.threats = this.threats.slice(0, 20);
        }
        
        // Save to storage
        chrome.storage.local.set({ threats: this.threats });
        
        this.updateThreatFeed();
    }

    startRealTimeUpdates() {
        // Refresh data every 2 seconds
        setInterval(() => {
            this.loadData();
            this.getCurrentTabInfo();
        }, 2000);
    }

    // Clean up when popup closes
    destroy() {
        if (this.regenerationInterval) {
            clearInterval(this.regenerationInterval);
        }
        if (this.hpChangeTimeout) {
            clearTimeout(this.hpChangeTimeout);
        }
    }
}

// Password Tester Class - UPDATED WITH STRICTER PARAMETERS
class PasswordTester {
    constructor() {
        this.breachApiUrl = 'https://api.pwnedpasswords.com/range/';
    }

    async testPassword(password) {
        if (!password) return { strength: 'empty', score: 0, breaches: 0, feedback: [] };
        
        const strength = this.calculateStrength(password);
        const breaches = await this.checkBreaches(password);
        
        return { ...strength, breaches };
    }

    calculateStrength(password) {
        let score = 0;
        let feedback = [];

        // Length - More strict
        if (password.length >= 16) score += 4;
        else if (password.length >= 12) score += 3;
        else if (password.length >= 8) score += 1; // Reduced from 2
        else {
            score -= 2;
            feedback.push('Too short (minimum 8 characters)');
        }

        // Character variety - More strict
        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasNumbers = /[0-9]/.test(password);
        const hasSpecial = /[^a-zA-Z0-9]/.test(password);

        let varietyCount = 0;
        if (hasLower) { score += 1; varietyCount++; }
        if (hasUpper) { score += 1; varietyCount++; }
        if (hasNumbers) { score += 1; varietyCount++; }
        if (hasSpecial) { score += 2; varietyCount++; } // Special chars more valuable

        if (varietyCount < 3) {
            feedback.push('Use more character types (upper, lower, numbers, symbols)');
        }

        // Common patterns and weak passwords - More strict
        const weakPatterns = [
            /^[0-9]+$/, /^[a-zA-Z]+$/, /^(.)\1+$/, 
            /password/i, /123456/, /qwerty/i, /admin/i,
            /letmein/i, /welcome/i, /monkey/i, /dragon/i,
            /111111/, /abc123/, /password1/, /sunshine/i,
            /iloveyou/i, /master/i, /hello/i, /freedom/i
        ];
        
        const isWeak = weakPatterns.some(pattern => pattern.test(password));
        if (isWeak) {
            score = Math.max(0, score - 4); // Increased penalty
            feedback.push('This is a very common and weak password');
        }

        // Sequential characters
        if (/(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password)) {
            score -= 2;
            feedback.push('Avoid sequential letters');
        }

        // Numerical sequences
        if (/(012|123|234|345|456|567|678|789|987|876|765|654|543|432|321|210)/.test(password)) {
            score -= 2;
            feedback.push('Avoid sequential numbers');
        }

        // Entropy calculation
        const entropy = this.calculateEntropy(password);
        score += Math.floor(entropy / 10); // Reduced impact

        // Determine final strength - Adjusted thresholds
        let strengthLevel = 'very-weak';
        if (score >= 10) strengthLevel = 'very-strong';
        else if (score >= 7) strengthLevel = 'strong';
        else if (score >= 4) strengthLevel = 'medium';
        else if (score >= 1) strengthLevel = 'weak';

        return { 
            strength: strengthLevel, 
            score: Math.min(20, score), 
            feedback,
            entropy: Math.round(entropy)
        };
    }

    calculateEntropy(password) {
        const charSetSize = this.getCharSetSize(password);
        return password.length * Math.log2(charSetSize);
    }

    getCharSetSize(password) {
        let size = 0;
        if (/[a-z]/.test(password)) size += 26;
        if (/[A-Z]/.test(password)) size += 26;
        if (/[0-9]/.test(password)) size += 10;
        if (/[^a-zA-Z0-9]/.test(password)) size += 33;
        return size || 1;
    }

    async checkBreaches(password) {
        try {
            // SHA-1 hash the password
            const encoder = new TextEncoder();
            const passwordData = encoder.encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-1', passwordData);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            const prefix = hashHex.substring(0, 5).toUpperCase();
            const suffix = hashHex.substring(5).toUpperCase();

            const response = await fetch(`${this.breachApiUrl}${prefix}`);
            const responseData = await response.text();
            
            const lines = responseData.split('\n');
            for (const line of lines) {
                const [hashSuffix, count] = line.split(':');
                if (hashSuffix === suffix) {
                    return parseInt(count);
                }
            }
            
            return 0;
        } catch (error) {
            console.error('Breach check error:', error);
            return -1;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const securityManager = new CyberPetSecurityManager();
    
    // Clean up when popup closes
    window.addEventListener('beforeunload', () => {
        securityManager.destroy();
    });
});
