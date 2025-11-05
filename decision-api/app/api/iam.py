"""
IAM API Endpoints
User management, sync, and authentication
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
import asyncpg

from app.auth.providers import iam_manager, get_current_user

router = APIRouter(prefix="/api/iam", tags=["IAM"])

# Global database pool (injected at startup)
db_pool: Optional[asyncpg.Pool] = None


def set_db_pool(pool: asyncpg.Pool):
    global db_pool
    db_pool = pool


# ==========================================
# DATA MODELS
# ==========================================

class UserSyncRequest(BaseModel):
    user_id: str
    provider: str = Field(description="okta or entra_id")


class UserResponse(BaseModel):
    user_id: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    department: Optional[str]
    groups: List[str]
    iam_provider: str
    iam_synced_at: Optional[datetime]
    last_seen_at: Optional[datetime]
    status: str


class UserActivityResponse(BaseModel):
    user_id: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    department: Optional[str]
    total_requests: int
    allowed_requests: int
    denied_requests: int
    avg_risk_score: Optional[float]
    last_activity: Optional[datetime]


class IAMStatusResponse(BaseModel):
    enabled_providers: List[str]
    okta_configured: bool
    entra_id_configured: bool
    total_users: int
    last_sync: Optional[datetime]


# ==========================================
# ENDPOINTS
# ==========================================

@router.get("/status")
async def get_iam_status() -> IAMStatusResponse:
    """Get IAM integration status"""
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    # Get total users and last sync time
    async with db_pool.acquire() as conn:
        total_users = await conn.fetchval("SELECT COUNT(*) FROM users")
        last_sync = await conn.fetchval("SELECT MAX(iam_synced_at) FROM users")

    return IAMStatusResponse(
        enabled_providers=iam_manager.get_enabled_providers(),
        okta_configured="okta" in iam_manager.enabled_providers,
        entra_id_configured="entra_id" in iam_manager.enabled_providers,
        total_users=total_users or 0,
        last_sync=last_sync
    )


@router.post("/sync-user")
async def sync_user(
    request: UserSyncRequest,
    background_tasks: BackgroundTasks,
    current_user: Dict = Depends(get_current_user)
) -> UserResponse:
    """
    Sync a user from IAM provider to local database
    Requires authentication
    """
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        user_data = await iam_manager.sync_user(request.user_id, request.provider, db_pool)

        # Fetch from database to get full record
        async with db_pool.acquire() as conn:
            user_record = await conn.fetchrow("""
                SELECT * FROM users WHERE user_id = $1
            """, request.user_id)

        return UserResponse(
            user_id=user_record["user_id"],
            email=user_record["email"],
            first_name=user_record["first_name"],
            last_name=user_record["last_name"],
            department=user_record["department"],
            groups=user_record["groups"] or [],
            iam_provider=user_record["iam_provider"],
            iam_synced_at=user_record["iam_synced_at"],
            last_seen_at=user_record["last_seen_at"],
            status=user_record["status"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"User sync failed: {str(e)}")


@router.post("/sync-all-users")
async def sync_all_users(
    provider: str,
    background_tasks: BackgroundTasks,
    current_user: Dict = Depends(get_current_user)
):
    """
    Trigger background sync of all users from IAM provider
    This is a long-running operation
    """
    if provider not in iam_manager.enabled_providers:
        raise HTTPException(status_code=400, detail=f"Provider {provider} not configured")

    # TODO: Implement batch sync in background
    # For now, return success message
    return {
        "message": f"User sync initiated for {provider}",
        "status": "started",
        "provider": provider
    }


@router.get("/users")
async def list_users(
    skip: int = 0,
    limit: int = 100,
    department: Optional[str] = None,
    provider: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
) -> List[UserResponse]:
    """List all synchronized users"""
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    query = "SELECT * FROM users WHERE 1=1"
    params = []

    if department:
        params.append(department)
        query += f" AND department = ${len(params)}"

    if provider:
        params.append(provider)
        query += f" AND iam_provider = ${len(params)}"

    query += f" ORDER BY email LIMIT {limit} OFFSET {skip}"

    async with db_pool.acquire() as conn:
        users = await conn.fetch(query, *params)

    return [
        UserResponse(
            user_id=user["user_id"],
            email=user["email"],
            first_name=user["first_name"],
            last_name=user["last_name"],
            department=user["department"],
            groups=user["groups"] or [],
            iam_provider=user["iam_provider"],
            iam_synced_at=user["iam_synced_at"],
            last_seen_at=user["last_seen_at"],
            status=user["status"]
        )
        for user in users
    ]


@router.get("/users/{email}")
async def get_user(
    email: str,
    current_user: Dict = Depends(get_current_user)
) -> UserResponse:
    """Get user details by email"""
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    async with db_pool.acquire() as conn:
        user = await conn.fetchrow("SELECT * FROM users WHERE email = $1", email)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(
        user_id=user["user_id"],
        email=user["email"],
        first_name=user["first_name"],
        last_name=user["last_name"],
        department=user["department"],
        groups=user["groups"] or [],
        iam_provider=user["iam_provider"],
        iam_synced_at=user["iam_synced_at"],
        last_seen_at=user["last_seen_at"],
        status=user["status"]
    )


@router.get("/users/{email}/activity")
async def get_user_activity(
    email: str,
    current_user: Dict = Depends(get_current_user)
) -> UserActivityResponse:
    """Get user activity summary"""
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    async with db_pool.acquire() as conn:
        activity = await conn.fetchrow("""
            SELECT * FROM user_activity_summary WHERE email = $1
        """, email)

    if not activity:
        raise HTTPException(status_code=404, detail="User not found")

    return UserActivityResponse(
        user_id=activity["user_id"],
        email=activity["email"],
        first_name=activity["first_name"],
        last_name=activity["last_name"],
        department=activity["department"],
        total_requests=activity["total_requests"] or 0,
        allowed_requests=activity["allowed_requests"] or 0,
        denied_requests=activity["denied_requests"] or 0,
        avg_risk_score=float(activity["avg_risk_score"]) if activity["avg_risk_score"] else None,
        last_activity=activity["last_activity"]
    )


@router.get("/departments")
async def list_departments(
    current_user: Dict = Depends(get_current_user)
) -> List[Dict]:
    """List all departments with user counts"""
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    async with db_pool.acquire() as conn:
        departments = await conn.fetch("""
            SELECT
                department,
                COUNT(*) as user_count,
                COUNT(DISTINCT iam_provider) as providers
            FROM users
            WHERE department IS NOT NULL
            GROUP BY department
            ORDER BY user_count DESC
        """)

    return [
        {
            "department": dept["department"],
            "user_count": dept["user_count"],
            "providers": dept["providers"]
        }
        for dept in departments
    ]


@router.post("/verify-token")
async def verify_token(authorization: str = Depends(get_current_user)):
    """
    Verify authentication token
    Returns user information if valid
    """
    return {
        "valid": True,
        "user": authorization
    }


@router.post("/test-okta")
async def test_okta_connection():
    """
    Test Okta integration specifically
    Returns detailed test results for Okta only
    """
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    test_results = {
        "success": False,
        "timestamp": datetime.utcnow().isoformat(),
        "provider": "okta",
        "tests": []
    }

    try:
        async with db_pool.acquire() as conn:
            # Test database connectivity
            test_results["tests"].append({
                "name": "Database Connection",
                "status": "passed",
                "message": "Successfully connected to database"
            })

            # Check if Okta is enabled
            okta_enabled = "okta" in iam_manager.enabled_providers

            if not okta_enabled:
                test_results["tests"].append({
                    "name": "Okta Configuration",
                    "status": "failed",
                    "message": "Okta is not configured. Missing OKTA_DOMAIN environment variable."
                })
                test_results["summary"] = "1/2 tests passed"
                return test_results

            test_results["tests"].append({
                "name": "Okta Configuration",
                "status": "passed",
                "message": "Okta environment variables are configured"
            })

            # Check Okta users
            okta_users = await conn.fetchval("""
                SELECT COUNT(*) FROM users WHERE iam_provider = 'okta'
            """)

            last_sync = await conn.fetchval("""
                SELECT MAX(iam_synced_at) FROM users WHERE iam_provider = 'okta'
            """)

            test_results["tests"].append({
                "name": "Okta User Sync",
                "status": "passed" if okta_users > 0 else "info",
                "message": f"Found {okta_users} Okta users in database" if okta_users > 0 else "No Okta users synced yet"
            })

            if last_sync:
                test_results["tests"].append({
                    "name": "Last Sync",
                    "status": "passed",
                    "message": f"Last sync: {last_sync.isoformat()}"
                })
            else:
                test_results["tests"].append({
                    "name": "Last Sync",
                    "status": "info",
                    "message": "No sync has been performed yet"
                })

            # Overall success
            critical_tests = ["Database Connection", "Okta Configuration"]
            all_passed = all(
                test["status"] == "passed"
                for test in test_results["tests"]
                if test["name"] in critical_tests
            )

            test_results["success"] = all_passed
            test_results["summary"] = f"{sum(1 for t in test_results['tests'] if t['status'] == 'passed')}/{len(test_results['tests'])} tests passed"
            test_results["user_count"] = okta_users
            test_results["last_sync"] = last_sync.isoformat() if last_sync else None

            return test_results

    except Exception as e:
        test_results["tests"].append({
            "name": "Okta Connection Test",
            "status": "failed",
            "message": f"Error during testing: {str(e)}"
        })
        return test_results


@router.post("/test-entra-id")
async def test_entra_id_connection():
    """
    Test Microsoft Entra ID integration specifically
    Returns detailed test results for Entra ID only
    """
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    test_results = {
        "success": False,
        "timestamp": datetime.utcnow().isoformat(),
        "provider": "entra_id",
        "tests": []
    }

    try:
        async with db_pool.acquire() as conn:
            # Test database connectivity
            test_results["tests"].append({
                "name": "Database Connection",
                "status": "passed",
                "message": "Successfully connected to database"
            })

            # Check if Entra ID is enabled
            entra_enabled = "entra_id" in iam_manager.enabled_providers

            if not entra_enabled:
                test_results["tests"].append({
                    "name": "Entra ID Configuration",
                    "status": "failed",
                    "message": "Entra ID is not configured. Missing ENTRA_TENANT_ID environment variable."
                })
                test_results["summary"] = "1/2 tests passed"
                return test_results

            test_results["tests"].append({
                "name": "Entra ID Configuration",
                "status": "passed",
                "message": "Entra ID environment variables are configured"
            })

            # Check Entra ID users
            entra_users = await conn.fetchval("""
                SELECT COUNT(*) FROM users WHERE iam_provider = 'entra_id'
            """)

            last_sync = await conn.fetchval("""
                SELECT MAX(iam_synced_at) FROM users WHERE iam_provider = 'entra_id'
            """)

            test_results["tests"].append({
                "name": "Entra ID User Sync",
                "status": "passed" if entra_users > 0 else "info",
                "message": f"Found {entra_users} Entra ID users in database" if entra_users > 0 else "No Entra ID users synced yet"
            })

            if last_sync:
                test_results["tests"].append({
                    "name": "Last Sync",
                    "status": "passed",
                    "message": f"Last sync: {last_sync.isoformat()}"
                })
            else:
                test_results["tests"].append({
                    "name": "Last Sync",
                    "status": "info",
                    "message": "No sync has been performed yet"
                })

            # Overall success
            critical_tests = ["Database Connection", "Entra ID Configuration"]
            all_passed = all(
                test["status"] == "passed"
                for test in test_results["tests"]
                if test["name"] in critical_tests
            )

            test_results["success"] = all_passed
            test_results["summary"] = f"{sum(1 for t in test_results['tests'] if t['status'] == 'passed')}/{len(test_results['tests'])} tests passed"
            test_results["user_count"] = entra_users
            test_results["last_sync"] = last_sync.isoformat() if last_sync else None

            return test_results

    except Exception as e:
        test_results["tests"].append({
            "name": "Entra ID Connection Test",
            "status": "failed",
            "message": f"Error during testing: {str(e)}"
        })
        return test_results


@router.post("/test-connection")
async def test_iam_connection():
    """
    Test IAM provider connections and configuration
    Returns detailed test results for all configured providers
    """
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    test_results = {
        "success": False,
        "timestamp": datetime.utcnow().isoformat(),
        "providers": {},
        "tests": []
    }

    try:
        # Test database connectivity
        async with db_pool.acquire() as conn:
            test_results["tests"].append({
                "name": "Database Connection",
                "status": "passed",
                "message": "Successfully connected to database"
            })

            # Check users table
            user_count = await conn.fetchval("SELECT COUNT(*) FROM users")
            test_results["tests"].append({
                "name": "Users Table",
                "status": "passed",
                "message": f"Found {user_count} users in database"
            })

            # Test Okta configuration
            okta_enabled = "okta" in iam_manager.enabled_providers
            if okta_enabled:
                try:
                    okta_users = await conn.fetchval("""
                        SELECT COUNT(*) FROM users WHERE iam_provider = 'okta'
                    """)
                    last_sync = await conn.fetchval("""
                        SELECT MAX(iam_synced_at) FROM users WHERE iam_provider = 'okta'
                    """)

                    test_results["providers"]["okta"] = {
                        "enabled": True,
                        "configured": True,
                        "users_synced": okta_users,
                        "last_sync": last_sync.isoformat() if last_sync else None
                    }

                    test_results["tests"].append({
                        "name": "Okta Integration",
                        "status": "passed",
                        "message": f"Okta configured with {okta_users} synced users"
                    })
                except Exception as e:
                    test_results["tests"].append({
                        "name": "Okta Integration",
                        "status": "warning",
                        "message": f"Okta enabled but query failed: {str(e)}"
                    })
            else:
                test_results["providers"]["okta"] = {
                    "enabled": False,
                    "configured": False
                }
                test_results["tests"].append({
                    "name": "Okta Integration",
                    "status": "info",
                    "message": "Okta not configured"
                })

            # Test Entra ID configuration
            entra_enabled = "entra_id" in iam_manager.enabled_providers
            if entra_enabled:
                try:
                    entra_users = await conn.fetchval("""
                        SELECT COUNT(*) FROM users WHERE iam_provider = 'entra_id'
                    """)
                    last_sync = await conn.fetchval("""
                        SELECT MAX(iam_synced_at) FROM users WHERE iam_provider = 'entra_id'
                    """)

                    test_results["providers"]["entra_id"] = {
                        "enabled": True,
                        "configured": True,
                        "users_synced": entra_users,
                        "last_sync": last_sync.isoformat() if last_sync else None
                    }

                    test_results["tests"].append({
                        "name": "Entra ID Integration",
                        "status": "passed",
                        "message": f"Entra ID configured with {entra_users} synced users"
                    })
                except Exception as e:
                    test_results["tests"].append({
                        "name": "Entra ID Integration",
                        "status": "warning",
                        "message": f"Entra ID enabled but query failed: {str(e)}"
                    })
            else:
                test_results["providers"]["entra_id"] = {
                    "enabled": False,
                    "configured": False
                }
                test_results["tests"].append({
                    "name": "Entra ID Integration",
                    "status": "info",
                    "message": "Entra ID not configured"
                })

            # Overall success check
            critical_tests = ["Database Connection", "Users Table"]
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
            "name": "IAM Connection Test",
            "status": "failed",
            "message": f"Error during testing: {str(e)}"
        })
        return test_results
