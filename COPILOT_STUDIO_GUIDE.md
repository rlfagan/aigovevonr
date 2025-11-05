# Microsoft Copilot Studio Runtime Protection

Complete guide for protecting Microsoft Copilot Studio agents with policy enforcement, PII detection, and compliance logging.

## Features

✅ **API Proxy** - Intercept all Copilot Studio agent conversations
✅ **Policy Enforcement** - Block requests that violate AI governance policies  
✅ **PII Detection** - Scan prompts for SSN, credit cards, API keys, etc.
✅ **Content Filtering** - Detect sensitive keywords and proprietary information
✅ **Compliance Logging** - Log all conversations for audit and compliance
✅ **Real-time Monitoring** - Track usage statistics and violations
✅ **Risk Scoring** - Assign risk scores to conversations

## Architecture

```
User App → Copilot Studio Proxy (8003) → Policy Check → Copilot Studio API
                                       ↓
                                 Logging & Audit
```

The proxy sits between your application and Microsoft Copilot Studio:
1. Intercepts conversation requests
2. Scans for PII and sensitive content
3. Checks policy (via Decision API)
4. Blocks or allows request
5. Logs all activity
6. Forwards allowed requests to Copilot Studio

## Quick Start

### 1. Start the Service

```bash
# Build and start Copilot Studio proxy
docker compose up -d copilot-studio-proxy

# Check logs
docker compose logs copilot-studio-proxy
```

Service runs on: **http://localhost:8003**

### 2. Test the Proxy

```bash
# Health check
curl http://localhost:8003/health

# Send a conversation
curl -X POST http://localhost:8003/conversation \
  -H "Content-Type: application/json" \
  -H "X-User-Email: user@company.com" \
  -H "X-User-Department: Engineering" \
  -d '{
    "user_message": "What is the weather today?",
    "user_id": "user123",
    "agent_id": "agent-weather-bot",
    "metadata": {
      "agent_name": "Weather Assistant"
    }
  }'
```

## API Endpoints

### Send Conversation

```bash
POST /conversation
Headers:
  X-User-Email: user@company.com
  X-User-Department: Engineering (optional)
Body:
{
  "user_message": "User prompt here",
  "user_id": "unique_user_id",
  "conversation_id": "optional_conversation_id",
  "agent_id": "copilot_agent_id",
  "metadata": {
    "agent_name": "My Copilot Agent"
  }
}
```

Response (Allowed):
```json
{
  "conversation_id": "abc123",
  "agent_response": "Agent's response here",
  "metadata": {
    "filtered": false,
    "risk_score": 10,
    "pii_detected": [],
    "sensitive_keywords": [],
    "duration_ms": 245
  }
}
```

Response (Blocked):
```json
{
  "error": "Request blocked by AI governance policy",
  "reasons": [
    "Policy violation: Copilot Studio agents not approved",
    "PII detected: ssn, credit_card"
  ],
  "risk_score": 90,
  "pii_detected": {
    "ssn": ["***-**-1234"],
    "credit_card": ["****-****-****-5678"]
  },
  "sensitive_keywords": ["confidential", "password"]
}
```

### List Conversations

```bash
GET /conversations?user_email=user@company.com&limit=100&skip=0

Response:
[
  {
    "id": 1,
    "user_email": "user@company.com",
    "agent_id": "agent-weather-bot",
    "agent_name": "Weather Assistant",
    "user_message": "What is the weather?",
    "agent_response": "The weather is sunny.",
    "decision": "ALLOWED",
    "risk_score": 10,
    "pii_detected": {},
    "sensitive_keywords": [],
    "duration_ms": 245,
    "timestamp": "2024-01-15T10:30:00Z"
  }
]
```

### Get Statistics

```bash
GET /stats

Response:
{
  "total_conversations": 1245,
  "allowed": 1198,
  "blocked": 47,
  "unique_users": 156,
  "unique_agents": 8,
  "avg_risk_score": 23.5,
  "avg_duration_ms": 312
}
```

## PII Detection

The proxy automatically scans for:

- **SSN**: 123-45-6789
- **Credit Cards**: 1234-5678-9012-3456
- **Email Addresses**: user@domain.com
- **Phone Numbers**: 555-123-4567
- **API Keys**: api_key=abc123...
- **AWS Keys**: AKIA...
- **JWT Tokens**: eyJ...

