// utils/urlAnalyzer.js
export async function analyzeUrl(url) {
  const parsedUrl = new URL(url);
  const domain = parsedUrl.hostname.toLowerCase();

  const suspiciousPatterns = [
    /login.*-.*(secure|account|update)/i,
    /(verify|confirm|security|bank|apple|amazon|microsoft|paypal)/i,
    /\.ru$|\.cn$|\.tk$|\.xyz$/i
  ];

  let isDangerous = false;
  let severity = 0;
  let reasons = [];

  if (parsedUrl.protocol === 'http:') {
    isDangerous = true;
    severity += 40;
    reasons.push('Site is not using HTTPS.');
  }

  if (suspiciousPatterns.some(p => p.test(domain))) {
    isDangerous = true;
    severity += 50;
    reasons.push('Domain looks suspicious or impersonates a brand.');
  }

  try {
    const response = await fetch('http://localhost:8000/api/analyze-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await response.json();
    if (data.is_phishing) {
      isDangerous = true;
      severity += data.confidence * 50;
      reasons.push(data.reason);
    }
  } catch (err) {
    console.warn('Gemini API unavailable:', err);
  }

  return {
    isDangerous,
    severity,
    details: reasons,
    message: reasons.join(' ')
  };
}
