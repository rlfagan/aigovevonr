# AI Governance Shield - VS Code Extension

Enterprise AI policy enforcement for Visual Studio Code. Monitor and control AI coding assistants like GitHub Copilot, Cursor, Continue.dev, and more.

## Features

### 🛡️ AI Assistant Detection
- Automatically detects installed AI coding assistants
- Monitors GitHub Copilot, Cursor, Continue.dev, TabNine, Codeium, and 10+ more
- Real-time policy enforcement based on your organization's rules

### 🔍 Content Scanning
- Scans code for PII (SSNs, credit cards, emails, phone numbers)
- Detects hardcoded secrets (API keys, passwords, tokens)
- Identifies proprietary markers and confidential content
- Real-time warnings before sending code to AI services

### 📋 Policy Integration
- Integrates with AI Governance Decision API
- Supports custom policies (Blocklist, Balanced, Strict, etc.)
- Admin override workflow
- Offline mode with cached policies

### 📊 Violation Logging
- Logs all policy violations to central dashboard
- Tracks AI tool usage
- Compliance reporting
- Audit trail for security reviews

## Installation

### From VSIX File
1. Download the `.vsix` file from releases
2. Open VS Code
3. Go to Extensions (Ctrl+Shift+X)
4. Click "..." menu → "Install from VSIX..."
5. Select the downloaded `.vsix` file

### From VS Code Marketplace
```
ext install ai-governance.ai-governance-shield
```

## Configuration

### Required Settings

1. **User Email** (required for policy enforcement):
   ```json
   "aiGovernance.userEmail": "your.email@company.com"
   ```

2. **API URL** (Decision API endpoint):
   ```json
   "aiGovernance.apiUrl": "https://ai-policy.company.com"
   ```

3. **Department** (optional, for department-based policies):
   ```json
   "aiGovernance.department": "engineering"
   ```

### Optional Settings

```json
{
  "aiGovernance.enabled": true,
  "aiGovernance.blockOnDeny": true,
  "aiGovernance.scanContent": true,
  "aiGovernance.notifyOnViolation": true,
  "aiGovernance.logViolations": true,
  "aiGovernance.checkInterval": 60,
  "aiGovernance.offlineMode": false
}
```

## Usage

### Status Bar
Look for the shield icon (🛡️) in the bottom right status bar:
- **Green**: Protection active, policy allows AI tools
- **Yellow**: Warning - sensitive content detected
- **Red**: Protection disabled or policy denies AI tools

Click the status bar to check current policy.

### Commands

Access via Command Palette (Ctrl+Shift+P):

- `AI Governance: Enable Protection` - Turn on monitoring
- `AI Governance: Disable Protection` - Turn off monitoring
- `AI Governance: Check Current Policy` - View active policy
- `AI Governance: Open Settings` - Configure extension
- `AI Governance: Request Admin Override` - Request access to blocked tool
- `AI Governance: Scan Current File` - Scan file for sensitive content

### Keyboard Shortcuts

- `Ctrl+Shift+G P` - Check Policy
- `Ctrl+Shift+G S` - Scan Current File

## How It Works

### 1. AI Tool Detection
The extension monitors for installed AI coding assistants:
- Detects extensions like Copilot, Cursor, Continue.dev
- Checks policy when AI tools are activated
- Blocks or allows based on organizational policy

### 2. Policy Enforcement
When you use an AI tool:
1. Extension calls Decision API with your email and service
2. API evaluates against active policy
3. If **DENY**: Shows warning and blocks AI tool
4. If **ALLOW**: Permits usage and logs event
5. If **REVIEW**: Flags for admin review

### 3. Content Scanning
Before code is sent to AI services:
1. Scans for PII (SSN, credit cards, emails)
2. Detects hardcoded secrets (API keys, passwords)
3. Checks for proprietary markers
4. Warns if sensitive content detected

### 4. Violation Logging
All policy events are logged:
- AI tool usage attempts
- Policy decisions (ALLOW/DENY)
- Sensitive content detections
- Admin override requests

## Supported AI Tools

The extension detects and monitors:

