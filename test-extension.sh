#!/bin/bash

# Test script for AI Governance Browser Extension
# This script tests the Decision API that the extension uses

set -e

echo "🧪 AI Governance Extension Test Suite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "⚠️  Warning: 'jq' not found. Installing for better output formatting..."
    echo "   (You can also install it manually: brew install jq)"
    echo ""
fi

# Check if API is running
echo "1️⃣  Checking if Decision API is running..."
if curl -s http://localhost:8002/health > /dev/null 2>&1; then
    echo "   ✅ Decision API is running"
else
    echo "   ❌ Decision API is not running!"
    echo "   Please start it with: docker compose up -d"
    exit 1
fi
echo ""

# Test 1: Block prohibited service
echo "2️⃣  Testing BLOCKED service (Character.AI)..."
RESPONSE=$(curl -s -X POST http://localhost:8002/evaluate \
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
  }')

DECISION=$(echo "$RESPONSE" | grep -o '"decision":"[^"]*"' | cut -d'"' -f4)

if [ "$DECISION" = "DENY" ]; then
    echo "   ✅ Character.AI correctly DENIED"
    if command -v jq &> /dev/null; then
        echo "   Reason: $(echo "$RESPONSE" | jq -r '.reason')"
        echo "   Risk Score: $(echo "$RESPONSE" | jq -r '.risk_score')"
    fi
else
    echo "   ❌ FAILED: Expected DENY but got $DECISION"
fi
echo ""

# Test 2: Allow approved service
echo "3️⃣  Testing ALLOWED service (ChatGPT)..."
RESPONSE=$(curl -s -X POST http://localhost:8002/evaluate \
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
  }')

DECISION=$(echo "$RESPONSE" | grep -o '"decision":"[^"]*"' | cut -d'"' -f4)

if [ "$DECISION" = "ALLOW" ]; then
    echo "   ✅ ChatGPT correctly ALLOWED"
    if command -v jq &> /dev/null; then
        echo "   Reason: $(echo "$RESPONSE" | jq -r '.reason')"
        echo "   Risk Score: $(echo "$RESPONSE" | jq -r '.risk_score')"
    fi
else
    echo "   ❌ FAILED: Expected ALLOW but got $DECISION"
fi
echo ""

# Test 3: Block untrained user
echo "4️⃣  Testing untrained user (should be DENIED)..."
RESPONSE=$(curl -s -X POST http://localhost:8002/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "user": {
      "email": "newbie@company.com",
      "department": "engineering",
      "training_completed": false
    },
    "action": "access_ai_service",
    "resource": {
      "type": "ai_service",
      "url": "https://chatgpt.com"
    }
  }')

DECISION=$(echo "$RESPONSE" | grep -o '"decision":"[^"]*"' | cut -d'"' -f4)

if [ "$DECISION" = "DENY" ]; then
    echo "   ✅ Untrained user correctly DENIED"
    if command -v jq &> /dev/null; then
        echo "   Reason: $(echo "$RESPONSE" | jq -r '.reason')"
    fi
else
    echo "   ❌ FAILED: Expected DENY for untrained user but got $DECISION"
fi
echo ""

# Test 4: Different department
echo "5️⃣  Testing different department (Marketing with ChatGPT)..."
RESPONSE=$(curl -s -X POST http://localhost:8002/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "user": {
      "email": "jane@company.com",
      "department": "marketing",
      "training_completed": true
    },
    "action": "access_ai_service",
    "resource": {
      "type": "ai_service",
      "url": "https://chatgpt.com"
    }
  }')

DECISION=$(echo "$RESPONSE" | grep -o '"decision":"[^"]*"' | cut -d'"' -f4)

if [ "$DECISION" = "ALLOW" ]; then
    echo "   ✅ Marketing correctly ALLOWED for ChatGPT"
    if command -v jq &> /dev/null; then
        echo "   Reason: $(echo "$RESPONSE" | jq -r '.reason')"
    fi
else
    echo "   ⚠️  Marketing was DENIED (check your policy)"
    if command -v jq &> /dev/null; then
        echo "   Reason: $(echo "$RESPONSE" | jq -r '.reason')"
    fi
fi
echo ""

# Test 5: Check replika.com (should be blocked)
echo "6️⃣  Testing another blocked service (Replika.com)..."
RESPONSE=$(curl -s -X POST http://localhost:8002/evaluate \
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
      "url": "https://replika.com"
    }
  }')

DECISION=$(echo "$RESPONSE" | grep -o '"decision":"[^"]*"' | cut -d'"' -f4)

if [ "$DECISION" = "DENY" ]; then
    echo "   ✅ Replika.com correctly DENIED"
    if command -v jq &> /dev/null; then
        echo "   Reason: $(echo "$RESPONSE" | jq -r '.reason')"
    fi
else
    echo "   ❌ FAILED: Expected DENY but got $DECISION"
fi
echo ""

# Check database logging
echo "7️⃣  Checking database logs..."
if docker exec -it ai-policy-db psql -U aigovuser -d ai_governance -c "SELECT COUNT(*) FROM decisions" > /dev/null 2>&1; then
    DECISION_COUNT=$(docker exec -it ai-policy-db psql -U aigovuser -d ai_governance -t -c "SELECT COUNT(*) FROM decisions" | tr -d ' ')
    echo "   ✅ Database is logging decisions"
    echo "   Total decisions in database: $DECISION_COUNT"
else
    echo "   ❌ Cannot connect to database"
fi
echo ""

# Check browser extension files
echo "8️⃣  Checking browser extension files..."
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

if [ -f "browser-extension/manifest.json" ]; then
    echo "   ✅ manifest.json exists"
else
    echo "   ❌ manifest.json not found"
fi

if [ -f "browser-extension/background.js" ]; then
    echo "   ✅ background.js exists"
else
    echo "   ❌ background.js not found"
fi

if [ -f "browser-extension/popup.html" ]; then
    echo "   ✅ popup.html exists"
else
    echo "   ❌ popup.html not found"
fi

if [ -d "browser-extension/icons" ]; then
    ICON_COUNT=$(ls browser-extension/icons/*.png 2>/dev/null | wc -l)
    if [ "$ICON_COUNT" -ge 3 ]; then
        echo "   ✅ Extension icons exist ($ICON_COUNT icons)"
    else
        echo "   ⚠️  Only $ICON_COUNT icons found (need 3: 16x16, 48x48, 128x128)"
    fi
else
    echo "   ❌ icons directory not found"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ API Tests Complete!"
echo ""
echo "📋 Next Steps to Test the Browser Extension:"
echo ""
echo "1. Open Chrome/Edge and go to: chrome://extensions/"
echo "2. Enable 'Developer mode' (toggle in top-right)"
echo "3. Click 'Load unpacked'"
echo "4. Select: $(pwd)/browser-extension/"
echo "5. Visit these URLs to test:"
echo "   - https://character.ai (should be BLOCKED)"
echo "   - https://chatgpt.com (should show WARNING banner)"
echo "6. Click the extension icon to see statistics"
echo ""
echo "📖 Full testing guide: cat BROWSER_EXTENSION_TEST_GUIDE.md"
echo ""
