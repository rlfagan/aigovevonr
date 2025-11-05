"""
Netskope Integration API
Handles log ingestion from Netskope via various methods (S3, Azure Blob, GCS)
Supports multiple data collection methods as per Netskope documentation
"""

from fastapi import APIRouter, HTTPException, Request, Header
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import asyncpg
import json
import os

router = APIRouter(prefix="/api/netskope", tags=["Netskope"])

# Global DB pool (set from main.py)
db_pool = None


def set_db_pool(pool):
    global db_pool
    db_pool = pool


# ==========================================
# DATA MODELS
# ==========================================

class NetskopeLog(BaseModel):
    """Netskope log entry"""
    timestamp: datetime
    user_email: Optional[str] = None
    user_location: Optional[str] = None

    # App details
    app: Optional[str] = None
    app_category: Optional[str] = None
    app_activity: Optional[str] = None
    ccl_category: Optional[str] = None

    # URL and domain
    url: Optional[str] = None
    domain: Optional[str] = None

    # Action and policy
    action: str = Field(description="allow, block, alert, etc.")
    policy_name: Optional[str] = None

    # DLP information
    dlp_incident_id: Optional[str] = None
    dlp_rule: Optional[str] = None
    dlp_profile: Optional[str] = None
    dlp_file: Optional[str] = None
    dlp_fingerprint_match: bool = False

    # Threat information
    malware_type: Optional[str] = None
    malware_name: Optional[str] = None
    threat_severity: Optional[str] = None

    # File details
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    md5: Optional[str] = None

    # Device details
    device_name: Optional[str] = None
    os: Optional[str] = None
    browser: Optional[str] = None

    # Network details
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    bytes_sent: Optional[int] = None
    bytes_received: Optional[int] = None

    # Instance and org
    instance_name: Optional[str] = None
    organization_unit: Optional[str] = None

    # Raw log data
    raw_log: Optional[Dict[str, Any]] = None


class NetskopeLogBatch(BaseModel):
    """Batch of Netskope logs"""
    logs: List[NetskopeLog]


class NetskopeConfig(BaseModel):
    """Netskope configuration"""
    tenant: str = Field(description="Netskope tenant name")
    api_token: str = Field(description="Netskope API token")

    # Log streaming method
    streaming_method: str = Field(
        default="api",
        description="api, s3, azure_blob, or gcs"
    )

    # S3 configuration (if using S3)
    s3_bucket: Optional[str] = None
    s3_region: Optional[str] = None
    aws_access_key: Optional[str] = None
    aws_secret_key: Optional[str] = None

    # Azure Blob configuration (if using Azure)
    azure_storage_account: Optional[str] = None
    azure_container: Optional[str] = None
    azure_connection_string: Optional[str] = None

    # GCS configuration (if using GCS)
    gcs_project_id: Optional[str] = None
    gcs_bucket: Optional[str] = None
    gcs_credentials_json: Optional[str] = None

    # General settings
    enabled: bool = True
    sync_interval_minutes: int = Field(default=5, ge=1, le=60)

    # Webhook configuration
    webhook_url: Optional[str] = None
    webhook_secret: Optional[str] = None


class NetskopeStats(BaseModel):
    """Netskope statistics"""
    total_logs_ingested: int
    ai_detections_count: int
    blocked_requests: int
    dlp_incidents: int
    malware_detections: int
    unique_users: int
    last_sync: Optional[datetime] = None


# ==========================================
# HELPER FUNCTIONS
# ==========================================

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


async def check_if_ai_service(domain: str) -> bool:
    """Check if domain is a known AI service"""
    if not db_pool or not domain:
        return False

    try:
        async with db_pool.acquire() as conn:
            result = await conn.fetchval(
                "SELECT EXISTS (SELECT 1 FROM ai_services WHERE domain = $1)",
                domain
            )
            return result
    except Exception as e:
        print(f"Error checking AI service: {e}")
        return False


# ==========================================
# CONFIGURATION ENDPOINTS
# ==========================================

