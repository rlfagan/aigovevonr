# Integration Patterns
## Enterprise AI Policy Management and Enforcement Platform

---

## Overview

This document describes integration patterns for connecting the AI Policy Platform with third-party systems to enrich context, enforce policies, and maintain compliance.

**Integration Categories**:
1. **Identity & Access Management** (Okta, Azure AD, Google Workspace)
2. **Asset Discovery & Endpoint Protection** (CrowdStrike, SentinelOne, Wiz)
3. **Configuration Management Database** (ServiceNow, Jira Service Management)
4. **Data Loss Prevention** (Symantec DLP, Microsoft Purview, Google DLP)
5. **Cloud Access Security Broker** (Netskope, Microsoft Defender for Cloud Apps)
6. **Security Information & Event Management** (Splunk, Microsoft Sentinel)
7. **GRC & Compliance** (OneTrust, ServiceNow GRC)
8. **Communication** (Slack, Microsoft Teams, PagerDuty)

---

## 1. Identity & Access Management (IAM)

### 1.1 Okta Integration

**Purpose**: Sync users, groups, roles; provide SSO for Admin UI

**API**: Okta REST API

**Authentication**: API Token

**Integration Architecture**:

```
┌─────────────────┐         ┌──────────────────┐         ┌────────────────┐
│  Okta           │◄───────►│  Data Context    │◄───────►│  PostgreSQL    │
│  (Identity      │  Sync   │  Service         │  Store  │  (users table) │
│   Provider)     │         │                  │         │                │
└─────────────────┘         └──────────────────┘         └────────────────┘
        │                            │
        │ Webhook (user updates)     │
        └────────────────────────────┘
```

**Sync Operations**:

```python
# okta_adapter.py
from okta.client import Client as OktaClient
from datetime import datetime, timedelta

class OktaAdapter:
    def __init__(self, domain, api_token):
        self.client = OktaClient({'orgUrl': f'https://{domain}', 'token': api_token})

    async def sync_users(self):
        """Sync all users from Okta"""
        users, resp, err = await self.client.list_users()
        synced_count = 0

        for okta_user in users:
            user_context = self.map_user(okta_user)
            await db.upsert_user(user_context)
            synced_count += 1

        return {'synced': synced_count}

    def map_user(self, okta_user):
        """Map Okta user to internal user context"""
        return {
            'user_id': okta_user.id,
            'external_id': okta_user.id,
            'email': okta_user.profile.email,
            'first_name': okta_user.profile.firstName,
            'last_name': okta_user.profile.lastName,
            'status': 'active' if okta_user.status == 'ACTIVE' else 'inactive',
            'department': okta_user.profile.department,
            'job_title': okta_user.profile.title,
            'manager_email': okta_user.profile.manager,
            'groups': await self.get_user_groups(okta_user.id),
            'last_login': okta_user.lastLogin,
            'created_at': okta_user.created,
            'updated_at': datetime.now()
        }

    async def get_user_groups(self, user_id):
        """Get groups for a user"""
        groups, _, _ = await self.client.list_user_groups(user_id)
        return [{'group_id': g.id, 'name': g.profile.name} for g in groups]

    async def setup_webhook(self, webhook_url):
        """Setup webhook for real-time user updates"""
        webhook_config = {
            'name': 'AI Policy User Updates',
            'events': {
                'type': 'EVENT_HOOK',
                'items': [
                    'user.lifecycle.create',
                    'user.lifecycle.activate',
                    'user.lifecycle.deactivate',
                    'user.lifecycle.suspend',
                    'group.user_membership.add',
                    'group.user_membership.remove'
                ]
            },
            'channel': {
                'type': 'HTTP',
                'version': '1.0.0',
                'config': {
                    'uri': webhook_url,
                    'headers': [
                        {'key': 'X-API-Key', 'value': '${API_KEY}'}
                    ]
                }
            }
        }
        return await self.client.create_event_hook(webhook_config)
```

**Webhook Handler**:

```python
# webhooks.py
from fastapi import APIRouter, Header, Request

router = APIRouter()

@router.post("/webhooks/okta/user-events")
async def okta_user_event(
    request: Request,
    x_okta_verification_challenge: str = Header(None)
):
    # Handle verification challenge
    if x_okta_verification_challenge:
        return {"verification": x_okta_verification_challenge}

    # Process event
    event = await request.json()
    event_type = event['eventType']

    if event_type == 'user.lifecycle.activate':
        user_id = event['target'][0]['id']
        await refresh_user(user_id)
    elif event_type == 'user.lifecycle.deactivate':
        user_id = event['target'][0]['id']
        await deactivate_user(user_id)
    elif event_type == 'group.user_membership.add':
        user_id = event['target'][0]['id']
        await refresh_user_groups(user_id)

    return {"status": "processed"}
```

**SSO Integration**:

```yaml
# Admin UI SSO config
okta:
  domain: company.okta.com
  client_id: ${OKTA_CLIENT_ID}
  client_secret: ${OKTA_CLIENT_SECRET}
  redirect_uri: https://policy-portal.company.com/auth/callback
  scopes:
    - openid
    - profile
    - email
    - groups
```

---

### 1.2 Azure Active Directory Integration

**Purpose**: Sync users, groups; provide SSO

**API**: Microsoft Graph API

**Authentication**: OAuth 2.0 Client Credentials

**Sync Code**:

```python
# azure_ad_adapter.py
from azure.identity import ClientSecretCredential
from msgraph.core import GraphClient

class AzureADAdapter:
    def __init__(self, tenant_id, client_id, client_secret):
        credential = ClientSecretCredential(tenant_id, client_id, client_secret)
        self.client = GraphClient(credential=credential)

    async def sync_users(self):
        """Sync users from Azure AD"""
        users = await self.client.get('/users')
        synced_count = 0

        for ad_user in users['value']:
            user_context = {
                'user_id': ad_user['id'],
                'external_id': ad_user['id'],
                'email': ad_user['mail'] or ad_user['userPrincipalName'],
                'first_name': ad_user['givenName'],
                'last_name': ad_user['surname'],
                'department': ad_user.get('department'),
                'job_title': ad_user.get('jobTitle'),
                'manager_email': await self.get_manager_email(ad_user['id']),
                'status': 'active' if ad_user['accountEnabled'] else 'inactive'
            }
            await db.upsert_user(user_context)
            synced_count += 1

        return {'synced': synced_count}

    async def get_manager_email(self, user_id):
        """Get manager email for a user"""
        try:
            manager = await self.client.get(f'/users/{user_id}/manager')
            return manager['mail']
        except:
            return None

    async def sync_groups(self):
        """Sync security groups"""
        groups = await self.client.get('/groups')

        for group in groups['value']:
            group_context = {
                'group_id': group['id'],
                'external_id': group['id'],
                'name': group['displayName'],
                'description': group.get('description')
            }
            await db.upsert_group(group_context)

            # Sync group members
            members = await self.client.get(f'/groups/{group["id"]}/members')
            for member in members['value']:
                await db.add_user_to_group(member['id'], group['id'])
```

---

## 2. Asset Discovery & Endpoint Protection

### 2.1 CrowdStrike Falcon Integration

**Purpose**: Sync device inventory, identify crown jewels, check EDR status

**API**: CrowdStrike Falcon API

**Authentication**: OAuth 2.0 Client Credentials

**Integration Code**:

```python
# crowdstrike_adapter.py
from falconpy import Hosts, Discover

class CrowdStrikeAdapter:
    def __init__(self, client_id, client_secret):
        self.hosts = Hosts(client_id=client_id, client_secret=client_secret)
        self.discover = Discover(client_id=client_id, client_secret=client_secret)

    async def sync_devices(self):
        """Sync device inventory from CrowdStrike"""
        # Get all device IDs
        device_ids_response = self.hosts.query_devices_by_filter()
        device_ids = device_ids_response['body']['resources']

        # Get device details
        devices_response = self.hosts.get_device_details(ids=device_ids)
        devices = devices_response['body']['resources']

        synced_count = 0
        for device in devices:
            asset = self.map_device_to_asset(device)
            await db.upsert_asset(asset)
            synced_count += 1

        return {'synced': synced_count}

    def map_device_to_asset(self, device):
        """Map CrowdStrike device to internal asset"""
        return {
            'asset_id': device['device_id'],
            'external_id': device['device_id'],
            'asset_type': self.map_device_type(device['platform_name']),
            'hostname': device['hostname'],
            'ip_addresses': [device.get('local_ip')],
            'mac_addresses': [device.get('mac_address')],
            'os': device['platform_name'],
            'os_version': device['os_version'],
            'owner_email': device.get('machine_domain') + '\\' + device.get('last_seen_user'),
            'edr_agent_installed': True,
            'edr_agent_version': device['agent_version'],
            'last_scan': device['last_seen'],
            'compliance_status': 'compliant' if self.is_compliant(device) else 'non_compliant',
            'crown_jewel': self.is_crown_jewel(device),
            'sensitivity': self.calculate_sensitivity(device),
            'status': 'active',
            'created_at': device['first_seen'],
            'updated_at': datetime.now()
        }

    def is_crown_jewel(self, device):
        """Determine if device is a crown jewel"""
        # Logic to identify high-value assets
        indicators = [
            'prod' in device['hostname'].lower(),
            'finance' in device.get('ou_path', '').lower(),
            'exec' in device.get('ou_path', '').lower(),
            device.get('tags', []) and 'critical' in device['tags']
        ]
        return any(indicators)

    def calculate_sensitivity(self, device):
        """Calculate asset sensitivity level"""
        if self.is_crown_jewel(device):
            return 'critical'
        elif 'server' in device['platform_name'].lower():
            return 'high'
        else:
            return 'medium'

    def is_compliant(self, device):
        """Check if device is compliant"""
        checks = [
            device['agent_version'] >= '7.0.0',
            device['reduced_functionality_mode'] != 'yes',
            not device.get('config_id_base') == 'unmanaged'
        ]
        return all(checks)

    async def get_vulnerabilities(self, device_id):
        """Get vulnerabilities for a device"""
        vulns_response = self.discover.query_vulnerabilities(
            filter=f"host_info.device_id:'{device_id}'"
        )
        return vulns_response['body']['resources']
```

**Scheduled Sync**:

```python
# scheduler.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

# Sync CrowdStrike devices every 4 hours
@scheduler.scheduled_job('cron', hour='*/4')
async def sync_crowdstrike_devices():
    adapter = CrowdStrikeAdapter(
        client_id=config.CROWDSTRIKE_CLIENT_ID,
        client_secret=config.CROWDSTRIKE_CLIENT_SECRET
    )
    result = await adapter.sync_devices()
    logger.info(f"CrowdStrike sync completed: {result}")
```

---

### 2.2 SentinelOne Integration

**Purpose**: Sync endpoint inventory, detect threats

**API**: SentinelOne Management Console API

**Sync Code**:

```python
# sentinelone_adapter.py
import httpx

class SentinelOneAdapter:
    def __init__(self, console_url, api_token):
        self.base_url = console_url
        self.headers = {'Authorization': f'ApiToken {api_token}'}

    async def sync_agents(self):
        """Sync agents from SentinelOne"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f'{self.base_url}/web/api/v2.1/agents',
                headers=self.headers,
                params={'limit': 1000}
            )
            agents = response.json()['data']

            synced_count = 0
            for agent in agents:
                asset = {
                    'asset_id': agent['id'],
                    'external_id': agent['id'],
                    'hostname': agent['computerName'],
                    'os': agent['osType'],
                    'os_version': agent['osRevision'],
                    'edr_agent_installed': True,
                    'edr_agent_version': agent['agentVersion'],
                    'compliance_status': 'compliant' if agent['isActive'] else 'non_compliant',
                    'last_scan': agent['lastActiveDate']
                }
                await db.upsert_asset(asset)
                synced_count += 1

            return {'synced': synced_count}
```

---

### 2.3 Wiz Integration

**Purpose**: Cloud asset discovery, vulnerability management

**API**: Wiz GraphQL API

**Query Example**:

```python
# wiz_adapter.py
import httpx

class WizAdapter:
    def __init__(self, client_id, client_secret):
        self.auth_url = 'https://auth.wiz.io/oauth/token'
        self.api_url = 'https://api.us1.wiz.io/graphql'
        self.token = self.get_access_token(client_id, client_secret)

    def get_access_token(self, client_id, client_secret):
        response = httpx.post(
            self.auth_url,
            json={
                'grant_type': 'client_credentials',
                'client_id': client_id,
                'client_secret': client_secret,
                'audience': 'wiz-api'
            }
        )
        return response.json()['access_token']

    async def sync_cloud_resources(self):
        """Sync cloud resources from Wiz"""
        query = """
        query {
          cloudResources(first: 100) {
            nodes {
              id
              name
              type
              cloudPlatform
              subscription
              region
              tags
              risk {
                score
                level
              }
              vulnerabilities {
                totalCount
              }
            }
          }
        }
        """

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.api_url,
                headers={'Authorization': f'Bearer {self.token}'},
                json={'query': query}
            )
            resources = response.json()['data']['cloudResources']['nodes']

            for resource in resources:
                asset = {
                    'asset_id': resource['id'],
                    'external_id': resource['id'],
                    'asset_type': 'cloud_resource',
                    'hostname': resource['name'],
                    'crown_jewel': resource['risk']['level'] == 'CRITICAL',
                    'sensitivity': resource['risk']['level'].lower(),
                    'vulnerabilities': resource['vulnerabilities']['totalCount']
                }
                await db.upsert_asset(asset)
```

---

## 3. Configuration Management Database (CMDB)

### 3.1 ServiceNow CMDB Integration

**Purpose**: Sync asset inventory, business services, departments

**API**: ServiceNow REST API

**Integration Code**:

```python
# servicenow_adapter.py
from pyservicenow import ServiceNow

class ServiceNowAdapter:
    def __init__(self, instance, username, password):
        self.client = ServiceNow(
            instance=instance,
            user=username,
            password=password
        )

    async def sync_configuration_items(self):
        """Sync CIs from ServiceNow CMDB"""
        # Query cmdb_ci_computer table
        computers = self.client.query(
            table='cmdb_ci_computer',
            query={},
            limit=1000
        )

        for ci in computers:
            asset = {
                'asset_id': ci['sys_id'],
                'external_id': ci['sys_id'],
                'hostname': ci['name'],
                'ip_addresses': [ci.get('ip_address')],
                'serial_number': ci.get('serial_number'),
                'asset_type': ci['sys_class_name'],
                'os': ci.get('os'),
                'os_version': ci.get('os_version'),
                'owner_email': await self.get_user_email(ci.get('owned_by')),
                'department': await self.get_department(ci.get('department')),
                'status': 'active' if ci['install_status'] == '1' else 'retired',
                'crown_jewel': ci.get('criticality') == 'critical'
            }
            await db.upsert_asset(asset)

    async def get_user_email(self, user_sys_id):
        """Get user email from sys_id"""
        if not user_sys_id:
            return None
        user = self.client.query(table='sys_user', query={'sys_id': user_sys_id})
        return user[0]['email'] if user else None

    async def get_department(self, dept_sys_id):
        """Get department name from sys_id"""
        if not dept_sys_id:
            return None
        dept = self.client.query(table='cmn_department', query={'sys_id': dept_sys_id})
        return dept[0]['name'] if dept else None

    async def create_incident(self, violation):
        """Create incident in ServiceNow for policy violation"""
        incident = {
            'short_description': f"AI Policy Violation - {violation['violation_type']}",
            'description': f"""
                User: {violation['user_email']}
                Service: {violation['resource_name']}
                Policy: {violation['policy_name']}
                Reason: {violation['reason']}
            """,
            'category': 'Security',
            'subcategory': 'AI Governance',
            'priority': self.map_severity_to_priority(violation['severity']),
            'assignment_group': 'AI Governance Team'
        }
        return self.client.insert(table='incident', values=incident)

    def map_severity_to_priority(self, severity):
        mapping = {
            'critical': '1 - Critical',
            'high': '2 - High',
            'medium': '3 - Moderate',
            'low': '4 - Low'
        }
        return mapping.get(severity, '3 - Moderate')
```

