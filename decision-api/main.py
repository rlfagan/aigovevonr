"""
AI Governance Decision API
FastAPI wrapper around Open Policy Agent (OPA)
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import httpx
import asyncpg
import redis.asyncio as redis
import json
import os
import time
from datetime import datetime
import hashlib

# Import policy router
from app.api.policy import router as policy_router

# Configuration from environment
OPA_URL = os.getenv("OPA_URL", "http://localhost:8181")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://aigovuser:aigovpass@localhost:5432/ai_governance")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
CACHE_TTL = int(os.getenv("CACHE_TTL", "300"))  # 5 minutes

# Initialize FastAPI app
app = FastAPI(
    title="AI Governance Decision API",
    description="Policy enforcement API for AI service governance",
    version="0.1.0"
)

# CORS middleware (adjust for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include policy router
app.include_router(policy_router)

# Global connections
db_pool = None
redis_client = None


# ==========================================
# DATA MODELS
# ==========================================

class User(BaseModel):
    email: str
    department: Optional[str] = None
    training_completed: bool = False
    user_id: Optional[str] = None


class Resource(BaseModel):
    type: str = Field(default="ai_service", description="Resource type")
    url: str = Field(description="Resource URL or identifier")
    service: Optional[str] = Field(default=None, description="Service name")


class Context(BaseModel):
    source: str = Field(default="browser_plugin", description="Request source")
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    device_id: Optional[str] = None


class EvaluateRequest(BaseModel):
    user: User
    action: str = Field(default="access_ai_service")
    resource: Resource
    content: Optional[str] = Field(default=None, description="Content to analyze (optional)")
    context: Optional[Context] = Field(default_factory=Context)


class PolicyMatch(BaseModel):
    id: str
    matched: bool
    priority: int


class EvaluateResponse(BaseModel):
    decision_id: str
    decision: str  # ALLOW, DENY, REVIEW
    reason: str
    risk_score: int
    matched_policies: List[PolicyMatch]
    cached: bool = False
    evaluation_duration_ms: int


# ==========================================
# STARTUP / SHUTDOWN
# ==========================================

@app.on_event("startup")
async def startup():
    global db_pool, redis_client

    # Initialize database connection pool
    try:
        db_pool = await asyncpg.create_pool(
            DATABASE_URL,
            min_size=2,
            max_size=10,
            command_timeout=60
        )
        print("✅ Database connection pool created")
    except Exception as e:
        print(f"❌ Failed to connect to database: {e}")

    # Initialize Redis client
    try:
        redis_client = await redis.from_url(
            REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )
        await redis_client.ping()
        print("✅ Redis connection established")
    except Exception as e:
        print(f"❌ Failed to connect to Redis: {e}")
        redis_client = None


@app.on_event("shutdown")
async def shutdown():
    global db_pool, redis_client

    if db_pool:
        await db_pool.close()
        print("Database connection pool closed")

    if redis_client:
        await redis_client.close()
        print("Redis connection closed")


# ==========================================
# HELPER FUNCTIONS
# ==========================================

def generate_cache_key(request: EvaluateRequest) -> str:
    """Generate cache key from request"""
    key_data = f"{request.user.email}:{request.action}:{request.resource.url}"
    return hashlib.md5(key_data.encode()).hexdigest()


async def check_cache(cache_key: str) -> Optional[Dict]:
    """Check if decision is cached"""
    if not redis_client:
        return None

    try:
        cached = await redis_client.get(f"decision:{cache_key}")
        if cached:
            return json.loads(cached)
    except Exception as e:
        print(f"Cache read error: {e}")

    return None


async def set_cache(cache_key: str, decision: Dict):
    """Cache decision"""
    if not redis_client:
        return

    try:
        await redis_client.setex(
            f"decision:{cache_key}",
            CACHE_TTL,
            json.dumps(decision)
        )
    except Exception as e:
        print(f"Cache write error: {e}")


async def call_opa(policy_input: Dict) -> Dict:
    """Call OPA policy engine"""
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            response = await client.post(
                f"{OPA_URL}/v1/data/aigovernance",
                json={"input": policy_input}
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            print(f"OPA call failed: {e}")
            raise HTTPException(status_code=503, detail="Policy engine unavailable")


async def log_decision(request: EvaluateRequest, decision: Dict, duration_ms: int):
    """Log decision to database"""
    if not db_pool:
        print("⚠️ Database not available, skipping log")
        return

    try:
        async with db_pool.acquire() as conn:
            await conn.fetchval(
                """
                SELECT log_decision(
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
                )
                """,
                request.user.email,
                request.user.department,
                request.action,
                request.resource.type,
                request.resource.url,
                request.resource.service,
                decision.get("decision", "DENY"),
                decision.get("reason", "Unknown"),
                decision.get("risk_score", 100),
                request.context.source if request.context else None,
                bool(request.content and "pii" in decision.get("reason", "").lower()),
                bool(request.content and "proprietary" in decision.get("reason", "").lower()),
                None  # metadata
            )
    except Exception as e:
        print(f"Failed to log decision: {e}")


# ==========================================
# API ENDPOINTS
# ==========================================

@app.get("/")
async def root():
    """Health check"""
    return {
        "service": "AI Governance Decision API",
        "version": "0.1.0",
        "status": "healthy"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    health = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {}
    }

    # Check OPA
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(f"{OPA_URL}/health")
            health["services"]["opa"] = "healthy" if response.status_code == 200 else "unhealthy"
    except:
        health["services"]["opa"] = "unreachable"

    # Check database
    if db_pool:
        try:
            async with db_pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            health["services"]["database"] = "healthy"
        except:
            health["services"]["database"] = "unhealthy"
    else:
        health["services"]["database"] = "not_initialized"

    # Check Redis
    if redis_client:
        try:
            await redis_client.ping()
            health["services"]["cache"] = "healthy"
        except:
            health["services"]["cache"] = "unhealthy"
    else:
        health["services"]["cache"] = "not_initialized"

    # Overall status
    if any(v == "unhealthy" or v == "unreachable" for v in health["services"].values()):
        health["status"] = "degraded"

    return health


@app.post("/evaluate", response_model=EvaluateResponse)
async def evaluate_policy(request: EvaluateRequest):
    """
    Evaluate AI governance policy for a request

    Returns ALLOW, DENY, or REVIEW decision
    """
    start_time = time.time()

    # Generate cache key
    cache_key = generate_cache_key(request)

    # Check cache
    cached_decision = await check_cache(cache_key)
    if cached_decision:
        cached_decision["cached"] = True
        cached_decision["evaluation_duration_ms"] = int((time.time() - start_time) * 1000)
        return EvaluateResponse(**cached_decision)

    # Prepare input for OPA
    policy_input = {
        "user": {
            "email": request.user.email,
            "department": request.user.department,
            "training_completed": request.user.training_completed
        },
        "action": request.action,
        "resource": {
            "type": request.resource.type,
            "url": request.resource.url,
            "service": request.resource.service
        },
        "content": request.content or "",
        "context": {
            "source": request.context.source if request.context else "unknown",
            "timestamp": datetime.utcnow().isoformat()
        }
    }

    # Call OPA
    opa_response = await call_opa(policy_input)
    result = opa_response.get("result", {})

    # Extract decision
    decision = result.get("decision", "DENY")
    reason = result.get("reason", "No reason provided")
    risk_score = result.get("risk_score", 100)
    matched_policies = result.get("matched_policies", [])

    # Build response
    response_data = {
        "decision_id": os.urandom(16).hex(),
        "decision": decision,
        "reason": reason,
        "risk_score": risk_score,
        "matched_policies": [
            PolicyMatch(
                id=p.get("id", "unknown"),
                matched=p.get("matched", False),
                priority=p.get("priority", 0)
            )
            for p in matched_policies
        ],
        "cached": False,
        "evaluation_duration_ms": int((time.time() - start_time) * 1000)
    }

    # Cache the decision (only for ALLOW/DENY, not REVIEW)
    if decision in ["ALLOW", "DENY"]:
        await set_cache(cache_key, response_data)

    # Log to database (async, don't wait)
    await log_decision(request, result, response_data["evaluation_duration_ms"])

    return EvaluateResponse(**response_data)


@app.get("/stats/summary")
async def get_summary_stats():
    """Get summary statistics"""
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    async with db_pool.acquire() as conn:
        # Last 24 hours summary
        summary = await conn.fetchrow("""
            SELECT
                COUNT(*) as total_requests,
                COUNT(*) FILTER (WHERE decision = 'ALLOW') as allowed,
                COUNT(*) FILTER (WHERE decision = 'DENY') as denied,
                COUNT(*) FILTER (WHERE decision = 'REVIEW') as review,
                AVG(risk_score) as avg_risk_score,
                COUNT(DISTINCT user_email) as unique_users
            FROM decisions
            WHERE timestamp > NOW() - INTERVAL '24 hours'
        """)

        return dict(summary)


@app.get("/stats/top-services")
async def get_top_services():
    """Get top AI services by usage"""
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    async with db_pool.acquire() as conn:
        services = await conn.fetch("""
            SELECT * FROM top_services LIMIT 10
        """)

        return [dict(s) for s in services]


@app.get("/stats/violations")
async def get_recent_violations():
    """Get recent violations"""
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    async with db_pool.acquire() as conn:
        violations = await conn.fetch("""
            SELECT
                violation_id,
                timestamp,
                user_email,
                violation_type,
                severity,
                resource_service,
                status
            FROM violations
            WHERE timestamp > NOW() - INTERVAL '7 days'
            ORDER BY timestamp DESC
            LIMIT 50
        """)

        return [dict(v) for v in violations]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
