# 🚀 Production Deployment Guide

Complete guide to deploy your AI Governance Platform to production.

---

## 🎯 Deployment Options

Choose your cloud provider:
1. **AWS** (ECS/Fargate) - Recommended for enterprises
2. **Google Cloud** (Cloud Run) - Easiest, serverless
3. **Azure** (Container Instances) - Best if using Microsoft Entra ID
4. **DigitalOcean** (App Platform) - Most affordable
5. **Self-Hosted** (VPS/Dedicated) - Full control

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure you have:
- [ ] Domain name (e.g., `ai-governance.yourcompany.com`)
- [ ] Cloud provider account
- [ ] Credit card for cloud services (most have free tiers)
- [ ] SSL certificate provider (Let's Encrypt is free)
- [ ] IAM provider configured (Okta or Entra ID)
- [ ] Database backup strategy
- [ ] Monitoring/alerting plan

**Estimated Monthly Cost**:
- Small team (<100 users): $20-50/month
- Medium team (<1000 users): $100-200/month
- Large enterprise: $300-500/month

---

## 🏆 Recommended: Google Cloud Run (Easiest)

**Why**: Serverless, auto-scaling, pay-per-use, easiest setup

### Step 1: Prerequisites

```bash
# Install Google Cloud SDK
# macOS
brew install --cask google-cloud-sdk

# Or download from https://cloud.google.com/sdk/docs/install

# Login
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### Step 2: Build Docker Images

```bash
cd /Users/ronanfagan/Downloads/AIPOLICY

# Build Decision API
cd decision-api
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/ai-policy-api

# Build Admin UI
cd ../admin-ui
# First, create Dockerfile (see next section)
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/ai-governance-admin
```

### Step 3: Deploy Services

```bash
# Deploy Decision API
gcloud run deploy ai-policy-api \
  --image gcr.io/YOUR_PROJECT_ID/ai-policy-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "DATABASE_URL=YOUR_DB_URL,REDIS_URL=YOUR_REDIS_URL"

# Deploy Admin UI
gcloud run deploy ai-governance-admin \
  --image gcr.io/YOUR_PROJECT_ID/ai-governance-admin \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NEXT_PUBLIC_AUTH_PROVIDER=okta,NEXT_PUBLIC_OKTA_DOMAIN=..."

# Deploy PostgreSQL (Cloud SQL)
gcloud sql instances create ai-governance-db \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=us-central1

# Deploy Redis (Memorystore)
gcloud redis instances create ai-governance-cache \
  --size=1 \
  --region=us-central1
```

### Step 4: Set Up Custom Domain

```bash
# Map domain to Cloud Run
gcloud run services add-iam-policy-binding ai-governance-admin \
  --member="allUsers" \
  --role="roles/run.invoker"

gcloud run domain-mappings create \
  --service ai-governance-admin \
  --domain ai-governance.yourcompany.com
```

**Cost Estimate**: $15-30/month for small deployment

---

## 💪 AWS Deployment (Enterprise-Grade)

**Why**: Most features, enterprise support, scalability

### Step 1: Prerequisites

```bash
# Install AWS CLI
brew install awscli
aws configure
```

### Step 2: Create ECS Cluster

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name ai-governance-prod

# Create VPC (or use existing)
aws ec2 create-vpc --cidr-block 10.0.0.0/16
```

### Step 3: Push Docker Images to ECR

```bash
# Create ECR repositories
aws ecr create-repository --repository-name ai-policy-api
aws ecr create-repository --repository-name ai-governance-admin

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build and push
docker build -t ai-policy-api ./decision-api
docker tag ai-policy-api:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ai-policy-api:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ai-policy-api:latest
```

### Step 4: Create RDS Database

```bash
# Create PostgreSQL RDS instance
aws rds create-db-instance \
  --db-instance-identifier ai-governance-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username aigovuser \
  --master-user-password YOUR_PASSWORD \
  --allocated-storage 20
```

### Step 5: Deploy with Terraform (Recommended)

Use the Terraform configuration (see terraform/ section below)

**Cost Estimate**: $50-150/month

---

## 🔷 Azure Deployment (Microsoft Stack)

**Why**: Best integration with Microsoft Entra ID, Office 365

### Step 1: Prerequisites

```bash
# Install Azure CLI
brew install azure-cli
az login
```

### Step 2: Create Resource Group

```bash
az group create --name ai-governance-rg --location eastus
```

### Step 3: Deploy Container Instances

```bash
# Create container registry
az acr create --resource-group ai-governance-rg --name aigovregistry --sku Basic

# Build and push images
az acr build --registry aigovregistry --image ai-policy-api:latest ./decision-api

# Deploy containers
az container create \
  --resource-group ai-governance-rg \
  --name ai-policy-api \
  --image aigovregistry.azurecr.io/ai-policy-api:latest \
  --dns-name-label ai-governance-api \
  --ports 8000
```

### Step 4: Create Azure Database for PostgreSQL

```bash
az postgres server create \
  --resource-group ai-governance-rg \
  --name ai-governance-db \
  --location eastus \
  --admin-user aigovuser \
  --admin-password YOUR_PASSWORD \
  --sku-name B_Gen5_1
```

**Cost Estimate**: $40-120/month

---

## 🌊 DigitalOcean (Most Affordable)

**Why**: Simple, affordable, great for startups

### Step 1: Use App Platform

1. Go to https://cloud.digitalocean.com/apps
2. Click "Create App"
3. Connect GitHub repository
4. Select your repo

### Step 2: Configure Services

```yaml
# app.yaml
name: ai-governance-platform
services:
  - name: api
    github:
      repo: your-username/aigovevonr
      branch: main
      deploy_on_push: true
    source_dir: /decision-api
    dockerfile_path: Dockerfile
    http_port: 8000
    instance_count: 1
    instance_size_slug: basic-xs

  - name: admin
    github:
      repo: your-username/aigovevonr
      branch: main
      deploy_on_push: true
    source_dir: /admin-ui
    dockerfile_path: Dockerfile
    http_port: 3000
    instance_count: 1
    instance_size_slug: basic-xs

databases:
  - name: postgres-db
    engine: PG
    version: "14"

  - name: redis-cache
    engine: REDIS
    version: "7"
```

**Cost Estimate**: $12-25/month

---

## 🏠 Self-Hosted (VPS)

**Why**: Full control, lowest long-term cost

### Recommended VPS Providers:
- Hetzner: €4.15/month
- Linode: $5/month
- Vultr: $6/month

### Quick Setup

```bash
# SSH into your server
ssh root@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Clone repo
git clone https://github.com/your-username/aigovevonr.git
cd aigovevonr

# Set environment variables
cp .env.example .env
nano .env  # Edit with production values

# Start services
docker-compose up -d

# Install Nginx
apt install nginx certbot python3-certbot-nginx

# Configure reverse proxy (see nginx.conf below)

# Get SSL certificate
certbot --nginx -d ai-governance.yourcompany.com
```

**Cost Estimate**: $5-20/month

---

## 📁 Required Production Files

### 1. Admin UI Dockerfile

Create `admin-ui/Dockerfile`:

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["npm", "start"]
```

### 2. Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  decision-api:
    build: ./decision-api
    restart: always
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/ai_governance
      - REDIS_URL=redis://redis:6379
      - OPA_URL=http://opa:8181
    depends_on:
      - postgres
      - redis
      - opa
    networks:
      - ai-governance-net

  admin-ui:
    build: ./admin-ui
    restart: always
    environment:
      - NEXT_PUBLIC_AUTH_PROVIDER=${AUTH_PROVIDER}
      - NEXT_PUBLIC_OKTA_DOMAIN=${OKTA_DOMAIN}
      - NEXT_PUBLIC_API_URL=https://api.yourcompany.com
    networks:
      - ai-governance-net

  postgres:
    image: timescale/timescaledb:latest-pg14
    restart: always
    environment:
      - POSTGRES_DB=ai_governance
      - POSTGRES_USER=aigovuser
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - ai-governance-net

  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis-data:/data
    networks:
      - ai-governance-net

  opa:
    image: openpolicyagent/opa:latest
    restart: always
    command:
      - "run"
      - "--server"
      - "--log-level=info"
      - "/policies"
    volumes:
      - ./policies:/policies
    networks:
      - ai-governance-net

  grafana:
    image: grafana/grafana:latest
    restart: always
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana-data:/var/lib/grafana
    networks:
      - ai-governance-net

  prometheus:
    image: prom/prometheus:latest
    restart: always
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    networks:
      - ai-governance-net

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - decision-api
      - admin-ui
      - grafana
    networks:
      - ai-governance-net

volumes:
  postgres-data:
  redis-data:
  grafana-data:
  prometheus-data:

networks:
  ai-governance-net:
    driver: bridge
```

### 3. Nginx Reverse Proxy

Create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=admin:10m rate=30r/s;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Admin UI
    server {
        listen 443 ssl http2;
        server_name ai-governance.yourcompany.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        location / {
            limit_req zone=admin burst=20 nodelay;
            proxy_pass http://admin-ui:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # Decision API
    server {
        listen 443 ssl http2;
        server_name api.ai-governance.yourcompany.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        location / {
            limit_req zone=api burst=10 nodelay;
            proxy_pass http://decision-api:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }

    # Grafana
    server {
        listen 443 ssl http2;
        server_name grafana.ai-governance.yourcompany.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        location / {
            proxy_pass http://grafana:3000;
            proxy_set_header Host $host;
        }
    }

    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }
}
```

### 4. Production Environment Variables

Create `.env.production`:

```bash
# Database
DATABASE_URL=postgresql://aigovuser:SECURE_PASSWORD@postgres:5432/ai_governance
DB_PASSWORD=SECURE_PASSWORD

# Redis
REDIS_URL=redis://redis:6379

# Authentication (choose one)
AUTH_PROVIDER=okta  # or 'entra'

# Okta
OKTA_DOMAIN=yourcompany.okta.com
OKTA_CLIENT_ID=your_client_id
OKTA_API_TOKEN=your_api_token

# Or Entra ID
ENTRA_TENANT_ID=your_tenant_id
ENTRA_CLIENT_ID=your_client_id
ENTRA_CLIENT_SECRET=your_client_secret

# Grafana
GRAFANA_PASSWORD=SECURE_PASSWORD

# Domain
DOMAIN=ai-governance.yourcompany.com
API_DOMAIN=api.ai-governance.yourcompany.com

# Security
SESSION_SECRET=generate_random_64_char_string
JWT_SECRET=generate_random_64_char_string

# Monitoring
SENTRY_DSN=your_sentry_dsn  # Optional
```

---

## 🔒 Security Configuration

### 1. SSL/TLS Certificates

**Option A: Let's Encrypt (Free)**
```bash
# Install certbot
apt install certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d ai-governance.yourcompany.com
certbot --nginx -d api.ai-governance.yourcompany.com

# Auto-renewal
certbot renew --dry-run
```

**Option B: CloudFlare (Free + CDN)**
1. Add your domain to CloudFlare
2. Enable "Full (strict)" SSL/TLS
3. Enable WAF rules
4. Point DNS to your server

### 2. Firewall Rules

```bash
# Allow only necessary ports
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw enable
```

### 3. Database Security

```sql
-- Create read-only user for monitoring
CREATE USER monitoring WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE ai_governance TO monitoring;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitoring;

-- Create limited user for API
CREATE USER api_user WITH PASSWORD 'secure_password';
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO api_user;
```

---

## 📊 Monitoring & Alerting

### Set Up Uptime Monitoring

**Free Options**:
- UptimeRobot: https://uptimerobot.com
- StatusCake: https://www.statuscake.com
- Pingdom: https://www.pingdom.com

### Set Up Error Tracking

**Sentry Integration**:
```bash
# Install Sentry SDK
npm install @sentry/node @sentry/nextjs

# Configure in admin-ui/sentry.config.js
```

### Set Up Log Aggregation

**Options**:
- CloudWatch (AWS)
- Cloud Logging (GCP)
- Logtail: https://logtail.com
- Papertrail: https://papertrailapp.com

---

## 🚀 Deployment Automation

### GitHub Actions CI/CD

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build and push Docker images
        run: |
          docker build -t ai-policy-api:${{ github.sha }} ./decision-api
          docker build -t ai-governance-admin:${{ github.sha }} ./admin-ui

      - name: Deploy to production
        run: |
          # Add your deployment commands here
          # SSH into server and update containers
```

---

## ✅ Post-Deployment Checklist

After deployment:
- [ ] Test all endpoints (admin UI, API, Grafana)
- [ ] Verify SSL certificates
- [ ] Test IAM login flow
- [ ] Load browser extension with production API URL
- [ ] Test policy enforcement
- [ ] Verify database backups
- [ ] Set up monitoring alerts
- [ ] Test email notifications
- [ ] Document production URLs
- [ ] Train users on the system

---

## 📞 Support

Need help with deployment?
- Check deployment logs
- Review security settings
- Test each service individually
- Monitor resource usage

---

**Your platform is ready for production!** 🎉