## Sensitive Keywords

Detects content marked as:

- confidential
- proprietary
- internal only
- do not share
- password
- secret
- credentials
- private key
- access token

## Policy Integration

Create policy for Copilot Studio agents:

```rego
# policies/active/policy.rego

package ai_governance

# Allow Copilot Studio for approved departments
allow if {
    input.action == "use_copilot_studio_agent"
    input.user.department in ["Engineering", "Product", "Support"]
    input.user.training_completed
}

# Deny if PII detected
deny if {
    input.context.pii_detected == true
}

# Deny sensitive content
deny if {
    input.context.sensitive_keywords == true
}
```

## Integration Examples

### JavaScript/TypeScript

```typescript
async function sendToCopilot(message: string, userId: string, agentId: string) {
  const response = await fetch('http://localhost:8003/conversation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Email': 'user@company.com',
      'X-User-Department': 'Engineering'
    },
    body: JSON.stringify({
      user_message: message,
      user_id: userId,
      agent_id: agentId,
      metadata: {
        agent_name: 'My Agent'
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Blocked by policy:', error.reasons);
    throw new Error(`Blocked: ${error.reasons.join(', ')}`);
  }

  return await response.json();
}
```

### Python

```python
import httpx

async def send_to_copilot(message: str, user_id: str, agent_id: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            'http://localhost:8003/conversation',
            json={
                'user_message': message,
                'user_id': user_id,
                'agent_id': agent_id,
                'metadata': {'agent_name': 'My Agent'}
            },
            headers={
                'X-User-Email': 'user@company.com',
                'X-User-Department': 'Engineering'
            }
        )
        
        if response.status_code == 403:
            error = response.json()
            print(f"Blocked: {error['reasons']}")
            raise ValueError(f"Request blocked")
        
        response.raise_for_status()
        return response.json()
```

## Monitoring & Alerts

View Copilot Studio activity in Admin UI (coming soon):

- **Real-time Dashboard**: http://localhost:3001/copilot-studio
- **Conversation Logs**: All requests and responses
- **Blocked Requests**: Violations and reasons
- **User Analytics**: Per-user and per-agent stats
- **Compliance Reports**: Export for auditing

## Configuration

### Environment Variables

```bash
# Copilot Studio API endpoint
COPILOT_STUDIO_API=https://api.powerva.microsoft.com

# Decision API for policy checks
DECISION_API_URL=http://localhost:8002

# Database for logging
DATABASE_URL=postgresql://user:pass@localhost:5432/ai_governance

# API key for authentication
API_KEY=your_secure_api_key
```

### Production Deployment

For production:

1. **Use HTTPS** - TLS certificates required
2. **Microsoft Authentication** - Configure OAuth with Azure AD
3. **Rate Limiting** - Prevent abuse
4. **Caching** - Redis cache for policy decisions
5. **Monitoring** - Prometheus metrics + Grafana dashboards
6. **Alerts** - Notify admins of violations

## Troubleshooting

### Proxy Returns 503

**Error**: "Policy service unavailable"

**Fix**: Check Decision API is running:
```bash
curl http://localhost:8002/health
docker compose logs decision-api
```

### PII False Positives

If legitimate content is flagged as PII, adjust patterns in:
```python
# copilot-studio-proxy/main.py
PII_PATTERNS = {
  # Modify or remove patterns
}
```

### Database Connection Error

**Error**: "Database not available"

**Fix**: Ensure PostgreSQL is running and migrations applied:
```bash
docker compose ps postgres
docker compose logs postgres
```

## Security Best Practices

1. **Always use API proxy** - Never call Copilot Studio directly
2. **Validate user emails** - Ensure headers are from trusted sources
3. **Rate limit** - Prevent abuse and DoS attacks
4. **Monitor logs** - Review blocked requests regularly
5. **Rotate API keys** - Change keys every 90 days
6. **Enable audit logging** - Keep records for compliance

## Next Steps

- [ ] Start Copilot Studio proxy
- [ ] Test with sample conversation
- [ ] Configure policy for Copilot Studio agents
- [ ] Integrate with your application
- [ ] Monitor conversations in dashboard
- [ ] Set up alerts for violations

---

**Port**: 8003
**Documentation**: This file
**Logs**: `docker compose logs copilot-studio-proxy`
