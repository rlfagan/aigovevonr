# 🚀 VS Code Extension - Quick Start Guide

## Install & Test in 5 Minutes

### Step 1: Install Dependencies & Compile

```bash
cd /Users/ronanfagan/Downloads/AIPOLICY/ide-plugins/vscode-extension

# Install
npm install

# Compile
npm run compile
```

### Step 2: Launch Extension (Development Mode)

```bash
# Open in VS Code
code .

# Then press F5
# This opens a new "Extension Development Host" window with your extension loaded
```

**Or use the automated script:**
```bash
./install-dev.sh
```

### Step 3: Configure the Extension

In the Extension Development Host window:

1. Press **Ctrl+Shift+P** (or Cmd+Shift+P on Mac)
2. Type "Preferences: Open Settings (JSON)"
3. Add:

```json
{
  "aiGovernance.enabled": true,
  "aiGovernance.apiUrl": "http://localhost:8002",
  "aiGovernance.userEmail": "test@company.com",
  "aiGovernance.department": "engineering"
}
```

4. Save and close

### Step 4: Verify It's Working

**Check Status Bar:**
- Look for shield icon **🛡️** in bottom right
- Should say "AI Gov" or "🛡️ AI Gov"
- Click it to check policy

**Run Commands:**
1. Press **Ctrl+Shift+P**
2. Type "AI Governance"
3. Try these commands:
   - "AI Governance: Check Current Policy"
   - "AI Governance: Scan Current File"

**Expected Output:**
```
Active Policy: Complete Blocklist Policy
(or whatever policy is active in your Decision API)
```

### Step 5: Test AI Detection

**If you have GitHub Copilot installed:**
1. Open a .js or .py file
2. Extension should detect Copilot
3. Check policy decision in notifications

**If Copilot is blocked by policy:**
```
🚫 GitHub Copilot is blocked by your organization's AI policy

Reason: Service not in approved list
Policy: Complete Blocklist Policy

[View Policy] [Request Override]
```

**If Copilot is allowed:**
```
✅ GitHub Copilot is approved for use
```

### Step 6: Test Content Scanning

Create a test file with sensitive content:

```javascript
// test-sensitive.js
const apiKey = "sk-abc123xyz456789";
const socialSecurity = "123-45-6789";
const email = "john.doe@company.com";
const creditCard = "4532-1234-5678-9010";
```

**Expected:**
```
⚠️ Sensitive content detected in test-sensitive.js

Found:
- API Key (Generic API Key)
- PII (Social Security Number)
- Email Address
- Credit Card Number

Risk Score: 100/100

[View Details] [Dismiss]
```

## Common Issues & Fixes

### Issue: Extension Not Loading

**Symptoms:** No shield icon in status bar

**Fix:**
```bash
# Reload window
Press Ctrl+Shift+P → "Developer: Reload Window"

# Check extension host output
View → Output → Select "Log (Extension Host)"

# Should see:
# "AI Governance Shield is now active"
```

### Issue: API Connection Failed

**Symptoms:** "Policy check failed" or timeout errors

**Fix:**
```bash
# 1. Check Decision API is running
curl http://localhost:8002/health

# 2. If not running, start it:
cd /Users/ronanfagan/Downloads/AIPOLICY
docker compose up -d decision-api

# 3. Wait 30 seconds and try again
```

### Issue: Compilation Errors

**Symptoms:** TypeScript errors during `npm run compile`

**Fix:**
```bash
# Clean and reinstall
rm -rf node_modules out
npm install
npm run compile
```

### Issue: Can't Find vsce Command

**Symptoms:** "vsce: command not found" when packaging

**Fix:**
```bash
npm install -g @vscode/vsce
npm run package
```

## Advanced Testing

### Test with Different Policies

1. Go to http://localhost:3001/policies
2. Activate "Balanced Policy"
3. In VS Code, run "AI Governance: Check Current Policy"
4. Should show "Balanced Policy"

### Test Admin Override

1. If AI tool is blocked, click notification
2. Select "Request Override"
3. Enter reason: "Need for testing"
4. Check admin dashboard for override request

### Test Offline Mode

1. Stop Decision API:
   ```bash
   docker compose stop decision-api
   ```
2. Extension should switch to offline mode
3. Status bar shows "Offline Mode"
4. Cached policies still work

### Test with Real AI Tools

**GitHub Copilot:**
1. Install Copilot if not already installed
2. Open a code file
3. Start typing a function
4. Extension monitors Copilot suggestions

**Cursor:**
1. If using Cursor editor (VS Code fork)
2. Extension should work identically
3. Detects Cursor AI usage

## Development Workflow

### Make Changes

1. Edit source files in `src/`
2. Save changes
3. Press **Ctrl+Shift+F5** to reload extension
4. Test changes in Extension Development Host

### View Logs

```
View → Output → AI Governance
```

Look for:
```
AI Governance Shield is now active
Starting AI assistant monitoring...
Scanning for AI extensions...
✅ AI tool allowed: GitHub Copilot
```

### Debug

1. Set breakpoints in source files
2. Press F5
3. Breakpoints hit in Extension Development Host
4. Use Debug Console

## Packaging for Distribution

### Create VSIX File

```bash
cd vscode-extension
npm run package
```

Output: `ai-governance-shield-0.1.0.vsix`

### Install VSIX in Regular VS Code

```bash
code --install-extension ai-governance-shield-0.1.0.vsix
```

Or via UI:
1. Extensions → "..." menu
2. "Install from VSIX..."
3. Select the .vsix file

### Uninstall

```bash
code --uninstall-extension ai-governance.ai-governance-shield
```

## Next Steps

1. ✅ **Extension is working** - Configure for your organization
2. ✅ **Test with real AI tools** - Install Copilot, Cursor, etc.
3. ✅ **Deploy Decision API** - See PRODUCTION_DEPLOYMENT_GUIDE.md
4. ✅ **Configure policies** - Set up Blocklist, Balanced, etc.
5. ✅ **Roll out to team** - Distribute VSIX file

## Quick Reference

### Key Files
- `src/extension.ts` - Main extension code
- `src/detectors/aiAssistantDetector.ts` - AI tool detection
- `src/scanners/contentScanner.ts` - Content scanning
- `src/clients/policyClient.ts` - API integration

### Commands
- `npm install` - Install dependencies
- `npm run compile` - Compile TypeScript
- `npm run watch` - Auto-compile on changes
- `npm run package` - Create VSIX
- `code .` then F5 - Launch development mode

### Keyboard Shortcuts (in Extension Dev Host)
- `Ctrl+Shift+P` - Command Palette
- `Ctrl+Shift+F5` - Reload extension
- `F5` - Start debugging

---

🎉 **You're ready to test!** Open VS Code, press F5, and start monitoring AI tools.