- ✅ **GitHub Copilot** (github.copilot)
- ✅ **GitHub Copilot Chat** (github.copilot-chat)
- ✅ **Cursor AI** (cursor.cursor)
- ✅ **Continue.dev** (continue.continue)
- ✅ **TabNine** (tabnine.tabnine-vscode)
- ✅ **Codeium** (codeium.codeium)
- ✅ **Amazon CodeWhisperer** (amazonwebservices.aws-toolkit-vscode)
- ✅ **IntelliCode** (visualstudioexptteam.vscodeintellicode)
- ✅ **Cody AI** (sourcegraph.cody-ai)
- ✅ **Replit AI** (replit.replit)
- ✅ **OpenAI API** (openai.openai-api)

## Integration with AI Governance Platform

This extension is part of the **AI Governance Platform**:

```
┌─────────────────────────────────────┐
│   VS Code Extension (This!)         │
│   - AI tool detection               │
│   - Content scanning                │
│   - Policy enforcement              │
└──────────────┬──────────────────────┘
               │
               │ HTTP API
               ▼
┌─────────────────────────────────────┐
│   Decision API (FastAPI)            │
│   - Policy evaluation               │
│   - OPA integration                 │
│   - Violation logging               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Admin Dashboard (Next.js)         │
│   - Policy management               │
│   - Violations dashboard            │
│   - Admin overrides                 │
└─────────────────────────────────────┘
```

## Examples

### Example 1: GitHub Copilot Blocked
```
🚫 GitHub Copilot is blocked by your organization's AI policy

Reason: Service not in approved list
Policy: Strict AI Governance Policy

Actions:
[View Policy] [Request Override] [Disable Extension]
```

### Example 2: Sensitive Content Warning
```
⚠️ Sensitive content detected in main.py

Found:
- API Key (OpenAI API Key)
- Email Address

Risk Score: 70/100

[View Details] [Dismiss]
```

### Example 3: Policy Change
```
✅ Policy Updated

Active Policy: Balanced AI Governance Policy
Approved Tools:
- GitHub Copilot ✅
- Continue.dev ✅
- TabNine ✅

[View Full Policy]
```

## Troubleshooting

### Extension Not Working
1. Check that Decision API is running
2. Verify `aiGovernance.apiUrl` is correct
3. Ensure `aiGovernance.userEmail` is set
4. Check extension output logs (View → Output → AI Governance)

### AI Tool Not Detected
1. Make sure the AI extension is installed
2. Restart VS Code
3. Run `AI Governance: Check Current Policy`
4. Check that extension ID matches known list

### Policy Check Failing
1. Test API: `curl http://localhost:8002/health`
2. Enable offline mode if API is unavailable
3. Check network connectivity
4. Review API logs for errors

### False Positive Scans
The scanner may flag test data or examples. To reduce false positives:
- Use example.com for test emails
- Use placeholder values like `YOUR_API_KEY`
- Add TODO/FIXME comments for test data

## Development

### Building from Source
```bash
cd ide-plugins/vscode-extension
npm install
npm run compile
```

### Running in Development
```bash
# Open in VS Code
code .

# Press F5 to launch Extension Development Host
```

### Packaging
```bash
npm run package
# Creates ai-governance-shield-0.1.0.vsix
```

### Publishing
```bash
npm run publish
# Requires VSCE token
```

## Privacy & Security

### What Data is Collected?
- User email (for policy enforcement)
- Department (if configured)
- AI tool usage events
- Policy decision outcomes
- Violation details

### What Data is NOT Collected?
- Your actual code content
- File contents (unless violations detected)
- Keystrokes or editor activity
- Personal browsing history

### Data Storage
- Violations logged to Decision API
- Local cache for offline mode
- No data sent to third parties

## Support

- **Issues**: https://github.com/rlfagan/aigovevonr/issues
- **Docs**: https://github.com/rlfagan/aigovevonr
- **Email**: support@aigovernance.com

## License

Copyright © 2025 AI Governance Platform
Open Source - See LICENSE file

## Changelog

### Version 0.1.0 (2025-01-30)
- Initial release
- AI assistant detection
- Content scanning (PII, secrets)
- Policy enforcement
- Violation logging
- Status bar indicator
- Admin override workflow

---

🛡️ **Protecting your code with AI Governance Shield**
