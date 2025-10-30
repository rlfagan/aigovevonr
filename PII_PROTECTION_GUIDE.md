# 🛡️ PII Protection Feature Guide

## Overview

The AI Governance Shield now includes **real-time PII (Personally Identifiable Information) detection** that prevents users from accidentally sharing sensitive data with AI services.

---

## 🎯 What It Detects

The extension monitors for these types of sensitive data:

### Critical Severity (Blocks Immediately)
- **Social Security Numbers (SSN)**: `123-45-6789` or `123456789`
- **Credit Card Numbers**: `4532-1234-5678-9010`
- **API Keys & Tokens**: `api_key=EXAMPLE_KEY_abc123...`
- **AWS Access Keys**: `AKIAEXAMPLEKEY123456`

### High Severity (Warns)
- **Email Addresses**: `john.doe@company.com`
- **Passport Numbers**: `AB1234567`
- **Driver License Numbers**: `CA12345678`

### Medium Severity (Notifies)
- **Phone Numbers**: `(555) 123-4567` or `555-123-4567`
- **IP Addresses**: `192.168.1.1`

---

## 🚀 How To Use

### Step 1: Reload Extension

After updating the files, reload the extension:

1. Go to `chrome://extensions/`
2. Find "AI Governance Shield"
3. Click the **reload button** (circular arrow)

### Step 2: Test PII Detection

#### Test Paste Protection:

1. Go to `https://chatgpt.com`
2. Copy this text: `My SSN is 123-45-6789`
3. Try to **paste** it into the chat input
4. **Result:** A warning modal blocks the paste!

#### What You'll See:

A modal appears with:
- ⚠️ Warning icon
- "Sensitive Data Detected" header
- List of detected PII types
- Two buttons:
  - **🛡️ Block Submission** (recommended)
  - **Proceed Anyway** (logs override)

---

## 🧪 Test Cases

### Test 1: SSN Detection (Critical)

**Copy and try to paste:**
```
My social security number is 123-45-6789
```

**Expected:**
- ✅ Modal blocks paste immediately
- ✅ Shows: "Social Security Number (SSN) (1 instance)"
- ✅ Recommends blocking

---

### Test 2: Credit Card (Critical)

**Copy and try to paste:**
```
My card is 4532 1234 5678 9010
```

**Expected:**
- ✅ Modal blocks paste
- ✅ Shows: "Credit Card Number (1 instance)"
- ✅ Cannot paste without user override

---

### Test 3: Email Address (High)

**Copy and try to paste:**
```
Contact me at john.doe@company.com
```

**Expected:**
- ⚠️ Yellow toast notification appears
- ✅ Paste is allowed but warned
- ✅ Shows: "Warning: Your input contains 1 potentially sensitive item(s)"

---

### Test 4: API Key (Critical)

**Copy and try to paste:**
```
api_key=sk_test_EXAMPLE1234567890abcdefghijklmnop
```

**Expected:**
- ✅ Modal blocks paste
- ✅ Shows: "API Key or Token (1 instance)"
- ✅ Prevents accidental credential leak

---

### Test 5: Multiple PII Items

**Copy and try to paste:**
```
John Doe
SSN: 123-45-6789
Email: john@example.com
Phone: (555) 123-4567
```

**Expected:**
- ✅ Modal blocks paste
- ✅ Shows all detected types:
  - Social Security Number (1 instance)
  - Email Address (1 instance)
  - Phone Number (1 instance)

---

## 🎨 User Experience

### Modal Appearance

```
┌─────────────────────────────────────┐
│            ⚠️                        │
│   Sensitive Data Detected           │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Your input contains:            │ │
│ │ • Social Security Number (1)    │ │
│ │ • Credit Card Number (1)        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ⚠️ Warning: Sharing sensitive data  │
│ may violate company policies...     │
│                                     │
│ [🛡️ Block Submission] [Proceed]    │
│                                     │
│ This action is being logged         │
└─────────────────────────────────────┘
```

### Toast Notification (Non-Critical)

```
┌───────────────────────────────────┐
│ ⚠️ Warning: Your input contains   │
│ 2 potentially sensitive item(s)   │
└───────────────────────────────────┘
  (Appears bottom-right, fades after 5s)
```

---

## 🔒 Security Features

### 1. Paste Event Interception
- Monitors all paste events on AI service sites
- Scans clipboard data before allowing paste
- Blocks critical PII immediately

### 2. Form Submission Monitoring
- Scans form data before submission
- Prevents accidental submission of sensitive data
- Gives user control with override option

### 3. Logging & Compliance
- Logs all PII detection events
- Records whether user blocked or proceeded
- Sends to API for audit trail

### 4. Configurable Severity Levels
- **Critical**: Requires user confirmation
- **High**: Shows warning, allows action
- **Medium**: Notifies but doesn't block

---

## 📊 Logging & Reporting

All PII detection attempts are logged to the API:

```bash
# View PII detection logs
docker exec -it ai-policy-db psql -U aigovuser -d ai_governance

# Query for PII attempts (you'll need to add this table)
SELECT * FROM pii_attempts ORDER BY timestamp DESC LIMIT 10;
```

### Log Data Includes:
- URL where PII was detected
- Types of PII found
- User action (blocked/override)
- Timestamp
- User context

---

## ⚙️ Configuration

### Customize Detection Patterns

Edit `content-script.js` to modify patterns:

```javascript
const PII_PATTERNS = {
  ssn: {
    pattern: /\b\d{3}-?\d{2}-?\d{4}\b/g,
    name: 'Social Security Number (SSN)',
    severity: 'critical'  // Change to 'high' or 'medium'
  },
  // Add custom patterns
  employeeId: {
    pattern: /\bEMP-\d{6}\b/g,
    name: 'Employee ID',
    severity: 'high'
  }
};
```