---

## 4. Data Loss Prevention (DLP)

### 4.1 Microsoft Purview Integration

**Purpose**: Data classification, PII detection

**API**: Microsoft Graph API

**Integration Code**:

```python
# microsoft_purview_adapter.py
from azure.identity import ClientSecretCredential
from msgraph.core import GraphClient

class MicrosoftPurviewAdapter:
    def __init__(self, tenant_id, client_id, client_secret):
        credential = ClientSecretCredential(tenant_id, client_id, client_secret)
        self.client = GraphClient(credential=credential)

    async def classify_content(self, content: str):
        """Classify content using Microsoft Purview"""
        # Use Information Protection API
        response = await self.client.post(
            '/informationProtection/policy/labels/evaluateApplication',
            json={
                'contentInfo': {
                    'format': 'default',
                    'identifier': None,
                    'state': 'rest',
                    'metadata': []
                },
                'labelingOptions': {
                    'assignmentMethod': 'standard'
                }
            }
        )

        classification = response['labels'][0] if response['labels'] else None

        # Detect PII using DLP policies
        pii_response = await self.client.post(
            '/security/informationProtection/sensitivityLabels/evaluate',
            json={'currentLabel': None, 'discoveredSensitiveTypes': content}
        )

        detected_entities = []
        for entity in pii_response.get('sensitiveTypeDetections', []):
            detected_entities.append({
                'type': entity['sensitiveType']['name'],
                'confidence': entity['confidence'],
                'count': entity['count']
            })

        return {
            'classification': classification['name'] if classification else 'unclassified',
            'sensitivity': classification['sensitivity'] if classification else 'low',
            'detected_entities': detected_entities,
            'policy_labels': [classification['id']] if classification else []
        }
```

---

### 4.2 Symantec DLP Integration

**Purpose**: Data classification, content inspection

**API**: Symantec DLP REST API

**Integration Code**:

```python
# symantec_dlp_adapter.py
import httpx

class SymantecDLPAdapter:
    def __init__(self, server_url, username, password):
        self.base_url = server_url
        self.auth = (username, password)

    async def scan_content(self, content: str, content_type: str):
        """Scan content for sensitive data"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f'{self.base_url}/ProtectManager/webservices/v2.0/incidents',
                auth=self.auth,
                json={
                    'content': content,
                    'contentType': content_type,
                    'policies': ['PII_Policy', 'PHI_Policy', 'Financial_Data_Policy']
                }
            )

            scan_result = response.json()

            detected_entities = []
            for match in scan_result.get('matches', []):
                detected_entities.append({
                    'type': match['dataIdentifier'],
                    'value': match['matchedContent'][:20] + '...',  # Redacted
                    'confidence': match['confidence']
                })

            classification = 'PII' if any(e['type'] in ['SSN', 'EMAIL', 'PHONE'] for e in detected_entities) else 'unclassified'

            return {
                'classification': classification,
                'detected_entities': detected_entities,
                'policy_violations': scan_result.get('violatedPolicies', [])
            }
```

---

## 5. Cloud Access Security Broker (CASB)

### 5.1 Netskope Integration

**Purpose**: Monitor SaaS usage, detect shadow AI, enforce blocking

**API**: Netskope REST API v2

**Integration Code**:

```python
# netskope_adapter.py
import httpx
from datetime import datetime, timedelta

class NetskopeAdapter:
    def __init__(self, tenant, api_token):
        self.base_url = f'https://{tenant}.goskope.com/api/v2'
        self.headers = {'Netskope-Api-Token': api_token}

    async def get_app_usage(self, days=30):
        """Get SaaS application usage for last N days"""
        start_time = int((datetime.now() - timedelta(days=days)).timestamp())
        end_time = int(datetime.now().timestamp())

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f'{self.base_url}/events/application/page',
                headers=self.headers,
                params={
                    'starttime': start_time,
                    'endtime': end_time,
                    'limit': 5000
                }
            )

            events = response.json()['data']

            # Filter for AI services
            ai_events = [e for e in events if self.is_ai_service(e['app'])]

            return self.aggregate_usage(ai_events)

    def is_ai_service(self, app_name):
        """Check if app is an AI service"""
        ai_services = [
            'ChatGPT', 'Claude', 'Bard', 'Gemini', 'Copilot',
            'Jasper', 'Copy.ai', 'Midjourney', 'DALL-E'
        ]
        return any(ai_svc.lower() in app_name.lower() for ai_svc in ai_services)

    def aggregate_usage(self, events):
        """Aggregate usage by user and service"""
        usage = {}
        for event in events:
            key = (event['user'], event['app'])
            if key not in usage:
                usage[key] = {
                    'user': event['user'],
                    'service': event['app'],
                    'access_count': 0,
                    'first_access': event['timestamp'],
                    'last_access': event['timestamp']
                }
            usage[key]['access_count'] += 1
            usage[key]['last_access'] = max(usage[key]['last_access'], event['timestamp'])

        return list(usage.values())

    async def block_application(self, app_name):
        """Add application to block list"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f'{self.base_url}/policy/rules',
                headers=self.headers,
                json={
                    'name': f'Block {app_name}',
                    'action': 'block',
                    'applications': [app_name],
                    'enabled': True
                }
            )
            return response.json()

    async def create_alert_rule(self, policy_id):
        """Create alert rule for policy violations"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f'{self.base_url}/alerts/rules',
                headers=self.headers,
                json={
                    'name': 'AI Service Policy Violation',
                    'type': 'anomaly',
                    'policyIds': [policy_id],
                    'severity': 'high',
                    'actions': [
                        {'type': 'email', 'recipients': ['security@company.com']},
                        {'type': 'webhook', 'url': 'https://policy-engine.company.com/webhooks/netskope'}
                    ]
                }
            )
            return response.json()
```

---

## 6. Security Information & Event Management (SIEM)

### 6.1 Splunk Integration

**Purpose**: Forward audit events, create alerts, dashboards

**API**: Splunk HTTP Event Collector (HEC)

**Integration Code**:

```python
# splunk_adapter.py
import httpx
import json

class SplunkAdapter:
    def __init__(self, hec_url, hec_token):
        self.hec_url = hec_url
        self.hec_token = hec_token

    async def send_event(self, event):
        """Send event to Splunk via HEC"""
        payload = {
            'time': event['timestamp'],
            'host': 'ai-policy-platform',
            'source': 'ai-policy-engine',
            'sourcetype': 'ai:policy:decision',
            'event': event
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.hec_url,
                headers={
                    'Authorization': f'Splunk {self.hec_token}',
                    'Content-Type': 'application/json'
                },
                json=payload
            )
            return response.status_code == 200

    async def create_alert(self, alert_config):
        """Create Splunk alert"""
        search_query = f"""
        search index=ai_policy sourcetype=ai:policy:decision decision=DENY
        | stats count by user_email, resource_name, policy_name
        | where count > 5
        """

        alert_payload = {
            'name': alert_config['name'],
            'search': search_query,
            'cron_schedule': '*/15 * * * *',  # Every 15 minutes
            'actions': 'email',
            'action.email.to': 'security@company.com',
            'action.email.subject': 'AI Policy Alert: Multiple Denials Detected'
        }

        # Use Splunk REST API to create alert
        # (Implementation depends on Splunk SDK)
```

---

### 6.2 Microsoft Sentinel Integration

**Purpose**: Forward audit events, create incidents

**API**: Azure Monitor Data Collector API

**Integration Code**:

```python
# microsoft_sentinel_adapter.py
import httpx
import hmac
import hashlib
import base64
from datetime import datetime

class MicrosoftSentinelAdapter:
    def __init__(self, workspace_id, shared_key):
        self.workspace_id = workspace_id
        self.shared_key = shared_key
        self.log_type = 'AIPolicyDecisions'

    def build_signature(self, date, content_length):
        """Build authorization signature for Azure Monitor"""
        x_headers = f'x-ms-date:{date}'
        string_to_hash = f'POST\n{content_length}\napplication/json\n{x_headers}\n/api/logs'
        bytes_to_hash = bytes(string_to_hash, encoding='utf-8')
        decoded_key = base64.b64decode(self.shared_key)
        encoded_hash = base64.b64encode(
            hmac.new(decoded_key, bytes_to_hash, digestmod=hashlib.sha256).digest()
        ).decode()
        return f'SharedKey {self.workspace_id}:{encoded_hash}'

    async def send_events(self, events):
        """Send events to Azure Monitor / Sentinel"""
        body = json.dumps(events)
        content_length = len(body)
        rfc1123date = datetime.utcnow().strftime('%a, %d %b %Y %H:%M:%S GMT')

        signature = self.build_signature(rfc1123date, content_length)

        url = f'https://{self.workspace_id}.ods.opinsights.azure.com/api/logs?api-version=2016-04-01'

        headers = {
            'Content-Type': 'application/json',
            'Authorization': signature,
            'Log-Type': self.log_type,
            'x-ms-date': rfc1123date
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, data=body)
            return response.status_code == 200
```

---

## 7. Communication Platforms

### 7.1 Slack Integration

**Purpose**: Send notifications, alerts, violation summaries

**API**: Slack Web API

**Integration Code**:

```python
# slack_adapter.py
from slack_sdk.web.async_client import AsyncWebClient

class SlackAdapter:
    def __init__(self, bot_token):
        self.client = AsyncWebClient(token=bot_token)

    async def send_violation_alert(self, violation):
        """Send violation alert to Slack"""
        blocks = [
            {
                'type': 'header',
                'text': {
                    'type': 'plain_text',
                    'text': '🚨 AI Policy Violation Detected'
                }
            },
            {
                'type': 'section',
                'fields': [
                    {'type': 'mrkdwn', 'text': f'*User:*\n{violation["user_email"]}'},
                    {'type': 'mrkdwn', 'text': f'*Service:*\n{violation["resource_name"]}'},
                    {'type': 'mrkdwn', 'text': f'*Policy:*\n{violation["policy_name"]}'},
                    {'type': 'mrkdwn', 'text': f'*Severity:*\n{violation["severity"]}'}
                ]
            },
            {
                'type': 'section',
                'text': {
                    'type': 'mrkdwn',
                    'text': f'*Reason:*\n{violation["reason"]}'
                }
            },
            {
                'type': 'actions',
                'elements': [
                    {
                        'type': 'button',
                        'text': {'type': 'plain_text', 'text': 'View Details'},
                        'url': f'https://policy-portal.company.com/violations/{violation["violation_id"]}'
                    }
                ]
            }
        ]

        await self.client.chat_postMessage(
            channel='#ai-governance-alerts',
            blocks=blocks
        )

    async def send_daily_summary(self, summary):
        """Send daily usage summary"""
        message = f"""
        *Daily AI Usage Summary - {summary['date']}*

        📊 *Usage Stats:*
        • Total Requests: {summary['total_requests']:,}
        • Allowed: {summary['allowed']:,} ({summary['allowed_pct']:.1f}%)
        • Denied: {summary['denied']:,} ({summary['denied_pct']:.1f}%)
        • Review: {summary['review']:,}

        🔝 *Top AI Services:*
        {self.format_top_services(summary['top_services'])}

        ⚠️ *Top Violators:*
        {self.format_top_violators(summary['top_violators'])}

        <https://policy-portal.company.com/reports|View Full Report>
        """

        await self.client.chat_postMessage(
            channel='#ai-governance',
            text=message
        )

    def format_top_services(self, services):
        return '\n'.join([f"  {i+1}. {s['name']}: {s['count']:,} requests"
                          for i, s in enumerate(services[:5])])

    def format_top_violators(self, violators):
        return '\n'.join([f"  {i+1}. {v['user']}: {v['violations']} violations"
                          for i, v in enumerate(violators[:5])])
```

---

### 7.2 Microsoft Teams Integration

**Purpose**: Send notifications via Teams

