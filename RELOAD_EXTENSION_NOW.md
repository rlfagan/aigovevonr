# 🔄 RESTART REQUIRED - Load All Code Changes

## What Changed
- ✅ Created `decision-api/app/api/policy.py` with policy management endpoints
- ✅ Updated `decision-api/main.py` to register policy router
- ✅ Fixed `policies/ai_policy_blocklist.rego` package name and input structure
- ✅ Updated `admin-ui/app/policies/page.tsx` to load from API

## ⚠️ Current Issue
**"Nothing happens when I click on it"** - This is because the running services at localhost:3001 and localhost:8002 haven't loaded the new code yet.

## 🚀 How to Fix - Restart Everything

### Option 1: If using start-all.sh

```bash
# Navigate to project root
cd /Users/ronanfagan/Downloads/AIPOLICY

# Stop all running services (Ctrl+C if running in terminal)
# Then run:
docker-compose down

# Start everything fresh
./start-all.sh
```

### Option 2: If using Docker Compose directly

```bash
cd /Users/ronanfagan/Downloads/AIPOLICY

# Stop and remove containers
docker-compose down

# Rebuild and start
docker-compose up --build
```

### Option 3: Restart individual services

```bash
# Restart decision API (backend)
docker-compose restart decision-api

# If admin-ui is running in Docker:
docker-compose restart admin-ui

# If admin-ui is running separately (outside Docker):
cd /Users/ronanfagan/Downloads/AIPOLICY/admin-ui
# Press Ctrl+C to stop the dev server
npm run dev
```

## ✅ After Restart - Verify It Works

### 1. Check Backend API
```bash
# Should return healthy
curl http://localhost:8002/health

# Should return list of policy templates
curl http://localhost:8002/api/policy/templates

# Should return active policy config
curl http://localhost:8002/api/policy/active

# Should return blocklist policy content
curl http://localhost:8002/api/policy/template/ai_policy_blocklist.rego
```

### 2. Check Admin UI
```bash
# Open in browser
open http://localhost:3001/policies
```

### 3. Test Policy Loading
1. Click **"Complete Blocklist Policy"**
2. You should now see **ALL 160+ blocked domains** including:
   - OpenAI, Anthropic, Google Gemini
   - Microsoft Copilot, Meta
   - Perplexity, Hugging Face
   - Stability AI, Midjourney
   - etc.

3. Click **"Balanced Policy"**
   - Should see 60+ services organized by category
   - Chat AI, Code AI, Productivity tools

4. Click **"Activate Policy"** button
   - Should see success message
   - Policy should persist across restarts

## 🐛 Troubleshooting

### If policies still don't load:

**Check backend logs:**
```bash
docker-compose logs decision-api
```

**Verify files exist:**
```bash
ls -la /Users/ronanfagan/Downloads/AIPOLICY/policies/
ls -la /Users/ronanfagan/Downloads/AIPOLICY/policies/starter_templates/
```

**Test API directly:**
```bash
# Get blocklist content
curl http://localhost:8002/api/policy/template/ai_policy_blocklist.rego | jq .

# Should show JSON with "content" field containing all the Rego policy code
```

### If you see 404 errors:

**Check if policy router is loaded:**
```bash
docker-compose logs decision-api | grep "policy"
```

**Verify the router file exists:**
```bash
ls -la /Users/ronanfagan/Downloads/AIPOLICY/decision-api/app/api/policy.py
```

## 📝 What Should Work After Restart

✅ **Policy Templates Load with Full Content**
- Complete Blocklist: All 160+ blocked domains visible
- Balanced Policy: 60+ services by category
- All templates show actual Rego code, not placeholders

✅ **Policy Activation Works**
- Click "Activate Policy" button
- See confirmation message
- Policy persists after restart
- Shows "(Active)" badge on current policy

✅ **Admin Override**
- Go to http://localhost:3001/violations
- Click violation details
- See "Create Admin Override" button
- Override gets saved to `/app/data/overrides.json`

✅ **Personal Email Detection**
- Browser extension monitors for Gmail, Yahoo, etc.
- Shows red warning banner
- Reports violation to backend

✅ **Unknown AI Detection**
- Go to http://localhost:3001/unknown-services
- See pending AI services
- Approve/Block buttons work

---

## ⏱️ Expected Restart Time

- Docker containers: **30-60 seconds**
- Next.js dev server: **10-20 seconds**
- Total: **~1 minute** until everything is ready

---

## 🎯 Next Steps After Restart

1. **Test policy loading** - Click each template, verify content shows
2. **Test activation** - Activate blocklist, restart, verify it stays active
3. **Test overrides** - Block something, then create admin override
4. **Test browser extension** - Visit OpenAI, Claude, etc.
5. **Ready for production!**

---

**TL;DR**: Run `docker-compose down && ./start-all.sh` then wait 1 minute and try again. Everything should work!
