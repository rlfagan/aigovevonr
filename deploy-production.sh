#!/bin/bash
# AI Governance Platform - One-Click Production Deployment
# This script helps you deploy to various cloud providers

set -e

echo "🚀 AI Governance Platform - Production Deployment"
echo "=================================================="
echo ""

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "⚠️  .env.production not found. Creating from template..."
    cp .env.example .env.production
    echo "✅ Created .env.production - Please edit it with your production values!"
    echo ""
    echo "Required values:"
    echo "  - DATABASE_URL"
    echo "  - REDIS_URL"
    echo "  - AUTH_PROVIDER (okta or entra)"
    echo "  - Domain names"
    echo ""
    read -p "Press Enter after editing .env.production..."
fi

# Load environment
source .env.production

echo "Select deployment target:"
echo "1) Google Cloud Run (Recommended - Easiest)"
echo "2) AWS ECS/Fargate"
echo "3) Azure Container Instances"
echo "4) DigitalOcean App Platform"
echo "5) Self-Hosted VPS (Docker Compose)"
echo ""
read -p "Enter choice [1-5]: " DEPLOY_TARGET

case $DEPLOY_TARGET in
    1)
        echo ""
        echo "🌐 Deploying to Google Cloud Run..."
        echo ""

        # Check if gcloud is installed
        if ! command -v gcloud &> /dev/null; then
            echo "❌ Google Cloud SDK not installed"
            echo "Install from: https://cloud.google.com/sdk/docs/install"
            exit 1
        fi

        read -p "Enter your GCP Project ID: " GCP_PROJECT
        gcloud config set project $GCP_PROJECT

        echo "Building and deploying Decision API..."
        cd decision-api
        gcloud builds submit --tag gcr.io/$GCP_PROJECT/ai-policy-api
        gcloud run deploy ai-policy-api \
            --image gcr.io/$GCP_PROJECT/ai-policy-api \
            --platform managed \
            --region us-central1 \
            --allow-unauthenticated \
            --set-env-vars "DATABASE_URL=$DATABASE_URL,REDIS_URL=$REDIS_URL"

        echo "Building and deploying Admin UI..."
        cd ../admin-ui
        gcloud builds submit --tag gcr.io/$GCP_PROJECT/ai-governance-admin
        gcloud run deploy ai-governance-admin \
            --image gcr.io/$GCP_PROJECT/ai-governance-admin \
            --platform managed \
            --region us-central1 \
            --allow-unauthenticated \
            --set-env-vars "NEXT_PUBLIC_AUTH_PROVIDER=$AUTH_PROVIDER"

        echo ""
        echo "✅ Deployment complete!"
        echo "📋 Next steps:"
        echo "   1. Set up custom domain in Cloud Run console"
        echo "   2. Configure IAM provider with your Cloud Run URLs"
        echo "   3. Update browser extension with production API URL"
        ;;

    2)
        echo ""
        echo "🔶 Deploying to AWS ECS..."
        echo ""

        if ! command -v aws &> /dev/null; then
            echo "❌ AWS CLI not installed"
            echo "Install from: https://aws.amazon.com/cli/"
            exit 1
        fi

        echo "Creating ECR repositories..."
        aws ecr create-repository --repository-name ai-policy-api || true
        aws ecr create-repository --repository-name ai-governance-admin || true

        ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
        REGION=$(aws configure get region)

        echo "Logging into ECR..."
        aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

        echo "Building and pushing images..."
        docker build -t ai-policy-api ./decision-api
        docker tag ai-policy-api:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/ai-policy-api:latest
        docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/ai-policy-api:latest

        docker build -t ai-governance-admin ./admin-ui
        docker tag ai-governance-admin:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/ai-governance-admin:latest
        docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/ai-governance-admin:latest

        echo ""
        echo "✅ Images pushed to ECR!"
        echo "📋 Next steps:"
        echo "   1. Create ECS cluster: aws ecs create-cluster --cluster-name ai-governance-prod"
        echo "   2. Create task definitions (see aws-ecs-task-definitions.json)"
        echo "   3. Create ECS services"
        echo "   4. Set up Application Load Balancer"
        ;;

    3)
        echo ""
        echo "🔷 Deploying to Azure..."
        echo ""

        if ! command -v az &> /dev/null; then
            echo "❌ Azure CLI not installed"
            echo "Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
            exit 1
        fi

        read -p "Enter resource group name: " RG_NAME
        read -p "Enter location (e.g., eastus): " LOCATION

        echo "Creating resource group..."
        az group create --name $RG_NAME --location $LOCATION

        echo "Creating container registry..."
        az acr create --resource-group $RG_NAME --name aigovregistry --sku Basic

        echo "Building images..."
        az acr build --registry aigovregistry --image ai-policy-api:latest ./decision-api
        az acr build --registry aigovregistry --image ai-governance-admin:latest ./admin-ui

        echo ""
        echo "✅ Images built!"
        echo "📋 Next steps:"
        echo "   1. Create Azure Container Instances"
        echo "   2. Set up Azure Database for PostgreSQL"
        echo "   3. Configure networking and load balancer"
        ;;

    4)
        echo ""
        echo "🐙 Deploying to DigitalOcean..."
        echo ""

        if ! command -v doctl &> /dev/null; then
            echo "❌ DigitalOcean CLI not installed"
            echo "Install from: https://docs.digitalocean.com/reference/doctl/how-to/install/"
            exit 1
        fi

        echo "DigitalOcean App Platform deployment uses app.yaml"
        echo "Please:"
        echo "  1. Go to https://cloud.digitalocean.com/apps"
        echo "  2. Click 'Create App'"
        echo "  3. Connect your GitHub repository"
        echo "  4. Use the provided app.yaml configuration"
        ;;

    5)
        echo ""
        echo "🏠 Deploying to Self-Hosted VPS..."
        echo ""

        read -p "Enter your server IP: " SERVER_IP
        read -p "Enter SSH user: " SSH_USER

        echo "Copying files to server..."
        scp -r . $SSH_USER@$SERVER_IP:/opt/ai-governance/

        echo "Installing Docker on server..."
        ssh $SSH_USER@$SERVER_IP << 'EOF'
            cd /opt/ai-governance

            # Install Docker if not present
            if ! command -v docker &> /dev/null; then
                curl -fsSL https://get.docker.com -o get-docker.sh
                sh get-docker.sh
            fi

            # Start services
            docker-compose -f docker-compose.prod.yml up -d

            echo "✅ Services started!"
            docker-compose ps
EOF

        echo ""
        echo "✅ Deployed to VPS!"
        echo "📋 Next steps:"
        echo "   1. Install Nginx: ssh $SSH_USER@$SERVER_IP 'apt install nginx'"
        echo "   2. Configure reverse proxy (copy nginx.conf)"
        echo "   3. Get SSL certificate: certbot --nginx -d $DOMAIN"
        ;;

    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment process complete!"
echo ""
echo "📝 Post-Deployment Checklist:"
echo "   [ ] Configure custom domain/DNS"
echo "   [ ] Set up SSL certificates"
echo "   [ ] Configure IAM provider (Okta/Entra)"
echo "   [ ] Update browser extension with production API URL"
echo "   [ ] Test all endpoints"
echo "   [ ] Set up monitoring and alerts"
echo "   [ ] Configure backups"
echo "   [ ] Train users"
echo ""
