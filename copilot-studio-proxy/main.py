"""
Microsoft Copilot Studio Runtime Protection
API Proxy with policy enforcement, content filtering, and compliance logging
"""

from fastapi import FastAPI, HTTPException, Request, Response, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any, AsyncIterator
import httpx
import asyncpg
import json
import os
import time
import re
from datetime import datetime
import hashlib

# Configuration
COPILOT_STUDIO_API = os.getenv("COPILOT_STUDIO_API", "https://api.powerva.microsoft.com")
DECISION_API_URL = os.getenv("DECISION_API_URL", "http://localhost:8002")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://aigovuser:aigovpass@localhost:5432/ai_governance")
API_KEY = os.getenv("API_KEY", "")

app = FastAPI(
    title="Copilot Studio Runtime Protection",
    description="Policy enforcement proxy for Microsoft Copilot Studio agents",
    version="0.1.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global DB pool
db_pool: Optional[asyncpg.Pool] = None

# ==========================================
# DATA MODELS
# ==========================================

class ConversationRequest(BaseModel):
    user_message: str
    user_id: str
    conversation_id: Optional[str] = None
    agent_id: str
    metadata: Optional[Dict] = None


class PolicyCheckRequest(BaseModel):
    user_email: str
    agent_id: str
    agent_name: str
    message: str
    context: Dict


# ==========================================
# PII & CONTENT DETECTION
# ==========================================

PII_PATTERNS = {
    "ssn": r'\b\d{3}-\d{2}-\d{4}\b',
    "credit_card": r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b',
    "email": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
    "phone": r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
    "api_key": r'(?i)(api[_-]?key|apikey)["\']?\s*[:=]\s*["\']?([a-zA-Z0-9_\-]{20,})',
    "aws_key": r'AKIA[0-9A-Z]{16}',
    "jwt": r'eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*',
}

SENSITIVE_KEYWORDS = [
    "confidential", "proprietary", "internal only", "do not share",
    "password", "secret", "credentials", "private key", "access token"
]


def scan_for_pii(text: str) -> Dict[str, List[str]]:
    """Scan text for PII patterns"""
    findings = {}

    for pii_type, pattern in PII_PATTERNS.items():
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            if isinstance(matches[0], tuple):
                matches = [m[1] for m in matches]  # Extract captured group
            findings[pii_type] = matches[:3]  # Limit to first 3 matches

    return findings


def scan_for_sensitive_keywords(text: str) -> List[str]:
    """Check for sensitive keywords"""
    text_lower = text.lower()
    found = [kw for kw in SENSITIVE_KEYWORDS if kw in text_lower]
    return found


# ==========================================
# POLICY ENFORCEMENT
# ==========================================

async def check_policy(request: PolicyCheckRequest) -> Dict:
    """Check if conversation is allowed by policy"""
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.post(
                f"{DECISION_API_URL}/evaluate",
                json={
                    "user": {
                        "email": request.user_email,
                        "department": request.context.get("department"),
                        "training_completed": True
                    },
                    "action": "use_copilot_studio_agent",
                    "resource": {
                        "type": "copilot_studio_agent",
                        "url": f"https://powerva.microsoft.com/agents/{request.agent_id}",
                        "service": f"Copilot Studio - {request.agent_name}"
                    },
                    "content": request.message,
                    "context": {
                        "source": "copilot_studio_proxy",
                        **request.context
                    }
                },
                headers={"X-API-Key": API_KEY} if API_KEY else {}
            )
            response.raise_for_status()
            return response.json()

        except httpx.HTTPError as e:
            print(f"Policy check failed: {e}")
            # Fail closed - deny if policy API is unreachable
            return {
                "decision": "DENY",
                "reason": "Policy service unavailable",
                "risk_score": 100
            }


async def log_conversation(
    user_email: str,
    agent_id: str,
    agent_name: str,
    user_message: str,
    agent_response: Optional[str],
    decision: str,
    risk_score: int,
    pii_detected: Dict,
    sensitive_keywords: List[str],
    duration_ms: int
):
    """Log conversation to database"""
    if not db_pool:
        return

    try:
        async with db_pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO copilot_studio_conversations (
                    user_email,
                    agent_id,
                    agent_name,
                    user_message,
                    agent_response,
                    decision,
                    risk_score,
                    pii_detected,
                    sensitive_keywords,
                    duration_ms,
                    timestamp
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            """,
                user_email,
                agent_id,
                agent_name,
                user_message,
                agent_response,
                decision,
                risk_score,
                json.dumps(pii_detected),
                sensitive_keywords,
                duration_ms,
                datetime.utcnow()
            )
    except Exception as e:
        print(f"Failed to log conversation: {e}")


# ==========================================
# STARTUP / SHUTDOWN
# ==========================================

@app.on_event("startup")
async def startup():
    global db_pool

    try:
        db_pool = await asyncpg.create_pool(
            DATABASE_URL,
            min_size=2,
            max_size=10,
            command_timeout=60
        )
        print("✅ Database connection pool created")

        # Create conversations table if not exists
        async with db_pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS copilot_studio_conversations (
                    id SERIAL PRIMARY KEY,
                    user_email VARCHAR(255) NOT NULL,
                    agent_id VARCHAR(255) NOT NULL,
                    agent_name VARCHAR(255),
                    user_message TEXT NOT NULL,
                    agent_response TEXT,
                    decision VARCHAR(50) NOT NULL,
                    risk_score INTEGER,
                    pii_detected JSONB,
                    sensitive_keywords TEXT[],
                    duration_ms INTEGER,
                    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

                CREATE INDEX IF NOT EXISTS idx_copilot_conversations_user ON copilot_studio_conversations(user_email);
                CREATE INDEX IF NOT EXISTS idx_copilot_conversations_agent ON copilot_studio_conversations(agent_id);
                CREATE INDEX IF NOT EXISTS idx_copilot_conversations_timestamp ON copilot_studio_conversations(timestamp);
                CREATE INDEX IF NOT EXISTS idx_copilot_conversations_decision ON copilot_studio_conversations(decision);
            """)
        print("✅ Copilot Studio conversations table ready")

    except Exception as e:
        print(f"❌ Failed to connect to database: {e}")


@app.on_event("shutdown")
async def shutdown():
    global db_pool
    if db_pool:
        await db_pool.close()


# ==========================================
# API ENDPOINTS
# ==========================================

@app.get("/")
async def root():
    return {
        "service": "Copilot Studio Runtime Protection",
        "version": "0.1.0",
        "status": "healthy"
    }


@app.get("/health")
async def health():
    """Health check"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {}
    }

    # Check Decision API
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(f"{DECISION_API_URL}/health")
            health_status["services"]["decision_api"] = "healthy" if response.status_code == 200 else "unhealthy"
    except:
        health_status["services"]["decision_api"] = "unreachable"

    # Check database
    if db_pool:
        try:
            async with db_pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            health_status["services"]["database"] = "healthy"
        except:
            health_status["services"]["database"] = "unhealthy"
    else:
        health_status["services"]["database"] = "not_initialized"

    return health_status


@app.post("/conversation")
async def handle_conversation(
    request: ConversationRequest,
    user_email: Optional[str] = Header(None, alias="X-User-Email"),
    department: Optional[str] = Header(None, alias="X-User-Department")
):
    """
    Proxy conversation requests to Copilot Studio with policy enforcement
    """
    start_time = time.time()

    if not user_email:
        raise HTTPException(status_code=400, detail="X-User-Email header required")

    # Scan user message for PII and sensitive content
    pii_detected = scan_for_pii(request.user_message)
    sensitive_keywords = scan_for_sensitive_keywords(request.user_message)

    # Check policy
    policy_check = await check_policy(PolicyCheckRequest(
        user_email=user_email,
        agent_id=request.agent_id,
        agent_name=request.metadata.get("agent_name", "Unknown Agent") if request.metadata else "Unknown Agent",
        message=request.user_message,
        context={
            "department": department,
            "conversation_id": request.conversation_id,
            "pii_detected": bool(pii_detected),
            "sensitive_keywords": bool(sensitive_keywords)
        }
    ))

    decision = policy_check.get("decision", "DENY")
    risk_score = policy_check.get("risk_score", 100)

    # Block if policy denies or PII detected
    if decision == "DENY" or pii_detected:
        duration_ms = int((time.time() - start_time) * 1000)

        await log_conversation(
            user_email=user_email,
            agent_id=request.agent_id,
            agent_name=request.metadata.get("agent_name", "Unknown") if request.metadata else "Unknown",
            user_message=request.user_message,
            agent_response=None,
            decision="BLOCKED",
            risk_score=risk_score,
            pii_detected=pii_detected,
            sensitive_keywords=sensitive_keywords,
            duration_ms=duration_ms
        )

        block_reason = []
        if decision == "DENY":
            block_reason.append(policy_check.get("reason", "Policy violation"))
        if pii_detected:
            block_reason.append(f"PII detected: {', '.join(pii_detected.keys())}")

        raise HTTPException(
            status_code=403,
            detail={
                "error": "Request blocked by AI governance policy",
                "reasons": block_reason,
                "risk_score": risk_score,
                "pii_detected": pii_detected,
                "sensitive_keywords": sensitive_keywords
            }
        )

    # Forward request to Copilot Studio
    # NOTE: This is a simplified proxy. In production, you'd need:
    # - Proper authentication with Microsoft
    # - Handle streaming responses
    # - Response content filtering

    agent_response = f"[MOCK RESPONSE - Configure COPILOT_STUDIO_API endpoint]"

    # For now, return mock response
    duration_ms = int((time.time() - start_time) * 1000)

    await log_conversation(
        user_email=user_email,
        agent_id=request.agent_id,
        agent_name=request.metadata.get("agent_name", "Unknown") if request.metadata else "Unknown",
        user_message=request.user_message,
        agent_response=agent_response,
        decision="ALLOWED",
        risk_score=risk_score,
        pii_detected=pii_detected,
        sensitive_keywords=sensitive_keywords,
        duration_ms=duration_ms
    )

    return {
        "conversation_id": request.conversation_id or hashlib.md5(f"{user_email}:{time.time()}".encode()).hexdigest(),
        "agent_response": agent_response,
        "metadata": {
            "filtered": False,
            "risk_score": risk_score,
            "pii_detected": list(pii_detected.keys()) if pii_detected else [],
            "sensitive_keywords": sensitive_keywords,
            "duration_ms": duration_ms
        }
    }


@app.get("/conversations")
async def list_conversations(
    user_email: Optional[str] = None,
    agent_id: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """List recent conversations"""
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    query = "SELECT * FROM copilot_studio_conversations WHERE 1=1"
    params = []

    if user_email:
        params.append(user_email)
        query += f" AND user_email = ${len(params)}"

    if agent_id:
        params.append(agent_id)
        query += f" AND agent_id = ${len(params)}"

    query += f" ORDER BY timestamp DESC LIMIT {limit} OFFSET {skip}"

    async with db_pool.acquire() as conn:
        conversations = await conn.fetch(query, *params)

    return [
        {
            "id": conv["id"],
            "user_email": conv["user_email"],
            "agent_id": conv["agent_id"],
            "agent_name": conv["agent_name"],
            "user_message": conv["user_message"],
            "agent_response": conv["agent_response"],
            "decision": conv["decision"],
            "risk_score": conv["risk_score"],
            "pii_detected": json.loads(conv["pii_detected"]) if conv["pii_detected"] else {},
            "sensitive_keywords": conv["sensitive_keywords"],
            "duration_ms": conv["duration_ms"],
            "timestamp": conv["timestamp"].isoformat()
        }
        for conv in conversations
    ]


@app.get("/stats")
async def get_stats():
    """Get conversation statistics"""
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    async with db_pool.acquire() as conn:
        stats = await conn.fetchrow("""
            SELECT
                COUNT(*) as total_conversations,
                COUNT(*) FILTER (WHERE decision = 'ALLOWED') as allowed,
                COUNT(*) FILTER (WHERE decision = 'BLOCKED') as blocked,
                COUNT(DISTINCT user_email) as unique_users,
                COUNT(DISTINCT agent_id) as unique_agents,
                AVG(risk_score) as avg_risk_score,
                AVG(duration_ms) as avg_duration_ms
            FROM copilot_studio_conversations
            WHERE timestamp > NOW() - INTERVAL '24 hours'
        """)

    return dict(stats)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=True)
