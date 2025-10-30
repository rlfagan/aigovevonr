// content-script.js - PII Detection and Prevention
// Monitors paste events and input fields for sensitive data
// Also checks for personal email authentication

console.log('AI Governance - PII Protection & Personal Email Detection Active');

// Personal email domains (non-corporate)
const PERSONAL_EMAIL_DOMAINS = [
  // Major providers
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.co.uk', 'ymail.com', 'rocketmail.com',
  'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  'aol.com', 'aim.com',
  'icloud.com', 'me.com', 'mac.com',
  'protonmail.com', 'proton.me', 'pm.me',
  'mail.com', 'email.com',
  'zoho.com', 'zohomail.com',
  'gmx.com', 'gmx.net',
  'yandex.com', 'yandex.ru',
  'mail.ru',
  'inbox.com',
  'fastmail.com',
  'hushmail.com',
  'tutanota.com', 'tuta.io',
  'cock.li',
  'disroot.org',
  'mailfence.com',
  'posteo.de',
  'runbox.com'
];

// PII Detection Patterns
const PII_PATTERNS = {
  ssn: {
    pattern: /\b\d{3}-?\d{2}-?\d{4}\b/g,
    name: 'Social Security Number (SSN)',
    severity: 'critical'
  },
  email: {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    name: 'Email Address',
    severity: 'high'
  },
  creditCard: {
    pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    name: 'Credit Card Number',
    severity: 'critical'
  },
  phone: {
    pattern: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
    name: 'Phone Number',
    severity: 'medium'
  },
  ipAddress: {
    pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    name: 'IP Address',
    severity: 'medium'
  },
  apiKey: {
    pattern: /\b(?:api[_-]?key|apikey|access[_-]?token|secret[_-]?key)["\s:=]+([A-Za-z0-9_\-]{20,})/gi,
    name: 'API Key or Token',
    severity: 'critical'
  },
  awsKey: {
    pattern: /\b(AKIA[0-9A-Z]{16})\b/g,
    name: 'AWS Access Key',
    severity: 'critical'
  },
  passport: {
    pattern: /\b[A-Z]{1,2}\d{6,9}\b/g,
    name: 'Passport Number',
    severity: 'high'
  },
  driverLicense: {
    pattern: /\b[A-Z]{1,2}\d{6,8}\b/g,
    name: 'Driver License',
    severity: 'high'
  }
};

// Check if current site is an AI service
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

function isAIService() {
  return AI_SERVICE_PATTERNS.some(pattern =>
    window.location.hostname.includes(pattern)
  );
}

// Only run on AI services
if (!isAIService()) {
  console.log('Not an AI service, PII protection disabled');
} else {

// Detect PII in text
function detectPII(text) {
  const findings = [];

  for (const [key, config] of Object.entries(PII_PATTERNS)) {
    const matches = text.match(config.pattern);
    if (matches && matches.length > 0) {
      findings.push({
        type: key,
        name: config.name,
        severity: config.severity,
        count: matches.length,
        samples: matches.slice(0, 2) // First 2 matches for logging
      });
    }
  }

  return findings;
}

// Show warning modal
function showPIIWarning(findings, callback) {
  // Remove existing modal if any
  const existing = document.getElementById('ai-governance-pii-modal');
  if (existing) {
    existing.remove();
  }

  // Create modal
  const modal = document.createElement('div');
  modal.id = 'ai-governance-pii-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    z-index: 9999999;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const highCount = findings.filter(f => f.severity === 'high').length;

  modal.innerHTML = `
    <div style="
      background: white;
      border-radius: 12px;
      padding: 32px;
      max-width: 500px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    ">
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          background: #fee;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
        ">⚠️</div>
        <h2 style="margin: 0; color: #dc2626; font-size: 24px;">
          Sensitive Data Detected
        </h2>
      </div>

      <div style="
        background: #fef2f2;
        border-left: 4px solid #dc2626;
        padding: 16px;
        margin: 20px 0;
        border-radius: 4px;
      ">
        <p style="margin: 0 0 12px 0; color: #991b1b; font-weight: 600;">
          Your input contains potentially sensitive information:
        </p>
        <ul style="margin: 0; padding-left: 20px; color: #991b1b;">
          ${findings.map(f => `
            <li>${f.name} (${f.count} instance${f.count > 1 ? 's' : ''})</li>
          `).join('')}
        </ul>
      </div>

      <div style="
        background: #fffbeb;
        border: 1px solid #fbbf24;
        padding: 12px;
        border-radius: 4px;
        margin-bottom: 20px;
      ">
        <p style="margin: 0; font-size: 14px; color: #78350f;">
          <strong>⚠️ Warning:</strong> Sharing sensitive data with AI services may violate:
        </p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 13px; color: #78350f;">
          <li>Company data security policies</li>
          <li>Privacy regulations (GDPR, CCPA, HIPAA)</li>
          <li>Customer confidentiality agreements</li>
        </ul>
      </div>

      <div style="margin-top: 24px; display: flex; gap: 12px;">
        <button id="pii-cancel" style="
          flex: 1;
          padding: 12px 24px;
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        ">
          🛡️ Block Submission
        </button>
        <button id="pii-proceed" style="
          flex: 1;
          padding: 12px 24px;
          background: #6b7280;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
        ">
          Proceed Anyway
        </button>
      </div>

      <p style="
        margin: 16px 0 0 0;
        font-size: 12px;
        color: #6b7280;
        text-align: center;
      ">
        This action is being logged for compliance purposes
      </p>
    </div>
  `;

  document.body.appendChild(modal);

  // Handle buttons
  document.getElementById('pii-cancel').addEventListener('click', () => {
    modal.remove();
    callback(false);

    // Log the blocked attempt
    logPIIAttempt(findings, 'blocked');
  });

  document.getElementById('pii-proceed').addEventListener('click', () => {
    modal.remove();
    callback(true);

    // Log the override
    logPIIAttempt(findings, 'override');
  });
}

// Log PII attempt to API
function logPIIAttempt(findings, action) {
  console.log('PII Detection:', action, findings);

  // Send to API for logging
  try {
    fetch('http://localhost:8002/log-pii-attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: window.location.href,
        findings: findings.map(f => ({
          type: f.type,
          name: f.name,
          severity: f.severity,
          count: f.count
        })),
        action: action,
        timestamp: new Date().toISOString()
      })
    }).catch(err => console.error('Failed to log PII attempt:', err));
  } catch (error) {
    console.error('Error logging PII attempt:', error);
  }
}

