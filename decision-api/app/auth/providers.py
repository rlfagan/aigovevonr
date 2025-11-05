"""
IAM Provider Integrations
Supports Okta and Microsoft Entra ID (Azure AD)
"""

from typing import Dict, Optional, List
from datetime import datetime, timedelta
import httpx
import jwt
from jwt import PyJWKClient
import os
from fastapi import HTTPException, Header
from functools import wraps
import asyncio


class OktaProvider:
    """Okta SAML/OAuth Integration"""

    def __init__(self):
        self.domain = os.getenv("OKTA_DOMAIN")  # e.g., "dev-12345.okta.com"
        self.client_id = os.getenv("OKTA_CLIENT_ID")
        self.client_secret = os.getenv("OKTA_CLIENT_SECRET")
        self.api_token = os.getenv("OKTA_API_TOKEN")  # For user/group sync
        self.issuer = f"https://{self.domain}/oauth2/default"
        self.jwks_uri = f"{self.issuer}/v1/keys"
        self.jwks_client = PyJWKClient(self.jwks_uri) if self.domain else None

    async def verify_token(self, token: str) -> Dict:
        """Verify Okta JWT token"""
        if not self.jwks_client:
            raise HTTPException(status_code=500, detail="Okta not configured")

        try:
            signing_key = self.jwks_client.get_signing_key_from_jwt(token)

            data = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience="api://default",
                issuer=self.issuer
            )

            return {
                "user_id": data.get("uid"),
                "email": data.get("sub"),
                "name": data.get("name"),
                "groups": data.get("groups", []),
                "provider": "okta"
            }
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError as e:
            raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

    async def get_user_info(self, user_id: str) -> Dict:
        """Fetch user details from Okta API"""
        if not self.api_token:
            raise HTTPException(status_code=500, detail="Okta API token not configured")

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://{self.domain}/api/v1/users/{user_id}",
                headers={"Authorization": f"SSWS {self.api_token}"}
            )
            response.raise_for_status()
            user_data = response.json()

            return {
                "user_id": user_data["id"],
                "email": user_data["profile"]["email"],
                "first_name": user_data["profile"]["firstName"],
                "last_name": user_data["profile"]["lastName"],
                "department": user_data["profile"].get("department"),
                "status": user_data["status"],
                "created": user_data["created"],
                "last_login": user_data.get("lastLogin")
            }

    async def get_user_groups(self, user_id: str) -> List[str]:
        """Fetch user's group memberships from Okta"""
        if not self.api_token:
            return []

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://{self.domain}/api/v1/users/{user_id}/groups",
                headers={"Authorization": f"SSWS {self.api_token}"}
            )
            response.raise_for_status()
            groups = response.json()

            return [group["profile"]["name"] for group in groups]

    async def sync_user(self, user_id: str, db_pool) -> Dict:
        """Sync user from Okta to local database"""
        user_info = await self.get_user_info(user_id)
        groups = await self.get_user_groups(user_id)

        # Store in database
        async with db_pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO users (
                    user_id, email, first_name, last_name,
                    department, groups, iam_provider, iam_synced_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (email)
                DO UPDATE SET
                    first_name = EXCLUDED.first_name,
                    last_name = EXCLUDED.last_name,
                    department = EXCLUDED.department,
                    groups = EXCLUDED.groups,
                    iam_synced_at = EXCLUDED.iam_synced_at
            """,
                user_id,
                user_info["email"],
                user_info["first_name"],
                user_info["last_name"],
                user_info["department"],
                groups,
                "okta",
                datetime.utcnow()
            )

        return {**user_info, "groups": groups}


class EntraIDProvider:
    """Microsoft Entra ID (Azure AD) Integration"""

    def __init__(self):
        self.tenant_id = os.getenv("ENTRA_TENANT_ID")
        self.client_id = os.getenv("ENTRA_CLIENT_ID")
        self.client_secret = os.getenv("ENTRA_CLIENT_SECRET")
        self.authority = f"https://login.microsoftonline.com/{self.tenant_id}"
        self.graph_endpoint = "https://graph.microsoft.com/v1.0"
        self.jwks_uri = f"{self.authority}/discovery/v2.0/keys"
        self.jwks_client = PyJWKClient(self.jwks_uri) if self.tenant_id else None
        self._access_token = None
        self._token_expires = None

    async def verify_token(self, token: str) -> Dict:
        """Verify Entra ID JWT token"""
        if not self.jwks_client:
            raise HTTPException(status_code=500, detail="Entra ID not configured")

        try:
            signing_key = self.jwks_client.get_signing_key_from_jwt(token)

            data = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=self.client_id,
                issuer=f"{self.authority}/v2.0"
            )

            return {
                "user_id": data.get("oid"),  # Object ID
                "email": data.get("preferred_username") or data.get("upn"),
                "name": data.get("name"),
                "groups": data.get("groups", []),
                "provider": "entra_id"
            }
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError as e:
            raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

    async def _get_access_token(self) -> str:
        """Get Microsoft Graph API access token"""
        if self._access_token and self._token_expires and datetime.utcnow() < self._token_expires:
            return self._access_token

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.authority}/oauth2/v2.0/token",
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "scope": "https://graph.microsoft.com/.default",
                    "grant_type": "client_credentials"
                }
            )
            response.raise_for_status()
            token_data = response.json()

            self._access_token = token_data["access_token"]
            self._token_expires = datetime.utcnow() + timedelta(seconds=token_data["expires_in"] - 60)

            return self._access_token

    async def get_user_info(self, user_id: str) -> Dict:
        """Fetch user details from Microsoft Graph API"""
        token = await self._get_access_token()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.graph_endpoint}/users/{user_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            response.raise_for_status()
            user_data = response.json()

            return {
                "user_id": user_data["id"],
                "email": user_data["mail"] or user_data["userPrincipalName"],
                "first_name": user_data.get("givenName"),
                "last_name": user_data.get("surname"),
                "department": user_data.get("department"),
                "job_title": user_data.get("jobTitle"),
                "office_location": user_data.get("officeLocation"),
                "created": user_data.get("createdDateTime")
            }

    async def get_user_groups(self, user_id: str) -> List[str]:
        """Fetch user's group memberships from Entra ID"""
        token = await self._get_access_token()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.graph_endpoint}/users/{user_id}/memberOf",
                headers={"Authorization": f"Bearer {token}"}
            )
            response.raise_for_status()
            groups_data = response.json()

            return [
                group["displayName"]
                for group in groups_data.get("value", [])
                if group.get("@odata.type") == "#microsoft.graph.group"
            ]

    async def sync_user(self, user_id: str, db_pool) -> Dict:
        """Sync user from Entra ID to local database"""
        user_info = await self.get_user_info(user_id)
        groups = await self.get_user_groups(user_id)

        # Store in database
        async with db_pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO users (
                    user_id, email, first_name, last_name,
                    department, groups, iam_provider, iam_synced_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (email)
                DO UPDATE SET
                    first_name = EXCLUDED.first_name,
                    last_name = EXCLUDED.last_name,
                    department = EXCLUDED.department,
                    groups = EXCLUDED.groups,
                    iam_synced_at = EXCLUDED.iam_synced_at
            """,
                user_id,
                user_info["email"],
                user_info["first_name"],
                user_info["last_name"],
                user_info["department"],
                groups,
                "entra_id",
                datetime.utcnow()
            )

        return {**user_info, "groups": groups}


class IAMManager:
    """Unified IAM Manager supporting multiple providers"""

    def __init__(self):
        self.okta = OktaProvider()
        self.entra_id = EntraIDProvider()
        self.enabled_providers = self._get_enabled_providers()

    def _get_enabled_providers(self) -> List[str]:
        """Determine which IAM providers are configured"""
        providers = []
        if os.getenv("OKTA_DOMAIN"):
            providers.append("okta")
        if os.getenv("ENTRA_TENANT_ID"):
            providers.append("entra_id")
        return providers

    async def verify_token(self, token: str, provider: Optional[str] = None) -> Dict:
        """Verify token from any configured provider"""
        if provider == "okta" and "okta" in self.enabled_providers:
            return await self.okta.verify_token(token)
        elif provider == "entra_id" and "entra_id" in self.enabled_providers:
            return await self.entra_id.verify_token(token)

        # Try all providers if not specified
        errors = []
        for prov in self.enabled_providers:
            try:
                if prov == "okta":
                    return await self.okta.verify_token(token)
                elif prov == "entra_id":
                    return await self.entra_id.verify_token(token)
            except Exception as e:
                errors.append(f"{prov}: {str(e)}")

        raise HTTPException(
            status_code=401,
            detail=f"Token verification failed for all providers: {'; '.join(errors)}"
        )

    async def sync_user(self, user_id: str, provider: str, db_pool) -> Dict:
        """Sync user from IAM provider to local database"""
        if provider == "okta":
            return await self.okta.sync_user(user_id, db_pool)
        elif provider == "entra_id":
            return await self.entra_id.sync_user(user_id, db_pool)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")

    def get_enabled_providers(self) -> List[str]:
        """Return list of enabled IAM providers"""
        return self.enabled_providers


# Global IAM manager instance
iam_manager = IAMManager()


# Dependency for FastAPI routes
async def get_current_user(
    authorization: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None)
) -> Dict:
    """
    FastAPI dependency to verify user authentication
    Supports both Bearer tokens (IAM) and API keys (plugins)
    """
    # Check for API key (for browser/IDE plugins)
    if x_api_key:
        expected_key = os.getenv("API_KEY")
        if expected_key and x_api_key == expected_key:
            return {
                "email": "api_user@system",
                "auth_method": "api_key",
                "provider": "system"
            }
        raise HTTPException(status_code=401, detail="Invalid API key")

    # Check for Bearer token (IAM authentication)
    if not authorization:
        raise HTTPException(status_code=401, detail="No authentication provided")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authentication format")

    token = authorization.replace("Bearer ", "")

    try:
        user_data = await iam_manager.verify_token(token)
        return user_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
