// AI Governance Shield - Background Service Worker (Manifest V3)
// Monitors web requests and enforces AI governance policies

const DECISION_API_URL = 'http://localhost:8002';  // Change to your API URL
const USER_EMAIL = 'john.doe@company.com';  // In production, get from SSO
const USER_DEPARTMENT = 'engineering';

// AI service domains to monitor (90+ services)
const AI_SERVICE_PATTERNS = [
  // Chat & Conversational AI
  'openai.com',
  'chatgpt.com',
  'anthropic.com',
  'claude.ai',
  'bard.google.com',
  'gemini.google.com',
  'character.ai',
  'replika.com',
  'poe.com',
  'perplexity.ai',
  'you.com',
  'pi.ai',
  'inflection.ai',
  'huggingface.co/chat',
  'chat.openai.com',

  // Image Generation
  'midjourney.com',
  'stability.ai',
  'stablediffusionweb.com',
  'lexica.art',
  'playground.ai',
  'craiyon.com',
  'dall-e.com',
  'hotpot.ai',
  'artbreeder.com',
  'nightcafe.studio',
  'starryai.com',
  'dreamstudio.ai',
  'bluewillow.ai',

  // Writing & Content
  'jasper.ai',
  'copy.ai',
  'writesonic.com',
  'rytr.me',
  'contentbot.ai',
  'peppertype.ai',
  'shortly.ai',
  'wordtune.com',
  'grammarly.com',
  'quillbot.com',
  'wordai.com',
  'article-forge.com',
  'frase.io',
  'outwrite.com',

  // Code Assistance
  'copilot.github.com',
  'github.com/features/copilot',
  'tabnine.com',
  'codeium.com',
  'replit.com/ai',
  'cursor.sh',
  'sourcegraph.com/cody',
  'aws.amazon.com/codewhisperer',
  'aiXcoder.com',

  // Productivity & Business
  'notion.ai',
  'notion.so',
  'otter.ai',
  'fireflies.ai',
  'read.ai',
  'meetgeek.ai',
  'tldv.io',
  'grain.com',
  'sembly.ai',
  'microsoft.com/en-us/microsoft-365/copilot',
  'copilot.microsoft.com',
  'bing.com/chat',

  // Design Tools
  'canva.com',
  'designs.ai',
  'autodraw.com',
  'remove.bg',
  'cleanup.pictures',
  'clipdrop.co',
  'photor.io',
  'palette.fm',

  // Voice & Audio
  'murf.ai',
  'play.ht',
  'resemble.ai',
  'descript.com',
  'speechify.com',
  'elevenlabs.io',
  'wellsaidlabs.com',
  'voice.ai',
  'voicemod.net',

  // Video Generation
  'runway.ml',
  'runwayml.com',
  'synthesia.io',
  'pictory.ai',
  'steve.ai',
  'invideo.io',
  'descript.com',
  'lumen5.com',
  'elai.io',

  // Research & Analysis
  'consensus.app',
  'elicit.org',
  'scite.ai',
  'semantic-scholar.org',
  'scholarcy.com',
  'explainpaper.com',
  'paperpile.com',

  // Chatbots & Customer Service
  'intercom.com',
  'drift.com',
  'ada.cx',
  'tidio.com',
  'landbot.io',
  'botsonic.ai',

  // Marketing & SEO
  'surfer-seo.com',
  'marketmuse.com',
  'clearscope.io',
  'semrush.com',
  'adcreative.ai',

  // Legal & Compliance
  'harvey.ai',
  'casetext.com',
  'lawgeex.com',
  'luminance.com',
  'everlaw.com',

  // HR & Recruiting
  'paradox.ai',
  'eightfold.ai',
  'phenom.com',
  'hiretual.com',
  'fetcher.ai',

  // Data & Analytics
  'akkio.com',
  'obviously.ai',
  'levity.ai',
  'monkeylearn.com',

  // Translation
  'deepl.com',
  'reverso.net',
  'linguee.com',

  // Education & Training
  'khanmigo.ai',
  'quizlet.com',
  'duolingo.com',
  'coursera.org',
  'udemy.com',

  // Healthcare (if applicable)
  'ada.com',
  'buoy.health',
  'k.health',

  // Finance
  'kensho.com',
  'dataminr.com',
  'alphasense.com'
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
