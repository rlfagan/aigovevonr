# 🚀 Install VS Code Extension - Step by Step

## File Ready
✅ **Extension Package**: `ai-governance-shield-0.1.0.vsix` (525 KB)
✅ **Location**: `/Users/ronanfagan/Downloads/AIPOLICY/ide-plugins/vscode-extension/`

---

## Installation Method 1: VS Code UI (Recommended)

### Step 1: Open VS Code
Just launch Visual Studio Code

### Step 2: Open Extensions Panel
- Click the Extensions icon in the sidebar (looks like 4 squares)
- Or press: **⌘+Shift+X** (Mac) or **Ctrl+Shift+X** (Windows/Linux)

### Step 3: Install from VSIX
1. In Extensions panel, click the **"..."** menu (three dots at top right)
2. Select **"Install from VSIX..."**

   ```
   ┌─────────────────────────────────┐
   │  Extensions                  ≡  │ ← Click this menu
   │                                 │
   │  Search Extensions...           │
   │                                 │
   │  ┌─────────────────────────┐   │
   │  │ Install from VSIX...    │ ← Click here
   │  │ Disable All Extensions  │   │
   │  │ Enable All Extensions   │   │
   │  └─────────────────────────┘   │
   └─────────────────────────────────┘
   ```

3. Navigate to this folder:
   ```
   /Users/ronanfagan/Downloads/AIPOLICY/ide-plugins/vscode-extension/
   ```

4. Select the file:
   ```
   ai-governance-shield-0.1.0.vsix
   ```

5. Click **"Install"**

### Step 4: Wait for Installation
You'll see a progress notification:
```
Installing extension 'AI Governance Shield'...
```

### Step 5: Reload VS Code
After installation, you'll see:
```
✓ Extension 'AI Governance Shield' was successfully installed. Please reload Visual Studio Code to enable it.
```

Click **"Reload Now"** or restart VS Code manually.

---

## Installation Method 2: Command Line

### Step 1: Add VS Code to PATH (if not already done)

**On Mac:**
1. Open VS Code
2. Press **⌘+Shift+P** (Command Palette)
3. Type: "Shell Command: Install 'code' command in PATH"
4. Press Enter

**On Windows:**
- `code` command should work by default
- If not, add to PATH: `C:\Program Files\Microsoft VS Code\bin`

**On Linux:**
- Usually works by default
- Or add to PATH: `/usr/share/code/bin`

### Step 2: Install via Terminal

```bash
cd /Users/ronanfagan/Downloads/AIPOLICY/ide-plugins/vscode-extension
code --install-extension ai-governance-shield-0.1.0.vsix
```

**Expected Output:**
```
Installing extensions...
Extension 'ai-governance-shield' v0.1.0 was successfully installed.
```

### Step 3: Restart VS Code
```bash
# If VS Code is open, close and reopen it
```

---

## Verify Installation

### Check 1: Status Bar
Look at the **bottom right** of VS Code window:
```
┌──────────────────────────────────────────┐
│                                          │
│  Your code here...                       │
│                                          │
└──────────────────────────────────────────┘
  Ln 1, Col 1    UTF-8    🛡️ AI Gov    ← You should see this!
```

### Check 2: Extensions List
1. Open Extensions (⌘+Shift+X)
2. Search for "AI Governance"
3. You should see:
   ```
   AI Governance Shield
   v0.1.0
   ✓ Installed

   Enterprise AI policy enforcement for VS Code
   ```

### Check 3: Run Command
1. Press **⌘+Shift+P** (or Ctrl+Shift+P)
2. Type: "AI Governance"
3. You should see commands:
   ```
   > AI Governance: Enable Protection
   > AI Governance: Disable Protection
   > AI Governance: Check Current Policy
   > AI Governance: Open Settings
   > AI Governance: Request Admin Override
   > AI Governance: Scan Current File
   ```

---

## Configuration (Required)

After installation, you MUST configure these settings:

### Via Settings UI
1. Press **⌘+,** (or Ctrl+,) to open Settings
2. Search for: "AI Governance"
3. Set these values:
   - **AI Governance: Enabled** → ✓ checked
   - **AI Governance: Api Url** → `http://localhost:8002`
   - **AI Governance: User Email** → `your.email@company.com`
   - **AI Governance: Department** → `engineering` (optional)

### Via Settings JSON (Recommended)
1. Press **⌘+Shift+P** (Command Palette)
2. Type: "Preferences: Open User Settings (JSON)"
3. Add this:

