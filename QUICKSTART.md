# 🚀 Quick Start Guide - AI Governance Platform (Open Source)

**Deploy a working AI governance system in under 30 minutes**

This is a **100% open source, zero-budget** implementation of an Enterprise AI Policy Management platform. Perfect for solo engineers getting started with AI governance.

---

## 📋 What You Get

- ✅ **Policy Engine** (Open Policy Agent) - Evaluates governance rules
- ✅ **Decision API** (FastAPI) - REST API for policy decisions
- ✅ **Database** (PostgreSQL + TimescaleDB) - Audit logs and analytics
- ✅ **Cache** (Redis) - Fast decision caching
- ✅ **Browser Extension** (Chrome/Edge) - Blocks unapproved AI services
- ✅ **Dashboards** (Grafana) - Visualize usage and violations
- ✅ **Monitoring** (Prometheus) - System health metrics

**Total Cost**: $0 (all open source)
**Time to Deploy**: 20-30 minutes
**Maintenance**: Minimal (auto-updates via Docker)

---

## ⚡ Prerequisites

You need only **3 things**:

1. **Docker** & **Docker Compose** installed ([Get Docker](https://docs.docker.com/get-docker/))
2. **Git** installed
3. A computer with 4GB+ RAM

That's it! No cloud account, no credit card, no licenses.

---

## 🎯 Step 1: Clone and Start (5 minutes)

```bash
# 1. Clone the repository
cd ~/Downloads/AIPOLICY

# 2. Start all services
docker-compose up -d

# 3. Wait for services to start (30-60 seconds)
docker-compose ps

# You should see all services as "healthy"
```

**Services will be running at**:
- **Decision API**: http://localhost:8000
- **OPA Policy Engine**: http://localhost:8181
- **PostgreSQL**: localhost:5432
- **Grafana Dashboards**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090

---

## 🧪 Step 2: Test the System (5 minutes)

### Test the Decision API

```bash
# Check health
curl http://localhost:8000/health

# Test a policy decision (approve ChatGPT for engineering)
curl -X POST http://localhost:8000/evaluate \
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

# Expected response: {"decision": "ALLOW", ...}
```

### Test blocking unapproved service

```bash
# Try to access Character.AI (prohibited)
curl -X POST http://localhost:8000/evaluate \
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

# Expected response: {"decision": "DENY", "reason": "service is prohibited", ...}
```

### Check the database

```bash
# Connect to PostgreSQL
docker exec -it ai-policy-db psql -U aigovuser -d ai_governance

# View recent decisions
SELECT timestamp, user_email, resource_url, decision, risk_score
FROM decisions
ORDER BY timestamp DESC
LIMIT 10;

# View summary
SELECT * FROM daily_summary;

# Exit
\q
```

---

## 🌐 Step 3: Install Browser Extension (5 minutes)

### Chrome/Edge Installation

```bash
# 1. Open Chrome/Edge and go to:
chrome://extensions/

# 2. Enable "Developer mode" (toggle in top right)

# 3. Click "Load unpacked"

# 4. Navigate to and select:
~/Downloads/AIPOLICY/browser-extension/

# 5. Extension should now appear in your toolbar
```

### Configure Extension

```javascript
// Edit browser-extension/background.js
// Change these variables to match your setup:

const DECISION_API_URL = 'http://localhost:8000';
const USER_EMAIL = 'your.email@company.com';
const USER_DEPARTMENT = 'your_department';
```

### Test the Extension

1. Try visiting https://character.ai → Should be **BLOCKED**
2. Try visiting https://chatgpt.com → Should show **WARNING BANNER**
3. Click extension icon → View statistics

**Note**: For testing, you may need to add icons to `browser-extension/icons/`:
- icon16.png (16x16)
- icon48.png (48x48)
- icon128.png (128x128)

Or generate simple placeholders:
```bash
# Create simple colored squares as placeholders (requires ImageMagick)
convert -size 16x16 xc:#667eea browser-extension/icons/icon16.png
convert -size 48x48 xc:#667eea browser-extension/icons/icon48.png
convert -size 128x128 xc:#667eea browser-extension/icons/icon128.png
```

---

## 📊 Step 4: View Dashboards (5 minutes)

### Grafana Setup

```bash
# 1. Open Grafana
http://localhost:3000

# 2. Login: admin / admin
# (Change password when prompted)

# 3. PostgreSQL datasource is pre-configured

# 4. Create a simple dashboard:
# - Click "+" → "Dashboard"
# - Add panel
# - Query: SELECT timestamp, decision FROM decisions ORDER BY timestamp DESC
# - Visualize as Time series or Table
```

### Pre-built Queries for Grafana

**Total Requests (Last 24h)**:
```sql
SELECT COUNT(*) FROM decisions WHERE timestamp > NOW() - INTERVAL '24 hours'
```

**Decision Breakdown**:
```sql
SELECT decision, COUNT(*) FROM decisions GROUP BY decision
```

**Top Users**:
```sql
SELECT * FROM top_users LIMIT 10
```

**Top Services**:
```sql
SELECT * FROM top_services LIMIT 10
```

---

## 🎨 Customizing Policies (10 minutes)

### Edit the Policy File

```bash
# Open the policy file
nano policies/ai_governance.rego

# Or use your favorite editor:
code policies/ai_governance.rego
```

### Example: Add a New Blocked Service

```rego
# Find this section:
blocked_services := [
    "character.ai",
    "replika.com",
    "janitor.ai",
    "crushon.ai"
]

# Add your service:
blocked_services := [
    "character.ai",
    "replika.com",
    "janitor.ai",
    "crushon.ai",
    "new-service-to-block.com"  # ← Add here
]
```

### Example: Add an Approved Service

```rego
# Find approved_services section:
approved_services := {
    "chatgpt.com": {
        "name": "ChatGPT",
        "vendor": "OpenAI",
        "requires_training": true,
        "approved_departments": ["engineering", "marketing", "product"]
    },
    # Add your service:
    "your-service.com": {
        "name": "Your AI Service",
        "vendor": "Your Vendor",
        "requires_training": true,
        "approved_departments": ["engineering"]
    }
}
```

### Apply Policy Changes

```bash
# Restart OPA to load new policy
docker-compose restart opa

# Test immediately
curl -X POST http://localhost:8000/evaluate \
  -H "Content-Type: application/json" \
  -d '{"user": {"email": "test@company.com", "department": "engineering", "training_completed": true}, "action": "access_ai_service", "resource": {"url": "https://your-service.com"}}'
```

---

## 🔧 Common Operations

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f decision-api
docker-compose logs -f opa
docker-compose logs -f postgres
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart decision-api
```

### Stop Everything

```bash
docker-compose down

# Stop and remove all data (fresh start)
docker-compose down -v
```

### Backup Database

```bash
# Export decisions to CSV
docker exec -it ai-policy-db psql -U aigovuser -d ai_governance -c "\COPY decisions TO '/tmp/decisions.csv' CSV HEADER"

# Copy from container
docker cp ai-policy-db:/tmp/decisions.csv ./decisions-backup.csv
```

---

## 🚨 Troubleshooting

### Services won't start

```bash
# Check service status
docker-compose ps

# View detailed logs
docker-compose logs

# Common fixes:
# 1. Port conflicts (something using 5432, 8000, etc)
#    → Change ports in docker-compose.yml
# 2. Not enough memory
#    → Close other applications
# 3. Docker not running
#    → Start Docker Desktop
```

### Extension not blocking

```bash
# 1. Check extension is loaded
#    → Go to chrome://extensions/
#    → Should see "AI Governance Shield"

# 2. Check API is reachable
#    → Open browser console (F12)
#    → Navigate to an AI service
#    → Look for error messages

# 3. Check CORS
#    → API must allow browser requests
#    → This is configured in decision-api/main.py
```

### Database connection errors

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Try connecting manually
docker exec -it ai-policy-db psql -U aigovuser -d ai_governance
```

---

## 📈 What's Next?

### Immediate Actions (Today)

1. ✅ Test with your team (3-5 people)
2. ✅ Add your company's approved AI services to the policy
3. ✅ Block known shadow AI services
4. ✅ Set up Grafana dashboard
5. ✅ Share browser extension with pilot users

### This Week

1. Configure user training tracking
2. Integrate with Okta/Azure AD for real user data
3. Add more sophisticated policies (PII detection, department rules)
4. Set up alerting (Slack, email)
5. Document your internal AI usage policy

### This Month

1. Deploy to AWS/GCP/Azure for production use
2. Add IDE plugins (VS Code, IntelliJ)
3. Integrate with DLP tools for content scanning
4. Build automated reporting for compliance team
5. Scale to full organization

---

## 💡 Pro Tips

### Tip 1: Shadow AI Discovery

```bash
# If you have CASB logs (Netskope, etc.), analyze them:
# 1. Export logs to CSV
# 2. Use this query to find AI service usage:

SELECT user, url, COUNT(*) as access_count
FROM casb_logs
WHERE url LIKE '%openai.com%'
   OR url LIKE '%anthropic.com%'
   OR url LIKE '%character.ai%'
   OR url LIKE '%replika.com%'
GROUP BY user, url
ORDER BY access_count DESC;
```

### Tip 2: Policy Testing

```bash
# Create test script to validate all policies
cat > test-policies.sh <<'EOF'
#!/bin/bash

echo "Testing approved service..."
curl -s -X POST http://localhost:8000/evaluate \
  -H "Content-Type: application/json" \
  -d '{"user": {"email": "test@company.com", "department": "engineering", "training_completed": true}, "action": "access_ai_service", "resource": {"url": "https://chatgpt.com"}}' \
  | jq '.decision'

echo "Testing blocked service..."
curl -s -X POST http://localhost:8000/evaluate \
  -H "Content-Type: application/json" \
  -d '{"user": {"email": "test@company.com", "department": "engineering", "training_completed": true}, "action": "access_ai_service", "resource": {"url": "https://character.ai"}}' \
  | jq '.decision'

echo "Testing untrained user..."
curl -s -X POST http://localhost:8000/evaluate \
  -H "Content-Type: application/json" \
  -d '{"user": {"email": "test@company.com", "department": "engineering", "training_completed": false}, "action": "access_ai_service", "resource": {"url": "https://chatgpt.com"}}' \
  | jq '.decision'
EOF

chmod +x test-policies.sh
./test-policies.sh
```

### Tip 3: Performance Monitoring

```bash
# Monitor decision latency
curl http://localhost:8000/stats/summary

# Check cache hit rate
docker exec -it ai-policy-cache redis-cli INFO stats | grep keyspace

# Database performance
docker exec -it ai-policy-db psql -U aigovuser -d ai_governance -c "SELECT COUNT(*) FROM decisions"
```

---

## 🎓 Learning Resources

- **OPA Documentation**: https://www.openpolicyagent.org/docs/
- **FastAPI Tutorial**: https://fastapi.tiangolo.com/tutorial/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **TimescaleDB Tutorial**: https://docs.timescale.com/
- **Grafana Tutorials**: https://grafana.com/tutorials/

---

## 🤝 Getting Help

### Community

- **GitHub Issues**: [Create an issue](https://github.com/rlfagan/aigovevonr/issues)
- **OPA Slack**: https://slack.openpolicyagent.org/
- **Discussions**: Start a discussion in the repo

### Debugging

```bash
# Get full system status
docker-compose ps
docker-compose logs --tail=50

# Check API health
curl http://localhost:8000/health | jq

# Check database
docker exec -it ai-policy-db psql -U aigovuser -d ai_governance -c "SELECT COUNT(*) FROM decisions"
```

---

## ✅ Success Checklist

After completing this guide, you should have:

- [ ] All Docker services running (green status)
- [ ] Decision API responding at http://localhost:8000
- [ ] Policies blocking Character.AI and Replika
- [ ] Policies allowing ChatGPT for engineering department
- [ ] Browser extension installed and working
- [ ] Database logging all decisions
- [ ] Grafana dashboard showing data
- [ ] Ability to customize policies in `.rego` files

---

## 🚀 You're Ready!

You now have a **working AI governance platform** running on your machine for **$0**.

**Next steps**: Check the main [README.md](./README.md) for the full architecture documentation and [10-READINESS-ASSESSMENT-ROADMAP.md](./10-READINESS-ASSESSMENT-ROADMAP.md) for scaling to production.

**Questions?** Open an issue on GitHub.

---

**Built with ❤️ using 100% open source** | No license fees, ever.
