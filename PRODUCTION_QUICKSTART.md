# 🚀 Production Deployment - Quick Start

**Get your AI Governance Platform live in 30 minutes!**

---

## ✅ What You Have

- ✅ Complete drilldown violations dashboard
- ✅ Policy management UI with 5 templates (including your blocklist!)
- ✅ 90+ AI services monitored
- ✅ IAM integration ready (Okta & Entra)
- ✅ Browser extension v0.3.0
- ✅ One-click deployment script

---

## 🎯 Choose Your Deployment

### Option 1: Google Cloud (Easiest - Recommended) ⭐

**Cost**: ~$20-30/month
**Time**: 15 minutes
**Best for**: Quick setup, auto-scaling

```bash
# 1. Install Google Cloud SDK
brew install --cask google-cloud-sdk

# 2. Login
gcloud auth login

# 3. Deploy
./deploy-production.sh
# Choose option 1
```

---

### Option 2: DigitalOcean (Most Affordable) 💰

**Cost**: ~$12-25/month
**Time**: 20 minutes
**Best for**: Startups, small teams

1. Go to https://cloud.digitalocean.com/apps
2. Click "Create App"
3. Connect GitHub repo
4. Done!

---

### Option 3: Self-Hosted VPS (Cheapest) 🏠

**Cost**: ~$5-10/month
**Time**: 30 minutes
**Best for**: Full control, lowest cost

```bash
# Get a VPS from:
# - Hetzner: €4.15/mo
# - Linode: $5/mo
# - Vultr: $6/mo

# Deploy
./deploy-production.sh
# Choose option 5
```

---

## 📋 Step-by-Step (Google Cloud Example)

### 1. Prerequisites (5 mins)

```bash
# Install Google Cloud SDK
brew install --cask google-cloud-sdk

# Create GCP project
gcloud projects create ai-governance-prod
gcloud config set project ai-governance-prod

# Enable billing (required)
# Go to: https://console.cloud.google.com/billing
```

### 2. Configure Environment (5 mins)

```bash
cd /Users/ronanfagan/Downloads/AIPOLICY

# Create production env file
cp .env.example .env.production

# Edit with your values
nano .env.production
```

**Required values**:
```bash
# Authentication
AUTH_PROVIDER=okta  # or 'entra' or 'mock' for testing
OKTA_DOMAIN=yourcompany.okta.com
OKTA_CLIENT_ID=your_client_id

# Domain
DOMAIN=ai-governance.yourcompany.com
```

### 3. Deploy! (10 mins)

```bash
# Run deployment script
./deploy-production.sh

# Choose option 1 (Google Cloud)
# Enter your GCP project ID
# Wait for build and deploy...
```

### 4. Set Up Domain (5 mins)

```bash
# Get your Cloud Run URLs
gcloud run services list

# Add custom domain
gcloud run domain-mappings create \
  --service ai-governance-admin \
  --domain ai-governance.yourcompany.com

# Update DNS:
# Add CNAME record pointing to ghs.googlehosted.com
```

### 5. Configure IAM (10 mins)

Follow the guide: `IAM_INTEGRATION_GUIDE.md`

**Quick Okta setup**:
1. Create app in Okta
2. Add redirect URI: `https://ai-governance.yourcompany.com/callback`
3. Copy client ID to .env.production
4. Redeploy: `./deploy-production.sh`

---

## 🔐 SSL Certificates

### Google Cloud Run
✅ **Automatic!** SSL provided free when you use custom domain

### DigitalOcean
✅ **Automatic!** SSL provided free with App Platform

### Self-Hosted
```bash
# Install certbot
apt install certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d ai-governance.yourcompany.com

# Auto-renewal is configured automatically
```

---

## 📦 Update Browser Extension

After deployment, update extension to use production API:

### Edit `browser-extension/background.js`:

```javascript
// Change this line:
const DECISION_API_URL = 'http://localhost:8002';

// To your production URL:
const DECISION_API_URL = 'https://api.ai-governance.yourcompany.com';
```

### Reload Extension:
1. Go to `chrome://extensions/`
2. Click reload on AI Governance Shield
3. Test with production!

---

## 🧪 Test Production

### 1. Test Admin UI
```bash
open https://ai-governance.yourcompany.com
# Should show login screen (if IAM configured)
# Or dashboard (if using mock auth)
```