```json
{
  "aiGovernance.enabled": true,
  "aiGovernance.apiUrl": "http://localhost:8002",
  "aiGovernance.userEmail": "your.email@company.com",
  "aiGovernance.department": "engineering"
}
```

4. Save the file (⌘+S)

---

## Test the Extension

### Test 1: Check Policy
1. Press **⌘+Shift+P**
2. Type: "AI Governance: Check Current Policy"
3. Press Enter

**Expected Result:**
```
Active Policy: Complete Blocklist Policy
(or whichever policy is active in your Decision API)
```

**If you get an error:**
```
Policy check failed
```

**Fix:** Make sure Decision API is running:
```bash
cd /Users/ronanfagan/Downloads/AIPOLICY
docker compose up -d decision-api

# Test it
curl http://localhost:8002/health
```

### Test 2: Scan for Sensitive Content
1. Create a new file: `test.js`
2. Paste this code:
   ```javascript
   const apiKey = "sk-abc123xyz456789";
   const ssn = "123-45-6789";
   const creditCard = "4532-1234-5678-9010";
   const email = "john.doe@company.com";
   ```
3. Press **⌘+Shift+P**
4. Type: "AI Governance: Scan Current File"
5. Press Enter

**Expected Result:**
```
⚠️ Sensitive content detected

Found:
- API Key (Generic API Key)
- Social Security Number
- Credit Card Number
- Email Address

Risk Score: 100/100
```

### Test 3: Check Status Bar
1. Look at bottom right corner
2. Should show: **🛡️ AI Gov**
3. Click on it
4. Should check policy and show status

---

## Troubleshooting

### Extension Not Showing Up

**Check installed extensions:**
1. Open Extensions panel (⌘+Shift+X)
2. Type: "@installed ai governance"
3. Should appear in list

**If not found:**
- Try installation method again
- Check VS Code version (must be 1.85.0+)
  - Help → About
- Restart VS Code completely

### "Command Not Found" Error

**Symptoms:** Commands don't appear when you type "AI Governance"

**Fix:**
1. Restart VS Code completely
2. Check extension is enabled:
   - Extensions → AI Governance Shield
   - Should NOT say "Disabled"
3. Check Developer Console:
   - Help → Toggle Developer Tools
   - Look for errors in Console tab

### Status Bar Icon Missing

**Symptoms:** No 🛡️ icon in status bar

**Fix:**
1. Make sure status bar is visible:
   - View → Appearance → Show Status Bar
2. Restart VS Code
3. Check extension logs:
   - View → Output → Select "Log (Extension Host)"
   - Look for "AI Governance Shield is now active"

### API Connection Failed

**Symptoms:** "Policy check failed" or timeout errors

**Fix:**
```bash
# 1. Start Decision API
cd /Users/ronanfagan/Downloads/AIPOLICY
docker compose up -d decision-api

# 2. Wait 30 seconds for startup

# 3. Test connection
curl http://localhost:8002/health

# Expected response:
# {"status":"healthy",...}

# 4. Try extension command again
```

---

## Uninstall (if needed)

### Via UI
1. Extensions → AI Governance Shield
2. Click "Uninstall"
3. Restart VS Code

### Via Command Line
```bash
code --uninstall-extension ai-governance.ai-governance-shield
```

---

## Next Steps After Installation

1. ✅ **Extension Installed** - Working!
2. ✅ **Settings Configured** - API URL and email set
3. ✅ **Policy Checked** - Connected to Decision API
4. ✅ **Test Scan** - Sensitive content detection works

### Now Use It!
- Open any code file
- Extension monitors in background
- Scans for sensitive data
- Logs to Decision API
- Shows warnings if needed

### If You Have AI Tools:
Install these to test AI detection:
- GitHub Copilot
- Cursor AI
- Continue.dev

Extension will automatically detect and enforce policy!

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│  AI Governance Shield - Quick Reference                 │
├─────────────────────────────────────────────────────────┤
│  Status Bar Icon:         🛡️ AI Gov                     │
│  Settings:                ⌘+, → "AI Governance"         │
│  Commands:                ⌘+Shift+P → "AI Governance"   │
│  Check Policy:            ⌘+Shift+P → Check Policy      │
│  Scan File:               ⌘+Shift+P → Scan Current File │
│  API URL:                 http://localhost:8002         │
│  Admin Dashboard:         http://localhost:3001         │
└─────────────────────────────────────────────────────────┘
```

---

🎉 **Installation Complete!**

Your VS Code now has enterprise AI governance protection!
