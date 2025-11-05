#!/bin/bash

echo "=== Testing OPA Policy ==="
echo ""

echo "1. Testing OPA directly with correct input structure:"
curl -s -X POST 'http://localhost:8181/v1/data/ai_governance' \
  -H 'Content-Type: application/json' \
  -d '{
    "input": {
      "user": {"email": "test@company.com"},
      "action": "use_ai_assistant",
      "resource": {"type": "ai_coding_assistant", "url": "https://copilot.github.com"},
      "content": "",
      "context": {"source": "vscode_extension"}
    }
  }' | python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin), indent=2))"

echo ""
echo ""
echo "2. Testing Decision API /evaluate endpoint:"
curl -s -X POST 'http://localhost:8002/evaluate' \
  -H 'Content-Type: application/json' \
  -d '{
    "user": {"email": "testx@company.com", "department": "engineering", "training_completed": true},
    "action": "use_ai_assistant",
    "resource": {"type": "ai_coding_assistant", "url": "https://copilot.github.com", "service": "GitHub Copilot"},
    "context": {"source": "vscode_extension"}
  }' | python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin), indent=2))"

echo ""
echo ""
echo "3. Active policy file:"
head -10 /Users/ronanfagan/Downloads/AIPOLICY/policies/active/policy.rego
