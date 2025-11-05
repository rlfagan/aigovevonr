# VS Code Extension - Installation & Setup Guide

## Quick Start

### 1. Install the Extension

**Option A: From Source**
```bash
cd ide-plugins/vscode-extension
npm install
npm run compile
npm run package
code --install-extension ai-governance-shield-0.1.0.vsix
```

**Option B: Development Mode**
```bash
cd ide-plugins/vscode-extension
npm install
code .
# Press F5 to launch Extension Development Host
```

### 2. Configure the Extension

After installation, configure these settings:

**Via Command Palette (Ctrl+Shift+P)**:
1. Type "Preferences: Open Settings (JSON)"
2. Add:

```json
{
  "aiGovernance.enabled": true,
  "aiGovernance.apiUrl": "http://localhost:8002",
  "aiGovernance.userEmail": "your.email@company.com",
  "aiGovernance.department": "engineering",
  "aiGovernance.blockOnDeny": true,
  "aiGovernance.scanContent": true,
  "aiGovernance.notifyOnViolation": true
}
```

**Or via Settings UI**:
1. File → Preferences → Settings
2. Search for "AI Governance"
3. Fill in required fields

### 3. Verify Installation

1. Look for shield icon (🛡️) in status bar (bottom right)
2. Open Command Palette (Ctrl+Shift+P)
3. Type "AI Governance: Check Current Policy"
4. Should show active policy from your Decision API

## Requirements

### System Requirements
- VS Code version 1.85.0 or higher
- Node.js 16+ (for development)
- Decision API running on localhost:8002 or remote server

### Decision API
The extension requires the AI Governance Decision API:

```bash
# Start Decision API
cd /Users/ronanfagan/Downloads/AIPOLICY
./start-all.sh

# Verify API is running
curl http://localhost:8002/health
```

## Configuration Options

### Required Settings

| Setting | Description | Example |
|---------|-------------|---------|
| `aiGovernance.userEmail` | Your email for policy enforcement | `john.doe@company.com` |
| `aiGovernance.apiUrl` | Decision API endpoint | `http://localhost:8002` |

### Optional Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `aiGovernance.enabled` | Enable/disable protection | `true` |
| `aiGovernance.department` | Your department | `""` |
| `aiGovernance.blockOnDeny` | Block AI tools when denied | `true` |
| `aiGovernance.scanContent` | Scan for sensitive content | `true` |
| `aiGovernance.notifyOnViolation` | Show violation notifications | `true` |
| `aiGovernance.logViolations` | Log violations to API | `true` |
| `aiGovernance.checkInterval` | Policy check interval (seconds) | `60` |
| `aiGovernance.offlineMode` | Enable offline mode | `false` |

## Testing the Extension

### Test 1: AI Tool Detection
1. Install GitHub Copilot extension
2. Open a code file
3. Extension should detect Copilot and check policy
4. Look for notification about policy decision

### Test 2: Content Scanning
1. Create a new file
2. Paste this content:
```javascript
const apiKey = "sk-abc123xyz456"; // OpenAI API key
const ssn = "123-45-6789";
const email = "john.doe@company.com";
```
3. Should see warning about sensitive content

### Test 3: Policy Check
1. Press Ctrl+Shift+P
2. Type "AI Governance: Check Current Policy"
3. Should show active policy name

### Test 4: Manual File Scan
1. Open any code file
2. Press Ctrl+Shift+P
3. Type "AI Governance: Scan Current File"
4. Should show scan results

## Troubleshooting

### Extension Not Activating
**Symptoms**: No shield icon in status bar

**Solutions**:
1. Check VS Code version: Help → About
2. Reload window: Ctrl+Shift+P → "Developer: Reload Window"
3. Check extension is enabled: Extensions → AI Governance Shield
4. View logs: Output panel → AI Governance

### API Connection Issues
**Symptoms**: "Policy check failed" in status bar

**Solutions**:
1. Verify API is running:
   ```bash
   curl http://localhost:8002/health
   ```
2. Check `aiGovernance.apiUrl` setting
3. Test network connectivity
4. Enable offline mode temporarily

### AI Tools Not Detected
**Symptoms**: Copilot works but extension doesn't react

**Solutions**:
1. Verify AI extension is installed and activated
2. Restart VS Code
3. Check extension output logs
4. Run "AI Governance: Check Current Policy"

### Scan False Positives
**Symptoms**: Test data flagged as sensitive

**Solutions**:
1. Use example.com for test emails
2. Use placeholders like YOUR_API_KEY
3. Add comments like `// test data` or `// TODO: replace`
4. Temporary: disable scanning with `"aiGovernance.scanContent": false`

## Development Setup

### Prerequisites
```bash
npm install -g @vscode/vsce
npm install -g typescript
```

### Build Steps
```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode (auto-compile)
npm run watch

# Run linter
npm run lint

# Run tests
npm run test

# Package extension
npm run package
```

### Project Structure
```
vscode-extension/
├── src/
│   ├── extension.ts              # Main entry point
│   ├── clients/
│   │   └── policyClient.ts       # API client
│   ├── detectors/
│   │   └── aiAssistantDetector.ts # AI tool detection
│   ├── scanners/
│   │   └── contentScanner.ts     # Content scanning
│   ├── config/
│   │   └── configManager.ts      # Settings management
│   ├── ui/
│   │   └── statusBarManager.ts   # Status bar UI
│   └── logging/
│       └── violationLogger.ts    # Violation logging
├── package.json                  # Extension manifest
├── tsconfig.json                 # TypeScript config
└── README.md                     # Documentation
```

## Publishing

### Test Locally
```bash
npm run package
code --install-extension ai-governance-shield-0.1.0.vsix
```

### Publish to Marketplace
```bash
# Get publisher token from https://marketplace.visualstudio.com/
vsce login ai-governance

# Publish
vsce publish
```

## Uninstallation

### Via UI
1. Extensions → AI Governance Shield
2. Click "Uninstall"
3. Reload VS Code

### Via Command Line
```bash
code --uninstall-extension ai-governance.ai-governance-shield
```

## Support

**Issues**: https://github.com/rlfagan/aigovevonr/issues
**Documentation**: See README.md
**API Docs**: See ../../decision-api/README.md

---

✅ Installation complete! Your VS Code is now protected by AI Governance Shield.