### Add New AI Services

Edit the `matches` array in `manifest.json`:

```json
"matches": [
  "*://*.openai.com/*",
  "*://*.chatgpt.com/*",
  "*://*.your-ai-service.com/*"  // Add here
]
```

---

## 🧪 Advanced Testing

### Test Script

Create a test file to quickly test all patterns:

```bash
cat > /tmp/pii-test.txt <<'EOF'
Test SSN: 123-45-6789
Test Email: test@example.com
Test Phone: (555) 123-4567
Test Credit Card: 4532-1234-5678-9010
Test API Key: api_key=EXAMPLE_KEY_abc123def456
Test AWS Key: AKIAEXAMPLEKEY123456
EOF

# Copy each line and paste into ChatGPT
```

### Expected Results:

| Content | Severity | Behavior |
|---------|----------|----------|
| SSN | Critical | Modal blocks |
| Email | High | Toast warning |
| Phone | Medium | Toast notification |
| Credit Card | Critical | Modal blocks |
| API Key | Critical | Modal blocks |
| AWS Key | Critical | Modal blocks |

---

## 🔧 Troubleshooting

### PII Detection Not Working

**Issue:** Paste happens without warning

**Solutions:**

1. **Check if on AI service:**
   - Content script only runs on AI services
   - Check console for: "PII Protection Active"

2. **Verify extension loaded:**
   ```
   Open console (F12)
   Should see: "AI Governance - PII Protection Active"
   ```

3. **Reload extension:**
   - Go to `chrome://extensions/`
   - Click reload on "AI Governance Shield"

4. **Check content script loaded:**
   ```
   F12 → Sources → Content Scripts
   Should see: content-script.js
   ```

---

### Modal Not Appearing

**Issue:** Critical PII paste goes through

**Check:**

1. **Console errors:**
   ```
   F12 → Console
   Look for JavaScript errors
   ```

2. **Test pattern manually:**
   ```javascript
   // In console:
   const pattern = /\b\d{3}-?\d{2}-?\d{4}\b/g;
   "123-45-6789".match(pattern);
   // Should return: ["123-45-6789"]
   ```

---

### False Positives

**Issue:** Non-sensitive data triggers warnings

**Solution:**

Adjust patterns in `content-script.js`:

```javascript
// Make SSN pattern more strict
ssn: {
  pattern: /\b(?!000|666|9\d{2})\d{3}-?(?!00)\d{2}-?(?!0000)\d{4}\b/g,
  name: 'Social Security Number (SSN)',
  severity: 'critical'
}
```

---

## 📈 Monitoring & Analytics

### View PII Detection Stats

Add to Admin UI dashboard:

```javascript
// API endpoint to add
GET /api/pii-stats

Response:
{
  "total_detections": 156,
  "blocked": 120,
  "overridden": 36,
  "by_type": {
    "ssn": 45,
    "credit_card": 23,
    "api_key": 52,
    "email": 36
  }
}
```

### Grafana Dashboard

Create alerts for:
- High number of PII detection overrides
- Critical PII types detected
- Users repeatedly overriding warnings

---

## 🎯 Best Practices

### For Administrators:

1. **Monitor Override Rates**
   - High override rates may indicate policy issues
   - Users may need training

2. **Customize Patterns**
   - Add company-specific patterns (employee IDs, etc.)
   - Adjust severity levels based on risk

3. **Regular Audits**
   - Review PII detection logs weekly
   - Identify patterns of risky behavior

### For Users:

1. **Never Override for Real Data**
   - If modal blocks, it's protecting you
   - Use sanitized/fake data for testing

2. **Report False Positives**
   - Help IT improve detection accuracy
   - Submit feedback via dashboard

3. **Training**
   - Understand what data is sensitive
   - Learn to recognize PII patterns

---

## 🚀 Future Enhancements

Planned features:

1. **Machine Learning Detection**
   - Use ML models for better accuracy
   - Reduce false positives

2. **Custom Pattern Management UI**
   - Add patterns via Admin UI
   - No code changes needed

3. **Data Redaction**
   - Auto-redact detected PII
   - Replace with `[REDACTED]` markers

4. **Integration with DLP Tools**
   - Sync with enterprise DLP systems
   - Centralized policy management

---

## 📋 Quick Reference

### Files Added:
- `content-script.js` - PII detection logic
- `manifest.json` - Updated with content_scripts

### Detected Types:
- ✅ SSN (Critical)
- ✅ Credit Cards (Critical)
- ✅ API Keys (Critical)
- ✅ AWS Keys (Critical)
- ✅ Emails (High)
- ✅ Phone Numbers (Medium)
- ✅ IP Addresses (Medium)

### User Actions:
- **Block Submission** - Prevents paste/submit
- **Proceed Anyway** - Allows but logs override

---

## ✅ Testing Checklist

After reloading extension:

- [ ] Go to chatgpt.com
- [ ] Console shows "PII Protection Active"
- [ ] Copy SSN `123-45-6789` and paste
- [ ] Modal appears blocking paste
- [ ] Click "Block Submission" - paste prevented
- [ ] Try again, click "Proceed Anyway" - paste allowed
- [ ] Copy email and paste - toast warning appears
- [ ] Check console for PII detection logs

---

**Your AI Governance platform now includes enterprise-grade PII protection!** 🎉

Users can no longer accidentally paste sensitive data into AI services without explicit confirmation.
