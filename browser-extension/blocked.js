// blocked.js - Script for blocked page
// Extract parameters from URL and update page content

// Extract parameters from URL
const params = new URLSearchParams(window.location.search);
const reason = params.get('reason') || 'Policy violation detected';
const blockedUrl = params.get('url') || 'Unknown';
const riskScore = params.get('risk') || '--';

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    // Update page content
    const reasonEl = document.getElementById('reason');
    const blockedUrlEl = document.getElementById('blocked-url');
    const riskBadge = document.getElementById('risk-badge');

    if (reasonEl) {
        reasonEl.textContent = reason;
    }

    if (blockedUrlEl) {
        blockedUrlEl.textContent = blockedUrl;
    }

    // Update risk badge
    if (riskBadge) {
        const riskValue = parseInt(riskScore) || 0;
        riskBadge.textContent = `Risk Score: ${riskScore}`;

        if (riskValue >= 80) {
            riskBadge.className = 'risk-badge risk-critical';
        } else if (riskValue >= 60) {
            riskBadge.className = 'risk-badge risk-high';
        } else if (riskValue > 0) {
            riskBadge.className = 'risk-badge risk-medium';
        } else {
            riskBadge.className = 'risk-badge';
        }
    }
});

// Handle close button
function closeTab() {
    window.close();
}

// Expose to window for onclick handlers
window.closeTab = closeTab;
