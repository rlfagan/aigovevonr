// AI Governance Shield - Background Service Worker (Manifest V3)
// Monitors web requests and enforces AI governance policies

const DECISION_API_URL = 'http://localhost:8002';  // Change to your API URL
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

// Statistics
let stats = {
  allowed: 0,
  denied: 0,
  services: {}
};

// Load stats from storage
chrome.storage.local.get(['stats'], (result) => {
  if (result.stats) {
    stats = result.stats;
  }
});

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

// Update statistics
function updateStats(url, decision) {
  if (decision === 'ALLOW') {
    stats.allowed++;
  } else if (decision === 'DENY') {
    stats.denied++;
  }

  try {
    const domain = new URL(url).hostname;
    if (!stats.services[domain]) {
      stats.services[domain] = { allowed: 0, denied: 0 };
    }
    if (decision === 'ALLOW') {
      stats.services[domain].allowed++;
    } else {
      stats.services[domain].denied++;
    }
  } catch (e) {
    console.error('Error updating stats:', e);
  }

  chrome.storage.local.set({ stats });
}

// Inject warning banner
function injectWarningBanner(tabId, message) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (msg) => {
      // Check if banner already exists
      if (document.getElementById('ai-governance-banner')) {
        return;
      }

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
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      `;
      banner.innerHTML = `
        <strong>⚠️ AI Service Monitored</strong> - ${msg}
        <span style="margin-left: 15px; font-size: 12px;">
          Your activity on this site is being monitored for compliance.
        </span>
      `;

      // Wait for body to be available
      if (document.body) {
        document.body.prepend(banner);
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          document.body.prepend(banner);
        });
      }
    },
    args: [message]
  }).catch(err => {
    console.error('Failed to inject banner:', err);
  });
}

// Monitor navigation with onBeforeRequest (non-blocking)
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Only check main frame navigations
    if (details.type !== 'main_frame') {
      return;
    }

    const url = details.url;

    // Check if it's an AI service
    if (!isAIService(url)) {
      return;
    }

    console.log('AI service detected:', url);

    // Check policy asynchronously (non-blocking)
    checkPolicy(url).then(decision => {
      updateStats(url, decision.decision);

      if (decision.decision === 'DENY') {
        console.log('Access denied:', decision.reason);

        // Redirect to block page
        const blockPageUrl = chrome.runtime.getURL('blocked.html') +
          '?reason=' + encodeURIComponent(decision.reason || 'Access denied') +
          '&url=' + encodeURIComponent(url) +
          '&risk=' + (decision.risk_score || 'high');

        chrome.tabs.update(details.tabId, { url: blockPageUrl });

        // Show notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'AI Service Blocked',
          message: decision.reason || 'Access to this AI service is not permitted',
          priority: 2
        });

      } else if (decision.decision === 'ALLOW') {
        // Log allowed access
        console.log('Access allowed:', url);

        // Wait a moment for page to load before injecting banner
        setTimeout(() => {
          injectWarningBanner(details.tabId, decision.reason || 'Approved for your department');
        }, 1000);
      }
    }).catch(err => {
      console.error('Error processing policy check:', err);
    });
  },
  { urls: ["<all_urls>"] }
);

// Listen for tab updates to re-inject banner if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (isAIService(tab.url)) {
      // Re-check policy for this tab
      checkPolicy(tab.url).then(decision => {
        if (decision.decision === 'ALLOW') {
          // Re-inject banner after page loads
          setTimeout(() => {
            injectWarningBanner(tabId, decision.reason || 'Approved for your department');
          }, 500);
        }
      });
    }
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStats') {
    sendResponse({ stats: stats });
  }
  return true;
});

console.log('AI Governance Shield loaded (Manifest V3 compatible)');