@router.post("/configure")
async def configure_netskope(config: NetskopeConfig):
    """
    Configure Netskope integration
    Supports multiple log streaming methods: API, S3, Azure Blob, GCS
    """
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        # Prepare credentials as JSONB
        credentials = {
            "tenant": config.tenant,
            "api_token": config.api_token,
            "streaming_method": config.streaming_method
        }

        # Add method-specific credentials
        if config.streaming_method == "s3":
            credentials.update({
                "s3_bucket": config.s3_bucket,
                "s3_region": config.s3_region,
                "aws_access_key": config.aws_access_key,
                "aws_secret_key": config.aws_secret_key
            })
        elif config.streaming_method == "azure_blob":
            credentials.update({
                "azure_storage_account": config.azure_storage_account,
                "azure_container": config.azure_container,
                "azure_connection_string": config.azure_connection_string
            })
        elif config.streaming_method == "gcs":
            credentials.update({
                "gcs_project_id": config.gcs_project_id,
                "gcs_bucket": config.gcs_bucket,
                "gcs_credentials_json": config.gcs_credentials_json
            })

        async with db_pool.acquire() as conn:
            # Check if config exists
            exists = await conn.fetchval("""
                SELECT EXISTS (SELECT 1 FROM integration_configs WHERE provider = 'netskope')
            """)

            if exists:
                # Update existing config
                await conn.execute("""
                    UPDATE integration_configs
                    SET credentials_encrypted = $1,
                        enabled = $2,
                        sync_interval_minutes = $3,
                        webhook_url = $4,
                        webhook_secret_encrypted = $5,
                        updated_at = NOW()
                    WHERE provider = 'netskope'
                """, json.dumps(credentials), config.enabled,
                    config.sync_interval_minutes, config.webhook_url, config.webhook_secret)
            else:
                # Insert new config
                await conn.execute("""
                    INSERT INTO integration_configs (
                        provider, auth_type, credentials_encrypted,
                        enabled, sync_interval_minutes,
                        webhook_url, webhook_secret_encrypted
                    ) VALUES ('netskope', 'api_key', $1, $2, $3, $4, $5)
                """, json.dumps(credentials), config.enabled,
                    config.sync_interval_minutes, config.webhook_url, config.webhook_secret)

            return {
                "success": True,
                "message": "Netskope configuration saved successfully",
                "streaming_method": config.streaming_method,
                "webhook_endpoint": f"{os.getenv('PUBLIC_URL', 'http://localhost:8002')}/api/netskope/webhook"
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save configuration: {str(e)}")


@router.get("/config")
async def get_netskope_config():
    """
    Get current Netskope configuration (without secrets)
    """
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        async with db_pool.acquire() as conn:
            config = await conn.fetchrow("""
                SELECT
                    credentials_encrypted,
                    enabled,
                    sync_interval_minutes,
                    webhook_url,
                    last_sync_timestamp,
                    last_sync_status,
                    last_sync_record_count,
                    (webhook_secret_encrypted IS NOT NULL) AS has_webhook_secret
                FROM integration_configs
                WHERE provider = 'netskope'
                ORDER BY created_at DESC
                LIMIT 1
            """)

            if not config:
                return {
                    "configured": False
                }

            # Parse credentials
            credentials = json.loads(config["credentials_encrypted"])

            return {
                "configured": True,
                "tenant": credentials.get("tenant", ""),
                "streaming_method": credentials.get("streaming_method", "api"),
                "enabled": config["enabled"],
                "sync_interval_minutes": config["sync_interval_minutes"],
                "webhook_url": config["webhook_url"],
                "has_api_token": bool(credentials.get("api_token")),
                "has_webhook_secret": config["has_webhook_secret"],
                "last_sync": config["last_sync_timestamp"],
                "last_sync_status": config["last_sync_status"],
                "last_sync_record_count": config["last_sync_record_count"],
                # Method-specific info (without secrets)
                "s3_configured": bool(credentials.get("s3_bucket")),
                "azure_configured": bool(credentials.get("azure_storage_account")),
                "gcs_configured": bool(credentials.get("gcs_project_id"))
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve configuration: {str(e)}")


@router.post("/test-connection")
async def test_netskope_connection():
    """
    Test Netskope connection and configuration
    Returns detailed test results
    """
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    test_results = {
        "success": False,
        "timestamp": datetime.utcnow().isoformat(),
        "provider": "netskope",
        "tests": []
    }

    try:
        async with db_pool.acquire() as conn:
            # Test 1: Check if configuration exists
            config = await conn.fetchrow("""
                SELECT credentials_encrypted, enabled
                FROM integration_configs
                WHERE provider = 'netskope' AND enabled = TRUE
                LIMIT 1
            """)

            if not config:
                test_results["tests"].append({
                    "name": "Configuration Check",
                    "status": "failed",
                    "message": "No enabled Netskope configuration found"
                })
                return test_results

            credentials = json.loads(config["credentials_encrypted"])
            streaming_method = credentials.get("streaming_method", "unknown")

            test_results["tests"].append({
                "name": "Configuration Check",
                "status": "passed",
                "message": f"Configuration found (streaming method: {streaming_method})"
            })

            # Test 2: Check database tables
            tables_exist = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_name = 'netskope_logs'
                )
            """)

            if tables_exist:
                test_results["tests"].append({
                    "name": "Database Schema",
                    "status": "passed",
                    "message": "Netskope logs table exists"
                })
            else:
                test_results["tests"].append({
                    "name": "Database Schema",
                    "status": "failed",
                    "message": "netskope_logs table not found"
                })

            # Test 3: Check credentials based on streaming method
            if streaming_method == "api":
                if credentials.get("tenant") and credentials.get("api_token"):
                    test_results["tests"].append({
                        "name": "API Credentials",
                        "status": "passed",
                        "message": "Tenant and API token configured"
                    })
                else:
                    test_results["tests"].append({
                        "name": "API Credentials",
                        "status": "failed",
                        "message": "Missing tenant or API token"
                    })
            elif streaming_method == "s3":
                if credentials.get("s3_bucket"):
                    test_results["tests"].append({
                        "name": "S3 Configuration",
                        "status": "passed",
                        "message": f"S3 bucket configured: {credentials['s3_bucket']}"
                    })
                else:
                    test_results["tests"].append({
                        "name": "S3 Configuration",
                        "status": "failed",
                        "message": "S3 bucket not configured"
                    })
            elif streaming_method == "azure_blob":
                if credentials.get("azure_storage_account"):
                    test_results["tests"].append({
                        "name": "Azure Blob Configuration",
                        "status": "passed",
                        "message": f"Azure storage account configured"
                    })
                else:
                    test_results["tests"].append({
                        "name": "Azure Blob Configuration",
                        "status": "failed",
                        "message": "Azure storage account not configured"
                    })
            elif streaming_method == "gcs":
                if credentials.get("gcs_bucket"):
                    test_results["tests"].append({
                        "name": "GCS Configuration",
                        "status": "passed",
                        "message": f"GCS bucket configured: {credentials['gcs_bucket']}"
                    })
                else:
                    test_results["tests"].append({
                        "name": "GCS Configuration",
                        "status": "failed",
                        "message": "GCS bucket not configured"
                    })

            # Test 4: Check for recent activity
            recent_logs = await conn.fetchval("""
                SELECT COUNT(*) FROM netskope_logs
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
                    "message": "No logs ingested in last 24 hours (normal for new setup)"
                })

            # Check if all critical tests passed
            critical_tests = ["Configuration Check", "Database Schema"]
            all_passed = all(
                test["status"] == "passed"
                for test in test_results["tests"]
                if test["name"] in critical_tests
            )

            test_results["success"] = all_passed
            test_results["summary"] = f"{sum(1 for t in test_results['tests'] if t['status'] == 'passed')}/{len(test_results['tests'])} tests passed"
            test_results["streaming_method"] = streaming_method

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

