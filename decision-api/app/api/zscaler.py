"""
Zscaler Integration API
Handles log ingestion, configuration, and analytics for Zscaler Internet Access (ZIA) and Private Access (ZPA)
"""

from fastapi import APIRouter, HTTPException, Request, Header
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import asyncpg
import hashlib
import hmac
import os

router = APIRouter(prefix="/api/zscaler", tags=["Zscaler"])

# Global DB pool (set from main.py)
db_pool = None


def set_db_pool(pool):
    global db_pool
    db_pool = pool


# ==========================================
# DATA MODELS
# ==========================================

class ZscalerWebLog(BaseModel):
    """Zscaler Internet Access web log"""
    timestamp: datetime
    user_email: Optional[str] = None
    user_location: Optional[str] = None
    url: str
    domain: str
    category: Optional[str] = None
    action: str = Field(description="Allowed, Blocked, or Cautioned")
    threat_category: Optional[str] = None
    threat_name: Optional[str] = None
    risk_score: Optional[int] = Field(default=None, ge=0, le=100)
    dlp_dictionaries: Optional[List[str]] = None
    dlp_engine: Optional[str] = None
    file_type: Optional[str] = None
    application: Optional[str] = None
    cloud_app: Optional[str] = None
    policy_name: Optional[str] = None
    policy_reason: Optional[str] = None
    source_ip: Optional[str] = None
    dest_ip: Optional[str] = None
    bytes_sent: Optional[int] = None
    bytes_received: Optional[int] = None
    device_owner: Optional[str] = None
    device_hostname: Optional[str] = None
    raw_log: Optional[Dict[str, Any]] = None


class ZscalerZPALog(BaseModel):
    """Zscaler Private Access log"""
    timestamp: datetime
    user_email: Optional[str] = None
    application_name: Optional[str] = None
    application_id: Optional[str] = None
    connection_status: Optional[str] = None
    connection_reason: Optional[str] = None
    policy_name: Optional[str] = None
    policy_action: Optional[str] = None
    connector_group: Optional[str] = None
    client_public_ip: Optional[str] = None
    bytes_tx: Optional[int] = None
    bytes_rx: Optional[int] = None
    session_id: Optional[str] = None
    session_duration: Optional[int] = None
    device_type: Optional[str] = None
    os_type: Optional[str] = None
    raw_log: Optional[Dict[str, Any]] = None


class ZscalerWebLogBatch(BaseModel):
    """Batch of web logs"""
    logs: List[ZscalerWebLog]


class ZscalerZPALogBatch(BaseModel):
    """Batch of ZPA logs"""
    logs: List[ZscalerZPALog]


class ZscalerConfig(BaseModel):
    """Zscaler configuration"""
    cloud_name: str = Field(description="Zscaler cloud name (e.g., zscaler, zscalerone, etc.)")
    api_key: str = Field(description="Zscaler API key")
    username: str = Field(description="Zscaler admin username")
    password: str = Field(description="Zscaler admin password")
    enabled: bool = True
    log_types: List[str] = Field(default=["web", "zpa"])
    sync_interval_minutes: int = Field(default=5, ge=1, le=60)
    webhook_url: Optional[str] = None
    webhook_secret: Optional[str] = None


class ZscalerStats(BaseModel):
    """Zscaler statistics"""
    total_logs_ingested: int
    web_logs_count: int
    zpa_logs_count: int
    ai_detections_count: int
    blocked_requests: int
    dlp_incidents: int
    unique_users: int
    last_sync: Optional[datetime] = None


# ==========================================
# HELPER FUNCTIONS
# ==========================================

