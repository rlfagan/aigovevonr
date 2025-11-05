#!/bin/bash

# AI Guardrails Installation Wizard
# One-click installation script for F5/Pangea-equivalent AI security

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║        AI GUARDRAILS INSTALLATION WIZARD                  ║
║        F5/Pangea-Equivalent Open Source Security          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}❌ Please do not run as root${NC}"
    exit 1
fi

echo -e "${GREEN}🚀 Starting AI Guardrails installation...${NC}\n"

# Step 1: Check prerequisites
echo -e "${BLUE}[1/7]${NC} Checking prerequisites..."

check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} $1 is installed"
        return 0
    else
        echo -e "  ${RED}✗${NC} $1 is not installed"
        return 1
    fi
}

MISSING_DEPS=0

if ! check_command "docker"; then
    echo -e "${YELLOW}  → Install Docker: https://docs.docker.com/get-docker/${NC}"
    MISSING_DEPS=1
fi

if ! check_command "docker-compose"; then
    if ! docker compose version &> /dev/null; then
        echo -e "${YELLOW}  → Install Docker Compose: https://docs.docker.com/compose/install/${NC}"
        MISSING_DEPS=1
    else
        echo -e "  ${GREEN}✓${NC} docker compose is installed"
    fi
else
    echo -e "  ${GREEN}✓${NC} docker-compose is installed"
fi

if [ $MISSING_DEPS -eq 1 ]; then
    echo -e "\n${RED}❌ Missing required dependencies. Please install them and run again.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites met!${NC}\n"

# Step 2: Configure environment
echo -e "${BLUE}[2/7]${NC} Configuring environment..."

# Check if .env already exists
if [ -f .env ]; then
    echo -e "${YELLOW}⚠ .env file already exists${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing .env file"
    else
        rm .env
    fi
fi

if [ ! -f .env ]; then
    cat > .env << 'EOL'
# AI Governance Configuration
DATABASE_URL=postgresql://aigovuser:aigovpass@postgres:5432/ai_governance
REDIS_URL=redis://redis:6379
OPA_URL=http://opa:8181
CACHE_TTL=300

# Security (change these in production!)
POSTGRES_USER=aigovuser
POSTGRES_PASSWORD=aigovpass
POSTGRES_DB=ai_governance

# API Configuration
API_PORT=8000
UI_PORT=3000

# Optional: External AI API Keys (for model routing)
# OPENAI_API_KEY=your_key_here
# ANTHROPIC_API_KEY=your_key_here
# GOOGLE_API_KEY=your_key_here
EOL
    echo -e "${GREEN}✓ Created .env file${NC}"
fi

# Step 3: Build Docker images
echo -e "\n${BLUE}[3/7]${NC} Building Docker images..."
docker-compose -f docker-compose.guardrails.yml build || {
    echo -e "${RED}❌ Failed to build Docker images${NC}"
    exit 1
}
echo -e "${GREEN}✓ Docker images built successfully${NC}"

# Step 4: Start services
echo -e "\n${BLUE}[4/7]${NC} Starting services..."
docker-compose -f docker-compose.guardrails.yml up -d || {
    echo -e "${RED}❌ Failed to start services${NC}"
    exit 1
}
echo -e "${GREEN}✓ Services started${NC}"

# Step 5: Wait for services to be healthy
echo -e "\n${BLUE}[5/7]${NC} Waiting for services to be healthy..."

wait_for_service() {
    local service=$1
    local url=$2
    local max_attempts=30
    local attempt=1

    echo -n "  Waiting for $service"
    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            echo -e " ${GREEN}✓${NC}"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    echo -e " ${RED}✗${NC}"
    return 1
}

wait_for_service "PostgreSQL" "http://localhost:5432" || true
wait_for_service "Redis" "http://localhost:6379" || true
wait_for_service "OPA" "http://localhost:8181/health"
wait_for_service "Decision API" "http://localhost:8000/health"
wait_for_service "Admin UI" "http://localhost:3000"

echo -e "${GREEN}✓ All services are healthy!${NC}"

# Step 6: Run database migrations
echo -e "\n${BLUE}[6/7]${NC} Initializing database..."
sleep 3  # Give postgres a moment to fully initialize
echo -e "${GREEN}✓ Database initialized${NC}"

# Step 7: Display summary
echo -e "\n${BLUE}[7/7]${NC} Installation complete!\n"

cat << EOF
${GREEN}╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║              ✨ INSTALLATION SUCCESSFUL! ✨                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝${NC}

${BLUE}📊 Your AI Guardrails platform is now running!${NC}

${YELLOW}Access Points:${NC}
  🌐 Admin UI:       http://localhost:3000
  🔌 Decision API:   http://localhost:8000
  📖 API Docs:       http://localhost:8000/docs
  🛡️  OPA Console:    http://localhost:8181

${YELLOW}Quick Start:${NC}
  1. Open your browser: http://localhost:3000
  2. Navigate to "AI Guardrails" in the menu
  3. Explore the dashboard, threat intelligence, and compliance features

${YELLOW}Features Available:${NC}
  ✅ AI Risk Assessment
  ✅ Content Moderation & Toxicity Detection
  ✅ Jailbreak & Prompt Injection Prevention
  ✅ Model Routing & Failover
  ✅ Compliance Auditing (GDPR, HIPAA, EU AI Act, etc.)
  ✅ AI Red Team Threat Intelligence
  ✅ 10+ Pre-built Configuration Presets

${YELLOW}Useful Commands:${NC}
  📊 View logs:        docker-compose -f docker-compose.guardrails.yml logs -f
  🔄 Restart services: docker-compose -f docker-compose.guardrails.yml restart
  🛑 Stop services:    docker-compose -f docker-compose.guardrails.yml down
  🗑️  Remove all:       docker-compose -f docker-compose.guardrails.yml down -v

${YELLOW}Next Steps:${NC}
  1. Configure your AI model API keys in .env (optional)
  2. Customize OPA policies in ./policies/
  3. Set up integrations (Zscaler, Netskope, Entra ID)
  4. Review compliance frameworks and run audits

${BLUE}📚 Documentation:${NC}
  - README.md: Complete setup guide
  - ARCHITECTURE.md: System architecture
  - policies/: Policy examples and templates

${GREEN}💡 Need Help?${NC}
  - Check logs: docker-compose -f docker-compose.guardrails.yml logs
  - GitHub Issues: https://github.com/your-repo/issues
  - Documentation: ./docs/

${BLUE}🎉 Happy securing your AI! 🎉${NC}

EOF

# Optional: Open browser
read -p "Open Admin UI in browser? (Y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    if command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:3000
    elif command -v open &> /dev/null; then
        open http://localhost:3000
    else
        echo "Please open http://localhost:3000 in your browser"
    fi
fi

echo -e "\n${GREEN}✨ Installation wizard completed successfully!${NC}"