### 2. Test API
```bash
curl https://api.ai-governance.yourcompany.com/health
# Should return: {"status": "healthy"}
```

### 3. Test Policy
```bash
curl -X POST https://api.ai-governance.yourcompany.com/api/decide \
  -H "Content-Type: application/json" \
  -d '{
    "resource_url": "https://character.ai",
    "user_email": "test@company.com"
  }'
# Should return DENY decision
```

### 4. Test Browser Extension
1. Load extension
2. Visit character.ai
3. Should be blocked!
4. Check violations dashboard

---

## 💰 Cost Breakdown

### Google Cloud Run (Recommended)
- **Cloud Run**: ~$10/mo (1M requests)
- **Cloud SQL (PostgreSQL)**: ~$7/mo (db-f1-micro)
- **Memorystore (Redis)**: ~$10/mo (1GB)
- **Total**: ~$27/mo

### DigitalOcean App Platform
- **Apps**: ~$12/mo (2 containers)
- **Database**: ~$15/mo (PostgreSQL)
- **Redis**: Free with apps
- **Total**: ~$27/mo

### Self-Hosted VPS
- **VPS**: ~$5/mo (Hetzner/Linode)
- **Everything else**: Included
- **Total**: ~$5/mo

### AWS (Enterprise)
- **ECS Fargate**: ~$30/mo
- **RDS**: ~$15/mo
- **ElastiCache**: ~$15/mo
- **Total**: ~$60/mo

---

## 📊 What You Get

After deployment:

### ✅ Admin Dashboard
- **URL**: `https://ai-governance.yourcompany.com`
- **Pages**:
  - Dashboard with live stats
  - Policy management (5 templates)
  - Violations drilldown with filters
  - User management (if IAM configured)

### ✅ Decision API
- **URL**: `https://api.ai-governance.yourcompany.com`
- **Endpoints**:
  - `/api/decide` - Policy decisions
  - `/health` - Health check
  - `/docs` - API documentation

### ✅ Monitoring
- **Grafana**: `https://grafana.ai-governance.yourcompany.com`
- **Prometheus**: Internal metrics
- **Logs**: Cloud provider logging

### ✅ Browser Extension
- Works across all user machines
- Connects to production API
- Real-time policy enforcement

---

## 🔧 Troubleshooting

### "Build failed"
```bash
# Check logs
gcloud builds log $(gcloud builds list --limit=1 --format="value(id)")

# Common fixes:
# - Check Dockerfile exists
# - Verify package.json is valid
# - Ensure all dependencies installed
```

### "Database connection failed"
```bash
# Verify DATABASE_URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Fix: Update .env.production with correct credentials
```

### "IAM login not working"
```bash
# Check redirect URI matches exactly
# Verify client ID/secret
# Ensure domain is correct
# Check auth provider logs (Okta/Entra)
```

### "Extension not connecting"
```bash
# Verify API URL in background.js
# Check CORS settings
# Test API directly: curl https://api.../health
# Check browser console for errors
```

---

## 🎯 Next Steps After Deployment

1. **Train Users**
   - Share admin dashboard URL
   - Show how to view violations
   - Explain policy templates

2. **Monitor Usage**
   - Check Grafana daily
   - Review violations
   - Adjust policies as needed

3. **Set Up Alerts**
   - Uptime monitoring (UptimeRobot)
   - Error tracking (Sentry)
   - Email notifications

4. **Regular Maintenance**
   - Weekly policy reviews
   - Monthly compliance reports
   - Quarterly security audits

---

## 🚀 You're Live!

**Congratulations!** Your AI Governance Platform is now in production.

**URLs to Share**:
- 🎨 Admin UI: `https://ai-governance.yourcompany.com`
- 📡 API: `https://api.ai-governance.yourcompany.com`
- 📊 Grafana: `https://grafana.ai-governance.yourcompany.com`

**Next**:
- Add real users
- Configure policies for your org
- Monitor violations
- Generate compliance reports

---

**Questions?** Check:
- `PRODUCTION_DEPLOYMENT_GUIDE.md` - Full details
- `IAM_INTEGRATION_GUIDE.md` - SSO setup
- `TROUBLESHOOTING.md` - Common issues

**Your enterprise AI governance is live!** 🎉
