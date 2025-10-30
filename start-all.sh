#!/bin/bash

# AI Governance Platform - Startup Script
# This script starts all components of the AI Governance Platform

set -e

echo "🚀 Starting AI Governance Platform..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start Docker services
echo "📦 Starting Docker services..."
docker compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo ""
echo "✅ Checking service status..."
docker compose ps

# Check if Admin UI dependencies are installed
if [ ! -d "admin-ui/node_modules" ]; then
    echo ""
    echo "📦 Installing Admin UI dependencies (first time only)..."
    cd admin-ui
    npm install
    cd ..
fi

# Start Admin UI in background
echo ""
echo "🖥️  Starting Admin UI..."
cd admin-ui
npm run dev > /tmp/admin-ui.log 2>&1 &
ADMIN_UI_PID=$!
cd ..

# Wait a few seconds for Admin UI to start
sleep 8

echo ""
echo "✅ All services started successfully!"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "   AI GOVERNANCE PLATFORM - ACCESS POINTS"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🖥️  Admin UI (Main Dashboard):"
echo "   → http://localhost:3001"
echo ""
echo "🔌 Decision API:"
echo "   → http://localhost:8002"
echo "   → http://localhost:8002/docs (API Documentation)"
echo ""
echo "📊 Monitoring & Analytics:"
echo "   → http://localhost:3000 (Grafana - admin/admin)"
echo "   → http://localhost:9090 (Prometheus)"
echo ""
echo "🧪 Policy Engine:"
echo "   → http://localhost:8181 (Open Policy Agent)"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📝 Next Steps:"
echo "   1. Open http://localhost:3001 in your browser"
echo "   2. Check the system health status"
echo "   3. Review the Quick Start guide: cat QUICKSTART.md"
echo "   4. Install browser extension from: browser-extension/"
echo ""
echo "🛑 To stop all services:"
echo "   docker compose down"
echo "   kill $ADMIN_UI_PID"
echo ""
echo "📋 View logs:"
echo "   docker compose logs -f"
echo "   tail -f /tmp/admin-ui.log"
echo ""
