# ✅ VS Code Extension - Ready to Install!

## Package Created Successfully

**File**: `ai-governance-shield-0.1.0.vsix` (522 KB)
**Location**: `/Users/ronanfagan/Downloads/AIPOLICY/ide-plugins/vscode-extension/`
**License**: Apache 2.0 ✅
**Status**: Ready to install

## Installation Methods

### Method 1: Command Line (Quick)

```bash
cd /Users/ronanfagan/Downloads/AIPOLICY/ide-plugins/vscode-extension
code --install-extension ai-governance-shield-0.1.0.vsix
```

Then restart VS Code.

### Method 2: VS Code UI

1. Open VS Code
2. Press **Ctrl+Shift+X** (Extensions)
3. Click the **"..."** menu (top right of Extensions panel)
4. Select **"Install from VSIX..."**
5. Navigate to: `/Users/ronanfagan/Downloads/AIPOLICY/ide-plugins/vscode-extension/`
6. Select: `ai-governance-shield-0.1.0.vsix`
7. Click **Install**
8. Restart VS Code

### Method 3: Development Mode (Testing)

```bash
cd /Users/ronanfagan/Downloads/AIPOLICY/ide-plugins/vscode-extension
code .
# Press F5 to launch Extension Development Host
```

## Post-Installation Setup

### 1. Configure Settings

Press **Ctrl+,** (or Cmd+, on Mac) to open settings, then add:

```json
{
  "aiGovernance.enabled": true,
  "aiGovernance.apiUrl": "http://localhost:8002",
  "aiGovernance.userEmail": "your.email@company.com",
  "aiGovernance.department": "engineering"
}
```

Or search for "AI Governance" in settings UI.

### 2. Verify Installation

**Check Status Bar:**
- Look for **🛡️ AI Gov** icon in bottom right
- Should show green if enabled
- Click it to check policy

**Run Commands:**
1. Press **Ctrl+Shift+P**
2. Type "AI Governance"
3. Try:
   - "AI Governance: Check Current Policy"
   - "AI Governance: Scan Current File"

### 3. Test Detection

**Create test file:**
```javascript
// test-sensitive.js
const apiKey = "sk-abc123xyz456789";
const ssn = "123-45-6789";
const creditCard = "4532-1234-5678-9010";
```

**Expected:**
```
⚠️ Sensitive content detected in test-sensitive.js

Found:
- API Key (Generic API Key)
- Social Security Number
- Credit Card Number

Risk Score: 100/100
```

## What the Extension Does

### 🔍 AI Tool Detection
Automatically detects and monitors:
- ✅ GitHub Copilot
- ✅ Cursor AI
- ✅ Continue.dev
- ✅ TabNine
- ✅ Codeium
- ✅ Amazon CodeWhisperer
- ✅ And 5+ more AI coding assistants

### 🛡️ Policy Enforcement
- Checks organization policy before AI tool usage
- Blocks denied tools automatically
- Logs all AI tool access attempts
- Supports admin override requests

### 📝 Content Scanning
Scans code for:
- **PII**: SSN, credit cards, emails, phone numbers
- **Secrets**: API keys, passwords, AWS credentials
- **Proprietary**: @proprietary markers, CONFIDENTIAL tags

### 📊 Violation Logging
- Logs to Decision API at localhost:8002
- Tracks all policy decisions
- Supports compliance reporting
- Offline mode with caching

## Integration with AI Governance Platform

The extension integrates with your existing platform:

```
┌──────────────────────────────┐
│  VS Code Extension (You!)    │
│  - AI tool detection         │
│  - Content scanning          │
└───────────┬──────────────────┘
            │
            │ HTTP API
            ▼
┌──────────────────────────────┐
│  Decision API (Port 8002)    │
│  - Policy evaluation         │
└───────────┬──────────────────┘
            │
            ▼
┌──────────────────────────────┐
│  Admin Dashboard (Port 3001) │
│  - View violations           │
│  - Manage policies           │
└──────────────────────────────┘
```

## Requirements

### Before Installing:
1. **VS Code**: Version 1.85.0 or higher
2. **Decision API**: Running on localhost:8002
3. **Node.js**: Not required (extension is compiled)

### Start Decision API:
```bash
cd /Users/ronanfagan/Downloads/AIPOLICY
docker compose up -d decision-api

# Verify
curl http://localhost:8002/health
```

## Commands Available

Press **Ctrl+Shift+P** and type:

| Command | Description |
|---------|-------------|
| `AI Governance: Enable Protection` | Turn on monitoring |
| `AI Governance: Disable Protection` | Turn off monitoring |
| `AI Governance: Check Current Policy` | View active policy |
| `AI Governance: Open Settings` | Configure extension |
| `AI Governance: Request Admin Override` | Request access to blocked tool |
| `AI Governance: Scan Current File` | Scan file for sensitive content |

## Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| `aiGovernance.enabled` | Enable/disable protection | `true` |
| `aiGovernance.apiUrl` | Decision API endpoint | `http://localhost:8002` |
| `aiGovernance.userEmail` | Your email (required) | `""` |
| `aiGovernance.department` | Your department | `""` |
| `aiGovernance.blockOnDeny` | Block AI tools when denied | `true` |
| `aiGovernance.scanContent` | Scan for sensitive content | `true` |
| `aiGovernance.notifyOnViolation` | Show notifications | `true` |
| `aiGovernance.logViolations` | Log to API | `true` |
| `aiGovernance.checkInterval` | Policy check interval (sec) | `60` |
| `aiGovernance.offlineMode` | Enable offline mode | `false` |

## Troubleshooting

### Extension Not Showing Up
```bash
# Check installed extensions
code --list-extensions | grep ai-governance

# Should show:
# ai-governance.ai-governance-shield
```

### Status Bar Icon Missing
1. Restart VS Code
2. Check: View → Appearance → Show Status Bar
3. Check extension is enabled in Extensions panel

### API Connection Failed
```bash
# Start Decision API
docker compose up -d decision-api

# Test connection
curl http://localhost:8002/health

# Should return:
# {"status":"healthy",...}
```

### Settings Not Saving
- Use JSON settings (Ctrl+Shift+P → "Preferences: Open Settings (JSON)")
- Not the UI settings (sometimes buggy)

## Uninstall

### Via Command Line
```bash
code --uninstall-extension ai-governance.ai-governance-shield
```

### Via UI
1. Extensions → AI Governance Shield
2. Click "Uninstall"
3. Restart VS Code

## Distribution to Team

### Share VSIX File
```bash
# The VSIX file is portable - just send it!
scp ai-governance-shield-0.1.0.vsix user@remote:/path/

# Recipients install with:
code --install-extension ai-governance-shield-0.1.0.vsix
```

### Internal Marketplace
You can also host on an internal VS Code marketplace or file share.

## Next Steps

1. ✅ **Install the extension** (use methods above)
2. ✅ **Configure settings** (API URL, email)
3. ✅ **Test with AI tools** (install Copilot if you have it)
4. ✅ **Monitor violations** (admin dashboard at localhost:3001)
5. ✅ **Roll out to team** (distribute VSIX file)

---

## Support

- **Issues**: https://github.com/rlfagan/aigovevonr/issues
- **Docs**: See README.md in this folder
- **API**: See ../../decision-api/README.md

## License

Apache License 2.0 - See LICENSE file

---

🎉 **Extension is ready! Install now with:**

```bash
code --install-extension ai-governance-shield-0.1.0.vsix
```

Then restart VS Code and configure your settings!
