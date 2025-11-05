#!/usr/bin/env python3
import httpx
import json

# Test from OUTSIDE docker (like Decision API would call OPA from inside)
OPA_URL = "http://localhost:8181"

policy_input = {
    "user": {
        "email": "test@company.com",
        "department": "engineering",
        "training_completed": True
    },
    "action": "use_ai_assistant",
    "resource": {
        "type": "ai_coding_assistant",
        "url": "https://copilot.github.com",
        "service": "GitHub Copilot"
    },
    "content": "",
    "context": {
        "source": "vscode_extension"
    }
}

print("Calling OPA at:", f"{OPA_URL}/v1/data/ai_governance")
print("Input:", json.dumps(policy_input, indent=2))
print()

try:
    response = httpx.post(
        f"{OPA_URL}/v1/data/ai_governance",
        json={"input": policy_input},
        timeout=5.0
    )
    response.raise_for_status()
    opa_response = response.json()

    print("OPA Response:", json.dumps(opa_response, indent=2))
    print()

    result = opa_response.get("result", {})
    print("Extracted result:", result)
    print()

    decision = result.get("decision", "DENY")
    reason = result.get("reason", "No reason provided")
    risk_score = result.get("risk_score", 100)

    print(f"Decision: {decision}")
    print(f"Reason: {reason}")
    print(f"Risk Score: {risk_score}")

except Exception as e:
    print(f"Error: {e}")