// Monitor paste events
document.addEventListener('paste', (event) => {
  const pastedText = event.clipboardData.getData('text');

  if (pastedText && pastedText.length > 5) {
    const findings = detectPII(pastedText);

    if (findings.length > 0) {
      // Check if any critical findings
      const hasCritical = findings.some(f => f.severity === 'critical');

      if (hasCritical) {
        // Block critical PII immediately
        event.preventDefault();
        event.stopPropagation();

        showPIIWarning(findings, (proceed) => {
          if (proceed) {
            // User chose to proceed - allow paste
            const target = event.target;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
              target.value += pastedText;
            } else if (target.isContentEditable) {
              document.execCommand('insertText', false, pastedText);
            }
          }
        });
      } else {
        // High/medium severity - show warning but don't block
        setTimeout(() => {
          showToast(`⚠️ Warning: Your input contains ${findings.length} potentially sensitive item(s)`, 'warning');
        }, 100);
      }
    }
  }
}, true);

// Monitor form submissions
document.addEventListener('submit', (event) => {
  const form = event.target;
  const formData = new FormData(form);
  let allText = '';

  for (const value of formData.values()) {
    if (typeof value === 'string') {
      allText += value + ' ';
    }
  }

  const findings = detectPII(allText);

  if (findings.length > 0) {
    const hasCritical = findings.some(f => f.severity === 'critical');

    if (hasCritical) {
      event.preventDefault();
      event.stopPropagation();

      showPIIWarning(findings, (proceed) => {
        if (proceed) {
          form.submit();
        }
      });
    }
  }
}, true);

