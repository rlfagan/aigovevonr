# 🌐 Test Browser Extension - Simple Step-by-Step Guide

## 🎯 Goal
Test the AI Governance Shield browser extension by loading it into Chrome/Edge and visiting AI websites.

---

## 📦 Part 1: Install Extension (2 minutes)

### Step 1: Open Extensions Page

**In Chrome:**
1. Click the three dots menu (⋮) in top-right corner
2. Go to: **More tools** → **Extensions**
3. OR just type in address bar: `chrome://extensions/` and press Enter

**In Edge:**
1. Click the three dots menu (...) in top-right corner
2. Go to: **Extensions** → **Manage extensions**
3. OR just type in address bar: `edge://extensions/` and press Enter

---

### Step 2: Enable Developer Mode

Look at the **top-right** corner of the extensions page.

You'll see a toggle switch that says **"Developer mode"**

👉 **Turn it ON** (it should turn blue/enabled)

---

### Step 3: Load the Extension

You should now see new buttons appear. Look for:

**"Load unpacked"** button (usually in the top-left area)

1. Click **"Load unpacked"**
2. A file browser window will open
3. Navigate to: `/Users/ronanfagan/Downloads/AIPOLICY/browser-extension/`
4. Click **"Select"** or **"Open"**

---

### Step 4: Verify Installation

You should now see a new extension card that says:

```
🛡️ AI Governance Shield
Open source AI policy enforcement
v0.1.0
```

**Check these things:**
- Toggle switch is ON (enabled)
- No error messages in red
- Extension icon appears in your browser toolbar (you may need to click the puzzle piece icon to pin it)

✅ **Success!** The extension is now installed and active.

---

## 🧪 Part 2: Test Blocking (1 minute)

### Test 1: Visit Character.AI (Should be BLOCKED)

1. Open a **new tab**
2. Type in address bar: `character.ai`
3. Press Enter

### What Should Happen:

🚫 **The page should be BLOCKED!**

You should see:
- A custom block page (not the normal Character.AI website)
- The block page shows:
  - "Access Denied" message
  - Reason for blocking
  - Link to policy information
- A browser notification might pop up saying "AI Service Blocked"

### What You'll See in Browser Console (Optional):

Press `F12` to open Developer Tools, go to Console tab:
```
AI service detected: https://character.ai
Policy decision: {decision: "DENY", ...}
Access denied: service is prohibited
```

---

## ⚠️ Part 3: Test Warning Banner (1 minute)

### Test 2: Visit ChatGPT (Should Show WARNING)

1. Open a **new tab**
2. Type in address bar: `chatgpt.com`
3. Press Enter

### What Should Happen:

⚠️ **Page loads BUT with a yellow warning banner!**

You should see:
- ChatGPT website loads normally
- A **yellow banner at the very top** of the page saying:
  - "⚠️ AI Service Monitored - [reason]"
  - Link to "View Policy"
- The banner has yellow/orange background

---

## 📊 Part 4: Check Extension Statistics (1 minute)

### View the Extension Popup

1. Look at your browser toolbar
2. Find the **AI Governance Shield icon** (shield icon)
   - If you don't see it, click the puzzle piece icon and pin it
3. **Click the shield icon**

### What Should Appear:

A popup window showing:

```
🛡️ AI Governance Shield

🟢 Active and monitoring

Requests Allowed: 1
Requests Blocked: 1

Recent Activity
[Shows the sites you visited]

[View Dashboard] button
```

### Click "View Dashboard"

Should open: `http://localhost:3001` (the Admin UI)

---

## 🎯 Quick Test Summary

Try visiting these URLs and check the results:

| URL | What Should Happen |
|-----|-------------------|
| `character.ai` | 🚫 BLOCKED with block page |
| `replika.com` | 🚫 BLOCKED with block page |
| `chatgpt.com` | ⚠️ Loads with yellow warning banner |
| `claude.ai` | ⚠️ Loads with yellow warning banner |
| `google.com` | ✅ Normal (no interference) |
| `github.com` | ✅ Normal (no interference) |

---

## 🔍 Advanced: Check Extension Console

Want to see what the extension is doing behind the scenes?

1. Go back to: `chrome://extensions/`
2. Find "AI Governance Shield"
3. Look for text that says: **"Inspect views: service worker"** or **"background page"**
4. Click on **"service worker"**
5. This opens Developer Tools for the extension
6. Go to **Console** tab

Now visit `character.ai` again and watch the console. You'll see:

```javascript
AI service detected: https://character.ai
Policy decision: {decision: "DENY", reason: "service is prohibited", ...}
Access denied: service is prohibited
```