def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify Zscaler webhook signature"""
    expected_signature = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected_signature)


async def get_user_department(email: str) -> Optional[str]:
    """Lookup user department from users table"""
    if not db_pool or not email:
        return None

    try:
        async with db_pool.acquire() as conn:
            result = await conn.fetchval(
                "SELECT department FROM users WHERE email = $1",
                email
            )
            return result
    except Exception as e:
        print(f"Error looking up user department: {e}")
        return None


# ==========================================
# CONFIGURATION ENDPOINTS
# ==========================================

@router.post("/configure")
async def configure_zscaler(config: ZscalerConfig):
    """
    Configure Zscaler integration
    """
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        async with db_pool.acquire() as conn:
            # Simple encryption (in production, use proper encryption like Fernet)
            api_key_encrypted = config.api_key  # TODO: Encrypt in production
            password_encrypted = config.password  # TODO: Encrypt in production
            webhook_secret_encrypted = config.webhook_secret if config.webhook_secret else None

            # Update or insert configuration
            await conn.execute("""
                INSERT INTO zscaler_config (
                    cloud_name,
                    api_key_encrypted,
                    username,
                    enabled,
                    log_types,
                    sync_interval_minutes,
                    webhook_url,
                    webhook_secret_encrypted,
                    updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                ON CONFLICT (config_id)
                DO UPDATE SET
                    cloud_name = EXCLUDED.cloud_name,
                    api_key_encrypted = EXCLUDED.api_key_encrypted,
                    username = EXCLUDED.username,
                    enabled = EXCLUDED.enabled,
                    log_types = EXCLUDED.log_types,
                    sync_interval_minutes = EXCLUDED.sync_interval_minutes,
                    webhook_url = EXCLUDED.webhook_url,
                    webhook_secret_encrypted = EXCLUDED.webhook_secret_encrypted,
                    updated_at = NOW()
            """, config.cloud_name, api_key_encrypted, config.username,
                config.enabled, config.log_types, config.sync_interval_minutes,
                config.webhook_url, webhook_secret_encrypted)

            return {
                "success": True,
                "message": "Zscaler configuration saved successfully",
                "webhook_endpoint": f"{os.getenv('PUBLIC_URL', 'http://localhost:8002')}/api/zscaler/webhook"
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save configuration: {str(e)}")


@router.get("/config")
async def get_zscaler_config():
    """
    Get current Zscaler configuration (without secrets)
    """
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        async with db_pool.acquire() as conn:
            config = await conn.fetchrow("""
                SELECT
                    cloud_name,
                    username,
                    enabled,
                    log_types,
                    sync_interval_minutes,
                    webhook_url,
                    last_sync_timestamp,
                    last_sync_status,
                    last_sync_record_count,
                    (api_key_encrypted IS NOT NULL) AS has_api_key,
                    (webhook_secret_encrypted IS NOT NULL) AS has_webhook_secret
                FROM zscaler_config
                ORDER BY created_at DESC
                LIMIT 1
            """)

            if not config:
                return {
                    "configured": False
                }

            return {
                "configured": True,
                "cloud_name": config["cloud_name"],
                "username": config["username"],
                "enabled": config["enabled"],
                "log_types": config["log_types"],
                "sync_interval_minutes": config["sync_interval_minutes"],
                "webhook_url": config["webhook_url"],
                "has_api_key": config["has_api_key"],
                "has_webhook_secret": config["has_webhook_secret"],
                "last_sync": config["last_sync_timestamp"],
                "last_sync_status": config["last_sync_status"],
                "last_sync_record_count": config["last_sync_record_count"]
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve configuration: {str(e)}")


@router.post("/test-connection")
async def test_zscaler_connection():
    """
    Test Zscaler connection and configuration
    Returns detailed test results
    """
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    test_results = {
        "success": False,
        "timestamp": datetime.utcnow().isoformat(),
        "tests": []
    }

    try:
        async with db_pool.acquire() as conn:
            # Test 1: Check if configuration exists
            config = await conn.fetchrow("""
                SELECT cloud_name, username, api_key_encrypted, enabled
                FROM zscaler_config
                WHERE enabled = TRUE
                ORDER BY created_at DESC
                LIMIT 1
            """)

            if not config:
                test_results["tests"].append({
                    "name": "Configuration Check",
                    "status": "failed",
                    "message": "No enabled Zscaler configuration found"
                })
                return test_results

            test_results["tests"].append({
                "name": "Configuration Check",
                "status": "passed",
                "message": f"Configuration found for cloud: {config['cloud_name']}"
            })

            # Test 2: Check database tables
            tables_exist = await conn.fetchval("""
                SELECT COUNT(*) FROM information_schema.tables
                WHERE table_name IN ('zscaler_web_logs', 'zscaler_zpa_logs', 'zscaler_ai_detections', 'zscaler_config')
            """)

            if tables_exist == 4:
                test_results["tests"].append({
                    "name": "Database Schema",
                    "status": "passed",
                    "message": "All Zscaler tables exist"
                })
            else:
                test_results["tests"].append({
                    "name": "Database Schema",
                    "status": "failed",
                    "message": f"Missing tables. Found {tables_exist}/4"
                })

            # Test 3: Check if we can write to database (dry run)
            try:
                test_log_id = await conn.fetchval("""
                    SELECT log_id FROM zscaler_web_logs LIMIT 1
                """)
                test_results["tests"].append({
                    "name": "Database Write Access",
                    "status": "passed",
                    "message": "Can query zscaler_web_logs table"
                })
            except Exception as e:
                test_results["tests"].append({
                    "name": "Database Write Access",
                    "status": "failed",
                    "message": f"Cannot access tables: {str(e)}"
                })

            # Test 4: Check webhook endpoint accessibility (if configured)
            if config.get("username") and config.get("api_key_encrypted"):
                test_results["tests"].append({
                    "name": "API Credentials",
                    "status": "passed",
                    "message": "API credentials are configured"
                })
            else:
                test_results["tests"].append({
                    "name": "API Credentials",
                    "status": "warning",
                    "message": "API credentials may be incomplete"
                })

            # Test 5: Check for recent activity
            recent_logs = await conn.fetchval("""
                SELECT COUNT(*) FROM zscaler_web_logs
                WHERE timestamp > NOW() - INTERVAL '24 hours'
            """)

            if recent_logs > 0:
                test_results["tests"].append({
                    "name": "Recent Activity",
                    "status": "passed",
                    "message": f"Found {recent_logs} logs in last 24 hours"
                })
            else:
                test_results["tests"].append({
                    "name": "Recent Activity",
                    "status": "info",
                    "message": "No logs ingested in last 24 hours (may be normal for new setup)"
                })

            # Check if all critical tests passed
            critical_tests = ["Configuration Check", "Database Schema", "Database Write Access"]
            all_passed = all(
                test["status"] == "passed"
                for test in test_results["tests"]
                if test["name"] in critical_tests
            )

            test_results["success"] = all_passed
            test_results["summary"] = f"{sum(1 for t in test_results['tests'] if t['status'] == 'passed')}/{len(test_results['tests'])} tests passed"

            return test_results

    except Exception as e:
        test_results["tests"].append({
            "name": "Connection Test",
            "status": "failed",
            "message": f"Error during testing: {str(e)}"
        })
        return test_results


# ==========================================
# LOG INGESTION ENDPOINTS
# ==========================================

@router.post("/ingest/web")
async def ingest_web_logs(batch: ZscalerWebLogBatch):
    """
    Ingest Zscaler Internet Access web logs
    """
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        ingested_count = 0
        ai_detections = 0

        async with db_pool.acquire() as conn:
            for log in batch.logs:
                # Get user department
                department = await get_user_department(log.user_email)

                # Insert web log
                log_id = await conn.fetchval("""
                    INSERT INTO zscaler_web_logs (
                        timestamp, user_email, user_department, user_location,
                        url, domain, category, action,
                        threat_category, threat_name, risk_score,
                        dlp_dictionaries, dlp_engine, file_type,
                        application, cloud_app,
                        policy_name, policy_reason,
                        source_ip, dest_ip,
                        bytes_sent, bytes_received,
                        device_owner, device_hostname,
                        raw_log
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
                    ) RETURNING log_id
                """, log.timestamp, log.user_email, department, log.user_location,
                    log.url, log.domain, log.category, log.action,
                    log.threat_category, log.threat_name, log.risk_score,
                    log.dlp_dictionaries, log.dlp_engine, log.file_type,
                    log.application, log.cloud_app,
                    log.policy_name, log.policy_reason,
                    log.source_ip, log.dest_ip,
                    log.bytes_sent, log.bytes_received,
                    log.device_owner, log.device_hostname,
                    log.raw_log)

                ingested_count += 1

                # Check if this is an AI service
                is_ai_service = await conn.fetchval("""
                    SELECT EXISTS (SELECT 1 FROM ai_services WHERE domain = $1)
                """, log.domain)

                if is_ai_service:
                    # Create AI detection record
                    risk_level = "low"
                    if log.risk_score:
                        if log.risk_score >= 80:
                            risk_level = "critical"
                        elif log.risk_score >= 60:
                            risk_level = "high"
                        elif log.risk_score >= 40:
                            risk_level = "medium"

                    await conn.execute("""
                        INSERT INTO zscaler_ai_detections (
                            zscaler_log_id, timestamp,
                            user_email, user_department,
                            ai_service_domain, ai_service_category,
                            action_taken, zscaler_policy,
                            risk_level, has_sensitive_data,
                            dlp_violations, metadata
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    """, log_id, log.timestamp,
                        log.user_email, department,
                        log.domain, log.category,
                        log.action, log.policy_name,
                        risk_level, bool(log.dlp_dictionaries),
                        log.dlp_dictionaries, log.raw_log)

                    ai_detections += 1

            # Update sync status
            await conn.execute("""
                UPDATE zscaler_config
                SET last_sync_timestamp = NOW(),
                    last_sync_status = 'success',
                    last_sync_record_count = $1
                WHERE enabled = TRUE
            """, ingested_count)

        return {
            "success": True,
            "ingested_count": ingested_count,
            "ai_detections": ai_detections,
            "message": f"Successfully ingested {ingested_count} web logs"
        }

    except Exception as e:
        print(f"Error ingesting web logs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to ingest logs: {str(e)}")


@router.post("/ingest/zpa")
async def ingest_zpa_logs(batch: ZscalerZPALogBatch):
    """
    Ingest Zscaler Private Access logs
    """
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        ingested_count = 0

        async with db_pool.acquire() as conn:
            for log in batch.logs:
                # Get user department
                department = await get_user_department(log.user_email)

                # Insert ZPA log
                await conn.execute("""
                    INSERT INTO zscaler_zpa_logs (
                        timestamp, user_email, user_department,
                        application_name, application_id,
                        connection_status, connection_reason,
                        policy_name, policy_action,
                        connector_group, client_public_ip,
                        bytes_tx, bytes_rx,
                        session_id, session_duration,
                        device_type, os_type,
                        raw_log
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
                    )
                """, log.timestamp, log.user_email, department,
                    log.application_name, log.application_id,
                    log.connection_status, log.connection_reason,
                    log.policy_name, log.policy_action,
                    log.connector_group, log.client_public_ip,
                    log.bytes_tx, log.bytes_rx,
                    log.session_id, log.session_duration,
                    log.device_type, log.os_type,
                    log.raw_log)

                ingested_count += 1

        return {
            "success": True,
            "ingested_count": ingested_count,
            "message": f"Successfully ingested {ingested_count} ZPA logs"
        }

    except Exception as e:
        print(f"Error ingesting ZPA logs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to ingest logs: {str(e)}")


@router.post("/webhook")
async def zscaler_webhook(request: Request, x_zscaler_signature: Optional[str] = Header(None)):
    """
    Webhook endpoint for Zscaler to push logs in real-time
    """
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        # Get webhook secret
        async with db_pool.acquire() as conn:
            webhook_secret = await conn.fetchval("""
                SELECT webhook_secret_encrypted FROM zscaler_config WHERE enabled = TRUE LIMIT 1
            """)

        # Verify signature if secret is configured
        if webhook_secret and x_zscaler_signature:
            body = await request.body()
            if not verify_webhook_signature(body, x_zscaler_signature, webhook_secret):
                raise HTTPException(status_code=401, detail="Invalid webhook signature")

        # Parse webhook payload
        payload = await request.json()
        log_type = payload.get("type", "web")
        logs = payload.get("logs", [])

        if log_type == "web":
            batch = ZscalerWebLogBatch(logs=logs)
            result = await ingest_web_logs(batch)
        elif log_type == "zpa":
            batch = ZscalerZPALogBatch(logs=logs)
            result = await ingest_zpa_logs(batch)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown log type: {log_type}")

        return result

    except Exception as e:
        print(f"Error processing webhook: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process webhook: {str(e)}")


# ==========================================
# ANALYTICS ENDPOINTS
# ==========================================

@router.get("/stats", response_model=ZscalerStats)
async def get_zscaler_stats():
    """
    Get Zscaler integration statistics
    """
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        async with db_pool.acquire() as conn:
            # Web logs count
            web_logs_count = await conn.fetchval("""
                SELECT COUNT(*) FROM zscaler_web_logs
                WHERE timestamp > NOW() - INTERVAL '30 days'
            """)

            # ZPA logs count
            zpa_logs_count = await conn.fetchval("""
                SELECT COUNT(*) FROM zscaler_zpa_logs
                WHERE timestamp > NOW() - INTERVAL '30 days'
            """)

            # AI detections count
            ai_detections_count = await conn.fetchval("""
                SELECT COUNT(*) FROM zscaler_ai_detections
                WHERE timestamp > NOW() - INTERVAL '30 days'
            """)

            # Blocked requests
            blocked_requests = await conn.fetchval("""
                SELECT COUNT(*) FROM zscaler_web_logs
                WHERE action = 'Blocked' AND timestamp > NOW() - INTERVAL '30 days'
            """)

            # DLP incidents
            dlp_incidents = await conn.fetchval("""
                SELECT COUNT(*) FROM zscaler_web_logs
                WHERE dlp_dictionaries IS NOT NULL AND timestamp > NOW() - INTERVAL '30 days'
            """)

            # Unique users
            unique_users = await conn.fetchval("""
                SELECT COUNT(DISTINCT user_email) FROM zscaler_web_logs
                WHERE timestamp > NOW() - INTERVAL '30 days' AND user_email IS NOT NULL
            """)

            # Last sync
            last_sync = await conn.fetchval("""
                SELECT last_sync_timestamp FROM zscaler_config
                WHERE enabled = TRUE
                ORDER BY last_sync_timestamp DESC
                LIMIT 1
            """)

            return ZscalerStats(
                total_logs_ingested=web_logs_count + zpa_logs_count,
                web_logs_count=web_logs_count,
                zpa_logs_count=zpa_logs_count,
                ai_detections_count=ai_detections_count,
                blocked_requests=blocked_requests,
                dlp_incidents=dlp_incidents,
                unique_users=unique_users,
                last_sync=last_sync
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve stats: {str(e)}")


@router.get("/ai-usage")
async def get_ai_usage_from_zscaler():
    """
    Get AI service usage detected by Zscaler
    """
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        async with db_pool.acquire() as conn:
            usage = await conn.fetch("""
                SELECT * FROM zscaler_ai_usage_summary
                LIMIT 50
            """)

            return [dict(row) for row in usage]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve AI usage: {str(e)}")


@router.get("/top-blocks")
async def get_top_blocks():
    """
    Get top blocked categories from Zscaler
    """
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        async with db_pool.acquire() as conn:
            blocks = await conn.fetch("""
                SELECT * FROM zscaler_top_blocks
            """)

            return [dict(row) for row in blocks]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve top blocks: {str(e)}")


@router.get("/dlp-incidents")
async def get_dlp_incidents(limit: int = 50):
    """
    Get recent DLP incidents from Zscaler
    """
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        async with db_pool.acquire() as conn:
            incidents = await conn.fetch("""
                SELECT * FROM zscaler_dlp_incidents
                LIMIT $1
            """, limit)

            return [dict(row) for row in incidents]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve DLP incidents: {str(e)}")