// Show toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 16px 20px;
    background: ${type === 'warning' ? '#fbbf24' : '#3b82f6'};
    color: ${type === 'warning' ? '#78350f' : 'white'};
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 9999998;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    max-width: 400px;
    animation: slideIn 0.3s ease-out;
  `;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

console.log('PII Protection initialized - monitoring paste events and forms');

// ============================================================================
// PERSONAL EMAIL DETECTION
// ============================================================================

// Check if user is authenticated with a personal email
function checkPersonalEmailAuthentication() {
  console.log('Checking for personal email authentication...');

  // Check common selectors for user email displays
  const emailSelectors = [
    '[data-user-email]',
    '[class*="user-email"]',
    '[class*="account-email"]',
    '[class*="profile-email"]',
    'button[aria-label*="email"]',
    'div[class*="user"] span[class*="email"]',
    '.user-menu',
    '.account-menu',
    '.profile-dropdown'
  ];

  // Check localStorage/sessionStorage for email
  const storageKeys = [
    'user', 'userEmail', 'email', 'account', 'profile',
    'auth', 'session', 'currentUser', 'loggedInUser'
  ];

  let detectedEmail = null;

  // Check DOM elements
  for (const selector of emailSelectors) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      const text = el.textContent || el.getAttribute('data-user-email') || el.getAttribute('aria-label');
      if (text) {
        const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
        if (emailMatch) {
          detectedEmail = emailMatch[0];
        }
      }
    });
    if (detectedEmail) break;
  }

  // Check localStorage
  if (!detectedEmail) {
    for (const key of storageKeys) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          // Try parsing as JSON
          try {
            const parsed = JSON.parse(value);
            const emailFromJSON = findEmailInObject(parsed);
            if (emailFromJSON) {
              detectedEmail = emailFromJSON;
              break;
            }
          } catch {
            // Not JSON, check if it's an email
            const emailMatch = value.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
            if (emailMatch) {
              detectedEmail = emailMatch[0];
              break;
            }
          }
        }
      } catch (e) {
        // Storage access failed
      }
    }
  }

  // Check sessionStorage
  if (!detectedEmail) {
    for (const key of storageKeys) {
      try {
        const value = sessionStorage.getItem(key);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            const emailFromJSON = findEmailInObject(parsed);
            if (emailFromJSON) {
              detectedEmail = emailFromJSON;
              break;
            }
          } catch {
            const emailMatch = value.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
            if (emailMatch) {
              detectedEmail = emailMatch[0];
              break;
            }
          }
        }
      } catch (e) {
        // Storage access failed
      }
    }
  }

  if (detectedEmail) {
    console.log('Detected authenticated email:', detectedEmail);
    const isPersonal = isPersonalEmail(detectedEmail);

    if (isPersonal) {
      console.warn('⚠️ PERSONAL EMAIL DETECTED:', detectedEmail);
      showPersonalEmailWarning(detectedEmail);
      reportPersonalEmail(detectedEmail);
    } else {
      console.log('✅ Corporate email detected:', detectedEmail);
    }
  } else {
    console.log('No authenticated email detected (yet)');
  }

  return detectedEmail;
}

// Helper: Find email in nested object
function findEmailInObject(obj, depth = 0) {
  if (depth > 5) return null; // Prevent infinite recursion

  if (typeof obj === 'string') {
    const match = obj.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    return match ? match[0] : null;
  }

  if (typeof obj === 'object' && obj !== null) {
    for (const key in obj) {
      if (key.toLowerCase().includes('email') || key.toLowerCase().includes('mail')) {
        const value = obj[key];
        if (typeof value === 'string') {
          const match = value.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
          if (match) return match[0];
        }
      }
      const found = findEmailInObject(obj[key], depth + 1);
      if (found) return found;
    }
  }

  return null;
}

// Check if email is personal (not corporate)
function isPersonalEmail(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return PERSONAL_EMAIL_DOMAINS.includes(domain);
}

// Show warning banner for personal email
function showPersonalEmailWarning(email) {
  const existingBanner = document.getElementById('personal-email-warning');
  if (existingBanner) return; // Already shown

  const banner = document.createElement('div');
  banner.id = 'personal-email-warning';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
    color: white;
    padding: 16px 20px;
    text-align: center;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    animation: slideDown 0.3s ease-out;
  `;

  banner.innerHTML = `
    <div style="max-width: 1200px; margin: 0 auto;">
      <strong style="font-size: 16px;">⚠️ POLICY VIOLATION: Personal Email Detected</strong>
      <div style="margin-top: 8px; font-size: 13px;">
        You are authenticated with a personal email (<strong>${email}</strong>).
        Corporate policy requires use of company email accounts only.
      </div>
      <div style="margin-top: 10px; font-size: 12px; opacity: 0.9;">
        Please sign out and re-authenticate with your corporate email, or this session will be reported.
      </div>
    </div>
  `;

  // Add slide-down animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideDown {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);

  if (document.body) {
    document.body.prepend(banner);
    // Adjust body padding to prevent content from being hidden
    document.body.style.paddingTop = banner.offsetHeight + 'px';
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.prepend(banner);
      document.body.style.paddingTop = banner.offsetHeight + 'px';
    });
  }

  // Show notification
  chrome.runtime.sendMessage({
    type: 'PERSONAL_EMAIL_DETECTED',
    email: email,
    url: window.location.href
  });
}

// Report personal email to backend
async function reportPersonalEmail(email) {
  try {
    await fetch('http://localhost:8002/api/violations/personal-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        service: window.location.hostname,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent
      })
    });
    console.log('Personal email violation reported');
  } catch (error) {
    console.error('Failed to report personal email:', error);
  }
}

// Run check on page load
setTimeout(() => {
  checkPersonalEmailAuthentication();
}, 2000); // Wait 2 seconds for page to load

// Re-check periodically (in case user logs in after page load)
setInterval(() => {
  checkPersonalEmailAuthentication();
}, 10000); // Check every 10 seconds

// Also check when DOM changes (mutation observer)
const observer = new MutationObserver((mutations) => {
  // Only check if there are significant changes
  if (mutations.length > 5) {
    checkPersonalEmailAuthentication();
  }
});

observer.observe(document.body || document.documentElement, {
  childList: true,
  subtree: true
});

console.log('Personal email detection initialized');

} // End of isAIService check