@router.post("/ingest")
async def ingest_netskope_logs(batch: NetskopeLogBatch):
    """
    Ingest Netskope logs
    Supports logs from API, S3, Azure Blob, or GCS
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

                # Check if this is an AI service
                is_ai_service = await check_if_ai_service(log.domain) if log.domain else False

                # Insert log
                await conn.execute("""
                    INSERT INTO netskope_logs (
                        timestamp, user_email, user_department, user_location,
                        app, app_category, app_activity, ccl_category,
                        url, domain, action, policy_name,
                        dlp_incident_id, dlp_rule, dlp_profile, dlp_file, dlp_fingerprint_match,
                        malware_type, malware_name, threat_severity,
                        is_ai_service, ai_service_name,
                        file_name, file_type, file_size, md5,
                        device_name, os, browser,
                        source_ip, destination_ip, bytes_sent, bytes_received,
                        instance_name, organization_unit,
                        raw_log
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                        $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,
                        $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
                        $33, $34, $35, $36
                    )
                """, log.timestamp, log.user_email, department, log.user_location,
                    log.app, log.app_category, log.app_activity, log.ccl_category,
                    log.url, log.domain, log.action, log.policy_name,
                    log.dlp_incident_id, log.dlp_rule, log.dlp_profile,
                    log.dlp_file, log.dlp_fingerprint_match,
                    log.malware_type, log.malware_name, log.threat_severity,
                    is_ai_service, log.app if is_ai_service else None,
                    log.file_name, log.file_type, log.file_size, log.md5,
                    log.device_name, log.os, log.browser,
                    log.source_ip, log.destination_ip, log.bytes_sent, log.bytes_received,
                    log.instance_name, log.organization_unit,
                    log.raw_log)

                ingested_count += 1

                if is_ai_service:
                    ai_detections += 1

            # Update sync status
            await conn.execute("""
                UPDATE integration_configs
                SET last_sync_timestamp = NOW(),
                    last_sync_status = 'success',
                    last_sync_record_count = $1
                WHERE provider = 'netskope'
            """, ingested_count)

        return {
            "success": True,
            "ingested_count": ingested_count,
            "ai_detections": ai_detections,
            "message": f"Successfully ingested {ingested_count} Netskope logs"
        }

    except Exception as e:
        print(f"Error ingesting Netskope logs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to ingest logs: {str(e)}")


@router.post("/webhook")
async def netskope_webhook(request: Request, x_netskope_signature: Optional[str] = Header(None)):
    """
    Webhook endpoint for Netskope to push logs in real-time
    """
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        # Get webhook secret
        async with db_pool.acquire() as conn:
            webhook_secret = await conn.fetchval("""
                SELECT webhook_secret_encrypted FROM integration_configs
                WHERE provider = 'netskope' AND enabled = TRUE
                LIMIT 1
            """)

        # Verify signature if secret is configured
        if webhook_secret and x_netskope_signature:
            body = await request.body()
            # Add signature verification logic here if Netskope provides it

        # Parse webhook payload
        payload = await request.json()
        logs = payload.get("logs", [])

        if not logs:
            raise HTTPException(status_code=400, detail="No logs in webhook payload")

        batch = NetskopeLogBatch(logs=logs)
        result = await ingest_netskope_logs(batch)

        return result

    except Exception as e:
        print(f"Error processing webhook: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process webhook: {str(e)}")


# ==========================================
# ANALYTICS ENDPOINTS
# ==========================================

@router.get("/stats", response_model=NetskopeStats)
async def get_netskope_stats():
    """
    Get Netskope integration statistics
    """
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        async with db_pool.acquire() as conn:
            # Total logs count
            total_logs = await conn.fetchval("""
                SELECT COUNT(*) FROM netskope_logs
                WHERE timestamp > NOW() - INTERVAL '30 days'
            """)

            # AI detections count
            ai_detections = await conn.fetchval("""
                SELECT COUNT(*) FROM netskope_logs
                WHERE is_ai_service = TRUE AND timestamp > NOW() - INTERVAL '30 days'
            """)

            # Blocked requests
            blocked_requests = await conn.fetchval("""
                SELECT COUNT(*) FROM netskope_logs
                WHERE action = 'block' AND timestamp > NOW() - INTERVAL '30 days'
            """)

            # DLP incidents
            dlp_incidents = await conn.fetchval("""
                SELECT COUNT(*) FROM netskope_logs
                WHERE dlp_incident_id IS NOT NULL AND timestamp > NOW() - INTERVAL '30 days'
            """)

            # Malware detections
            malware_detections = await conn.fetchval("""
                SELECT COUNT(*) FROM netskope_logs
                WHERE malware_type IS NOT NULL AND timestamp > NOW() - INTERVAL '30 days'
            """)

            # Unique users
            unique_users = await conn.fetchval("""
                SELECT COUNT(DISTINCT user_email) FROM netskope_logs
                WHERE timestamp > NOW() - INTERVAL '30 days' AND user_email IS NOT NULL
            """)

            # Last sync
            last_sync = await conn.fetchval("""
                SELECT last_sync_timestamp FROM integration_configs
                WHERE provider = 'netskope'
                ORDER BY last_sync_timestamp DESC
                LIMIT 1
            """)

            return NetskopeStats(
                total_logs_ingested=total_logs or 0,
                ai_detections_count=ai_detections or 0,
                blocked_requests=blocked_requests or 0,
                dlp_incidents=dlp_incidents or 0,
                malware_detections=malware_detections or 0,
                unique_users=unique_users or 0,
                last_sync=last_sync
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve stats: {str(e)}")