**API**: Microsoft Graph API + Teams Webhooks

**Integration Code**:

```python
# teams_adapter.py
import httpx

class TeamsAdapter:
    def __init__(self, webhook_url):
        self.webhook_url = webhook_url

    async def send_adaptive_card(self, violation):
        """Send violation alert as Adaptive Card"""
        card = {
            'type': 'message',
            'attachments': [
                {
                    'contentType': 'application/vnd.microsoft.card.adaptive',
                    'content': {
                        '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
                        'type': 'AdaptiveCard',
                        'version': '1.4',
                        'body': [
                            {
                                'type': 'TextBlock',
                                'text': 'AI Policy Violation',
                                'weight': 'bolder',
                                'size': 'large',
                                'color': 'attention'
                            },
                            {
                                'type': 'FactSet',
                                'facts': [
                                    {'title': 'User', 'value': violation['user_email']},
                                    {'title': 'Service', 'value': violation['resource_name']},
                                    {'title': 'Policy', 'value': violation['policy_name']},
                                    {'title': 'Severity', 'value': violation['severity']}
                                ]
                            },
                            {
                                'type': 'TextBlock',
                                'text': violation['reason'],
                                'wrap': True
                            }
                        ],
                        'actions': [
                            {
                                'type': 'Action.OpenUrl',
                                'title': 'View Details',
                                'url': f'https://policy-portal.company.com/violations/{violation["violation_id"]}'
                            }
                        ]
                    }
                }
            ]
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(self.webhook_url, json=card)
            return response.status_code == 200
```

---

## 8. Integration Orchestration

### 8.1 Centralized Integration Manager

```python
# integration_manager.py
from typing import Dict, Any
import asyncio

class IntegrationManager:
    def __init__(self):
        self.integrations = {}

    def register(self, name: str, adapter: Any):
        """Register an integration adapter"""
        self.integrations[name] = adapter

    async def sync_all(self):
        """Run sync for all integrations"""
        tasks = []
        for name, adapter in self.integrations.items():
            if hasattr(adapter, 'sync'):
                tasks.append(self.run_sync(name, adapter))

        results = await asyncio.gather(*tasks, return_exceptions=True)
        return dict(zip(self.integrations.keys(), results))

    async def run_sync(self, name: str, adapter: Any):
        """Run sync for a single integration"""
        try:
            result = await adapter.sync()
            logger.info(f"Integration sync completed: {name} - {result}")
            return {'status': 'success', 'result': result}
        except Exception as e:
            logger.error(f"Integration sync failed: {name} - {str(e)}")
            return {'status': 'error', 'error': str(e)}

# Initialize integrations
manager = IntegrationManager()

manager.register('okta', OktaAdapter(domain, token))
manager.register('crowdstrike', CrowdStrikeAdapter(client_id, secret))
manager.register('servicenow', ServiceNowAdapter(instance, user, pwd))
manager.register('netskope', NetskopeAdapter(tenant, token))
manager.register('splunk', SplunkAdapter(hec_url, hec_token))

# Schedule syncs
@scheduler.scheduled_job('cron', minute='*/15')  # Every 15 minutes
async def run_integrations_sync():
    await manager.sync_all()
```

---

## 9. Summary

**Integration Coverage**:
- ✓ IAM (Okta, Azure AD, Google Workspace)
- ✓ EDR/Asset Discovery (CrowdStrike, SentinelOne, Wiz)
- ✓ CMDB (ServiceNow, Jira)
- ✓ DLP (Microsoft Purview, Symantec DLP)
- ✓ CASB (Netskope, Microsoft Defender)
- ✓ SIEM (Splunk, Microsoft Sentinel)
- ✓ Communication (Slack, Microsoft Teams)

**Key Patterns**:
1. **Scheduled Sync** (every 15 minutes to 4 hours)
2. **Webhook-based Real-time Updates**
3. **Event Forwarding** (audit logs → SIEM)
4. **Bidirectional** (read context, push violations/incidents)
5. **Health Monitoring** (track sync status, errors)

**Next Document**: Example Workflows (user accesses AI service → decision flow)
