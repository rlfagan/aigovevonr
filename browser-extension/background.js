// AI Governance Shield - Background Service Worker
// Intercepts web requests and enforces AI governance policies

const DECISION_API_URL = 'http://localhost:8000';  // Change to your API URL
const USER_EMAIL = 'john.doe@company.com';  // In production, get from SSO
const USER_DEPARTMENT = 'engineering';

// AI service domains to monitor
const AI_SERVICE_PATTERNS = [
  'openai.com',
  'chatgpt.com',
  'anthropic.com',
  'claude.ai',
  'bard.google.com',
  'gemini.google.com',
  'character.ai',
  'replika.com',
  'midjourney.com',
  'jasper.ai',
  'copilot.github.com'
];

// Check if URL is an AI service
function isAIService(url) {
  try {
    const urlObj = new URL(url);
    return AI_SERVICE_PATTERNS.some(pattern =>
      urlObj.hostname.includes(pattern)
    );
  } catch {
    return false;
  }
}

// Call Decision API
async function checkPolicy(url, content = null) {
  try {
    const response = await fetch(`${DECISION_API_URL}/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user: {
          email: USER_EMAIL,
          department: USER_DEPARTMENT,
          training_completed: true  // Get from user profile in production
        },
        action: 'access_ai_service',
        resource: {
          type: 'ai_service',
          url: url
        },
        content: content,
        context: {
          source: 'browser_plugin',
          user_agent: navigator.userAgent
        }
      })
    });

    if (!response.ok) {
      console.error('Decision API error:', response.status);
      // Fail open by default (configurable)
      return { decision: 'ALLOW', reason: 'API unavailable' };
    }

    const decision = await response.json();
    console.log('Policy decision:', decision);
    return decision;

  } catch (error) {
    console.error('Policy check failed:', error);
    // Fail open by default (configurable)
    return { decision: 'ALLOW', reason: 'Error checking policy' };
  }
}

// Intercept navigation requests
chrome.webRequest.onBeforeRequest.addListener(
  async (details) => {
    // Only check main frame navigations
    if (details.type !== 'main_frame') {
      return { cancel: false };
    }

    const url = details.url;

    // Check if it's an AI service
    if (!isAIService(url)) {
      return { cancel: false };
    }

    console.log('AI service detected:', url);

    // Check policy
    const decision = await checkPolicy(url);

    // Handle decision
    if (decision.decision === 'DENY') {
      console.log('Access denied:', decision.reason);

      // Redirect to block page
      const blockPageUrl = chrome.runtime.getURL('blocked.html') +
        '?reason=' + encodeURIComponent(decision.reason) +
        '&url=' + encodeURIComponent(url) +
        '&risk=' + decision.risk_score;

      chrome.tabs.update(details.tabId, { url: blockPageUrl });

      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'AI Service Blocked',
        message: decision.reason,
        priority: 2
      });

      return { cancel: true };
    }

    // Log allowed access
    console.log('Access allowed:', url);

    // Inject warning banner
    chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      func: (message) => {
        const banner = document.createElement('div');
        banner.id = 'ai-governance-banner';
        banner.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #fff3cd;
          color: #856404;
          padding: 12px 20px;
          text-align: center;
          z-index: 999999;
          border-bottom: 2px solid #ffc107;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 14px;
        `;
        banner.innerHTML = `
          <strong>⚠️ AI Service Monitored</strong> - ${message}
          <a href="https://policy-portal.company.com" target="_blank"
             style="color: #856404; text-decoration: underline; margin-left: 10px;">
            View Policy
          </a>
        `;
        document.body.prepend(banner);
      },
      args: [decision.reason]
    }).catch(err => console.error('Failed to inject banner:', err));

    return { cancel: false };
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

// Listen for form submissions (to check content)
chrome.webRequest.onBeforeRequest.addListener(
  async (details) => {
    if (details.method !== 'POST' || !isAIService(details.url)) {
      return { cancel: false };
    }

    // Try to extract form data
    let content = null;
    if (details.requestBody && details.requestBody.formData) {
      content = JSON.stringify(details.requestBody.formData);
    }

    // Check policy with content
    const decision = await checkPolicy(details.url, content);

    if (decision.decision === 'DENY') {
      // Block the request
      console.log('Form submission blocked:', decision.reason);

      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Content Blocked',
        message: decision.reason,
        priority: 2
      });

      return { cancel: true };
    }

    return { cancel: false };
  },
  { urls: ["<all_urls>"] },
  ["blocking", "requestBody"]
);

// Log statistics
let stats = {
  allowed: 0,
  denied: 0,
  services: {}
};

chrome.storage.local.get(['stats'], (result) => {
  if (result.stats) {
    stats = result.stats;
  }
});

function updateStats(url, decision) {
  if (decision === 'ALLOW') {
    stats.allowed++;
  } else if (decision === 'DENY') {
    stats.denied++;
  }

  const domain = new URL(url).hostname;
  if (!stats.services[domain]) {
    stats.services[domain] = { allowed: 0, denied: 0 };
  }
  if (decision === 'ALLOW') {
    stats.services[domain].allowed++;
  } else {
    stats.services[domain].denied++;
  }

  chrome.storage.local.set({ stats });
}

console.log('AI Governance Shield loaded');
