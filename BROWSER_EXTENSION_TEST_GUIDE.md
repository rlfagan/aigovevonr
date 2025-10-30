# 🧪 Browser Extension Testing Guide

## Quick Test Instructions

Follow these steps to install and test the AI Governance Shield browser extension.

---

## 📦 Step 1: Install the Extension (2 minutes)

### For Chrome/Edge/Brave:

1. **Open Extensions Page**
   ```
   Chrome: chrome://extensions/
   Edge: edge://extensions/
   Brave: brave://extensions/
   ```

2. **Enable Developer Mode**
   - Look for "Developer mode" toggle in the top-right corner
   - Turn it ON

3. **Load the Extension**
   - Click "Load unpacked" button
   - Navigate to: `/Users/ronanfagan/Downloads/AIPOLICY/browser-extension/`
   - Click "Select" or "Open"

4. **Verify Installation**
   - You should see "AI Governance Shield" in your extensions list
   - The extension icon should appear in your browser toolbar
   - Status should show "Active"

### Troubleshooting Installation:

If you see errors:
- **"Manifest file is missing"**: Make sure you selected the `browser-extension` folder, not a subfolder
- **"Icons not found"**: Icons exist in `browser-extension/icons/` - verify they're there:
  ```bash
  ls -la /Users/ronanfagan/Downloads/AIPOLICY/browser-extension/icons/
  ```

---

## 🎯 Step 2: Verify API is Running

Before testing, make sure the Decision API is running:

```bash
# Check if API is running
curl http://localhost:8002/health

# Should return:
# {"status":"healthy"}
```

If the API is not running:
```bash
# Start all services
cd /Users/ronanfagan/Downloads/AIPOLICY
docker compose up -d

# Wait for services to start
sleep 10

# Check again
curl http://localhost:8002/health
```

---

## 🧪 Step 3: Test Cases

### Test 1: Block Prohibited Service (Character.AI)

**Expected Result**: Page should be BLOCKED with a block page

1. Open a new tab in your browser
2. Navigate to: `https://character.ai`
3. **What should happen**:
   - The page should be immediately blocked
   - You'll see a custom block page (blocked.html)
   - A browser notification should appear saying "AI Service Blocked"
   - The extension icon may show a badge

**Verify in Console**:
- Open browser DevTools (F12)
- Go to Console tab
- You should see logs like:
  ```
  AI service detected: https://character.ai
  Access denied: service is prohibited
  ```

**Check the Decision API**:
```bash
# Manually test the same decision
curl -X POST http://localhost:8002/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "user": {
      "email": "john.doe@company.com",
      "department": "engineering",
      "training_completed": true
    },
    "action": "access_ai_service",
    "resource": {
      "type": "ai_service",
      "url": "https://character.ai"
    }
  }'

# Expected response:
# {"decision":"DENY","reason":"service is prohibited",...}
```

---

### Test 2: Allow with Warning (ChatGPT)

**Expected Result**: Page should LOAD with a yellow warning banner at the top

1. Open a new tab
2. Navigate to: `https://chatgpt.com`
3. **What should happen**:
   - The page loads normally
   - A yellow warning banner appears at the top saying "⚠️ AI Service Monitored"
   - The banner shows the reason and a link to view policy
   - No blocking occurs

**Verify in Console**:
```
AI service detected: https://chatgpt.com
Access allowed: https://chatgpt.com
```

**Check the Decision API**:
```bash
curl -X POST http://localhost:8002/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "user": {
      "email": "john.doe@company.com",
      "department": "engineering",
      "training_completed": true
    },
    "action": "access_ai_service",
    "resource": {
      "type": "ai_service",
      "url": "https://chatgpt.com"
    }
  }'

# Expected response:
# {"decision":"ALLOW","reason":"approved for department",...}
```

---

### Test 3: Check Extension Popup

**Expected Result**: See statistics of blocked/allowed requests

1. Click the extension icon in your toolbar
2. **What should happen**:
   - A popup opens showing:
     - "Active and monitoring" status with green dot
     - "Requests Allowed" count
     - "Requests Blocked" count
     - Recent Activity section
   - If you've tested the above, you should see counts updated

3. Click "View Dashboard" button
   - Should open the Admin UI at http://localhost:3001

---

### Test 4: Additional AI Services

Test other AI services to verify the extension is monitoring them:

#### Should be BLOCKED:
```
https://replika.com
https://janitor.ai
https://crushon.ai
```

#### Should show WARNING (allowed but monitored):
```
https://claude.ai
https://gemini.google.com
https://bard.google.com
https://copilot.github.com
```

#### Should be IGNORED (not AI services):
```
https://google.com
https://github.com
https://stackoverflow.com
```

---

## 🔍 Step 4: Verify Logging

Check that decisions are being logged to the database:

```bash
# Connect to the database
docker exec -it ai-policy-db psql -U aigovuser -d ai_governance

# View recent decisions
SELECT
    timestamp,
    user_email,
    resource_url,
    decision,
    reason,
    risk_score
FROM decisions
ORDER BY timestamp DESC
LIMIT 10;

# Exit
\q
```

You should see entries for each page you visited with the extension active.

---

## 🛠️ Step 5: Customize & Test

### Change User Configuration

Edit the extension to test different user scenarios:

```bash
# Edit the background.js file
nano /Users/ronanfagan/Downloads/AIPOLICY/browser-extension/background.js

# Or use your preferred editor:
code /Users/ronanfagan/Downloads/AIPOLICY/browser-extension/background.js
```

Change these lines (around line 5-6):
```javascript
const USER_EMAIL = 'john.doe@company.com';  // Change this
const USER_DEPARTMENT = 'engineering';       // Change this to 'marketing', 'hr', etc.
```