This shows you exactly what the extension is doing!

---

## 🐛 Troubleshooting

### Problem: Extension shows errors after loading

**Possible cause:** Icons might not be found

**Solution:**
```bash
# Check if icons exist
ls -la /Users/ronanfagan/Downloads/AIPOLICY/browser-extension/icons/

# You should see:
# icon16.png
# icon48.png
# icon128.png
```

If icons are missing, the extension will still work, just won't have pretty icons.

---

### Problem: Nothing happens when visiting character.ai

**Possible causes:**

1. **API is not running**
   ```bash
   # Check if API is running
   curl http://localhost:8002/health

   # If you get an error, start it:
   cd /Users/ronanfagan/Downloads/AIPOLICY
   docker compose up -d
   ```

2. **Extension is not enabled**
   - Go to `chrome://extensions/`
   - Make sure toggle is ON for "AI Governance Shield"

3. **CORS issue**
   - Open extension console (see "Advanced" section above)
   - Look for red error messages
   - Check API logs: `docker compose logs decision-api`

---

### Problem: Warning banner doesn't appear on ChatGPT

**Possible causes:**

1. **Content Security Policy blocking injection**
   - Some sites block external scripts
   - Check extension console for "Failed to inject banner" errors

2. **Banner is there but hidden**
   - Scroll to the very top of the page
   - The banner should be at position `top: 0`

---

### Problem: Extension popup shows all zeros

**Possible cause:** You haven't visited any AI sites yet, or storage isn't working

**Solution:**
1. Visit `character.ai` and `chatgpt.com` first
2. Then check the popup again
3. Stats should update

---

## 📹 What to Expect (Visual Guide)

### Before Extension:
```
┌─────────────────────────────────────┐
│ Chrome Browser                      │
├─────────────────────────────────────┤
│ character.ai loads normally         │
│ (cute anime characters everywhere)  │
│                                     │
└─────────────────────────────────────┘
```

### After Extension (Blocked):
```
┌─────────────────────────────────────┐
│ Chrome Browser                      │
├─────────────────────────────────────┤
│ 🚫 Access Denied                    │
│                                     │
│ This AI service is prohibited by    │
│ company policy.                     │
│                                     │
│ Reason: service is prohibited       │
│                                     │
│ [Contact IT Support]                │
└─────────────────────────────────────┘
```

### After Extension (Warning):
```
┌─────────────────────────────────────┐
│ ⚠️ AI Service Monitored - approved  │  ← Yellow banner
├─────────────────────────────────────┤
│ ChatGPT normal page loads here      │
│                                     │
│ (ChatGPT interface)                 │
│                                     │
└─────────────────────────────────────┘
```

---

## ✅ Success Checklist

After testing, you should have:

- [x] Extension loaded in browser without errors
- [x] Character.AI gets blocked with custom page
- [x] ChatGPT loads but shows yellow warning banner
- [x] Extension popup shows statistics (1 allowed, 1 blocked)
- [x] Extension console shows policy decision logs
- [x] "View Dashboard" button opens Admin UI

---

## 🎉 You're Done!

The extension is now:
- ✅ Installed and active
- ✅ Blocking prohibited AI services
- ✅ Monitoring allowed AI services
- ✅ Logging all decisions to your database

---

## 🚀 Next Steps

1. **Customize the block page**
   - Edit: `browser-extension/blocked.html`
   - Add your company branding

2. **Customize which services to block**
   - Edit: `policies/ai_governance.rego`
   - Add more services to `blocked_services` list

3. **Change the user**
   - Edit: `browser-extension/background.js`
   - Change `USER_EMAIL` and `USER_DEPARTMENT`
   - See how different departments get different access

4. **Deploy to your team**
   - Share the extension folder
   - Have team members load it the same way
   - Or package it as a .crx file for easy distribution

---

## 📞 Need Help?

Run this command to test the API directly:
```bash
cd /Users/ronanfagan/Downloads/AIPOLICY
bash test-extension.sh
```

Check these files:
- `BROWSER_EXTENSION_TEST_GUIDE.md` - Full detailed guide
- `SESSION_RECOVERY_COMPLETE.md` - Complete system documentation
- `QUICKSTART.md` - General setup guide

Check the logs:
```bash
# Extension console
chrome://extensions/ → "Inspect views: service worker"

# API logs
docker compose logs -f decision-api

# Database
docker exec -it ai-policy-db psql -U aigovuser -d ai_governance \
  -c "SELECT * FROM decisions ORDER BY timestamp DESC LIMIT 5;"
```

---

**That's it! Start testing by visiting character.ai and chatgpt.com!** 🎊
