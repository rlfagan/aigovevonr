# 🔄 Reload Extension to Enable PII Protection

## Quick Steps:

### 1. Go to Extensions Page
Type in your browser:
```
chrome://extensions/
```

### 2. Find AI Governance Shield
Look for the extension with the shield icon

### 3. Click the Reload Button
- Look for the circular arrow icon (🔄)
- It's usually near the ON/OFF toggle
- Click it!

### 4. Check Console
After reloading, go to ChatGPT and:
1. Press F12 (open Developer Tools)
2. Go to "Console" tab
3. You should see:
   ```
   AI Governance - PII Protection Active
   PII Protection initialized - monitoring paste events and forms
   ```

### 5. Test Again
1. Still on chatgpt.com
2. Copy this text: `123-45-6789`
3. Try to paste in the chat input
4. **Should see a warning modal!**

---

## Not Seeing the Messages?

### Check Content Script Loaded:

1. On chatgpt.com, press F12
2. Go to **Sources** tab (at top)
3. Look for **Content Scripts** in left sidebar
4. You should see: `content-script.js`

### If Not There:

**Option 1: Remove and Re-add Extension**
```
1. chrome://extensions/
2. Click "Remove" on AI Governance Shield
3. Click "Load unpacked"
4. Select: /Users/ronanfagan/Downloads/AIPOLICY/browser-extension/
```

**Option 2: Check Files Exist**
```bash
ls -la /Users/ronanfagan/Downloads/AIPOLICY/browser-extension/

# You should see:
# - content-script.js  (NEW)
# - manifest.json      (UPDATED)
```

---

## Quick Verification:

After reload, in chatgpt.com console:
```javascript
// Type this in console to test detection:
console.log('Testing:', document.querySelector('[contenteditable]'));

// Should show the input element
```

---

## Still Not Working?

Let me know and I can help debug! Common issues:
- Files not saved properly
- Extension cached old version
- Need to refresh chatgpt.com page too