After editing:
1. Go back to `chrome://extensions/`
2. Click the "Reload" button (circular arrow) on your extension
3. Test again - results may differ based on department policies

---

## 📊 Step 6: Monitor in Real-Time

### Watch the Admin UI

1. Open Admin UI: http://localhost:3001
2. Keep it open in one browser tab
3. In another tab, visit AI services
4. Watch the "Recent Decisions" table update (requires refresh for now)

### Watch API Logs

```bash
# Follow Decision API logs
docker compose logs -f decision-api

# You'll see real-time logs of policy evaluations
```

### Watch Extension Console

1. Go to `chrome://extensions/`
2. Find "AI Governance Shield"
3. Click "Inspect views: service worker" (or "background page")
4. This opens DevTools for the extension
5. Go to Console tab
6. Visit AI services and watch logs in real-time

---

## 🐛 Troubleshooting

### Extension Not Blocking/Warning

**Problem**: Visiting character.ai doesn't block

**Solutions**:

1. **Check API is reachable**:
   ```bash
   curl http://localhost:8002/health
   ```

2. **Check extension console for errors**:
   - Go to `chrome://extensions/`
   - Click "Inspect views: service worker"
   - Look for errors in Console

3. **Common Issues**:
   - **CORS errors**: The API should allow `*` origin by default
   - **Network errors**: API might not be running
   - **Timeout**: API might be slow to respond

4. **Check extension permissions**:
   - Go to extension details
   - Verify "Site access" is set to "On all sites"

5. **Reload the extension**:
   - Go to `chrome://extensions/`
   - Click reload button on the extension

---

### Block Page Not Showing

**Problem**: Character.ai loads instead of showing block page

**Check**:

1. Open extension DevTools console (see above)
2. Visit character.ai
3. Look for these logs:
   ```
   AI service detected: https://character.ai
   Policy decision: {decision: "DENY", ...}
   Access denied: [reason]
   ```

4. If you don't see these logs:
   - Extension might not be loaded
   - URL matching might not work
   - Check `AI_SERVICE_PATTERNS` in background.js

---

### Warning Banner Not Appearing

**Problem**: ChatGPT loads but no yellow banner

**Check**:

1. The banner injection might fail on some sites due to CSP (Content Security Policy)
2. Check extension console for injection errors:
   ```
   Failed to inject banner: [error]
   ```

3. Try with a different site that allows ChatGPT

---

### Statistics Not Updating

**Problem**: Extension popup shows 0 for everything

**Check**:

1. Extension storage might not be persisting
2. Clear extension storage:
   ```javascript
   // In extension DevTools console:
   chrome.storage.local.clear()
   ```

3. Visit some AI services again
4. Check popup again

---

## 🧪 Advanced Testing

### Test with cURL (Bypass Extension)

Test the API directly without the extension:

```bash
# Test DENY decision
curl -X POST http://localhost:8002/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "user": {"email": "test@company.com", "department": "engineering", "training_completed": true},
    "action": "access_ai_service",
    "resource": {"url": "https://character.ai"}
  }' | jq

# Test ALLOW decision
curl -X POST http://localhost:8002/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "user": {"email": "test@company.com", "department": "engineering", "training_completed": true},
    "action": "access_ai_service",
    "resource": {"url": "https://chatgpt.com"}
  }' | jq
```

---

### Test Different Departments

```bash
# Marketing trying to use ChatGPT (should be allowed)
curl -X POST http://localhost:8002/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "user": {"email": "jane@company.com", "department": "marketing", "training_completed": true},
    "action": "access_ai_service",
    "resource": {"url": "https://chatgpt.com"}
  }' | jq

# HR trying to use ChatGPT (might be denied if not in approved_departments)
curl -X POST http://localhost:8002/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "user": {"email": "hr@company.com", "department": "hr", "training_completed": true},
    "action": "access_ai_service",
    "resource": {"url": "https://chatgpt.com"}
  }' | jq
```

---

### Test Untrained Users

```bash
# User without training (should be denied)
curl -X POST http://localhost:8002/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "user": {"email": "newbie@company.com", "department": "engineering", "training_completed": false},
    "action": "access_ai_service",
    "resource": {"url": "https://chatgpt.com"}
  }' | jq

# Expected: DENY with reason "training required"
```

---

## 📈 Success Criteria

After testing, you should have:

- ✅ Extension installed and visible in toolbar
- ✅ Character.ai blocked with block page
- ✅ ChatGPT allowed with warning banner
- ✅ Extension popup showing statistics
- ✅ Decisions logged in database
- ✅ Real-time logs visible in API and extension console
- ✅ Different departments getting different results
- ✅ Untrained users being blocked

---

## 🎯 Next Steps

Once testing is complete:

1. **Customize Policies**
   - Edit `policies/ai_governance.rego`
   - Add/remove services from blocked/approved lists
   - Define department-specific rules

2. **Deploy to Team**
   - Package the extension
   - Distribute to pilot users
   - Collect feedback

3. **Integrate with SSO**
   - Replace hardcoded USER_EMAIL and USER_DEPARTMENT
   - Pull from Okta/Azure AD/Google Workspace
   - Use real user profiles

4. **Add More Enforcement Points**
   - IDE plugins (VS Code, IntelliJ)
   - API Gateway integration
   - Proxy-level enforcement

---

## 📞 Getting Help

If you encounter issues:

1. Check extension console: `chrome://extensions/` → "Inspect views"
2. Check API logs: `docker compose logs -f decision-api`
3. Check database: `docker exec -it ai-policy-db psql -U aigovuser -d ai_governance`
4. Review this guide again
5. Check QUICKSTART.md for service troubleshooting

---

**Happy Testing! 🎉**

The extension is now ready to protect your organization from unauthorized AI usage.
