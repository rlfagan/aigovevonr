# Integration Test Configuration Guide

## Overview

The AI Governance Platform now includes **live configuration testing** for all integrations. Each integration can be tested to verify:
- Connectivity to backend services
- Database schema and access
- API credentials validity
- Recent activity and sync status

## How to Test Integrations

### 1. Via UI (Recommended)

Navigate to **Admin → Integrations** (http://localhost:3001/integrations)

#### For Connected Integrations:
- Look for the **"Test"** button next to the "Open" button
- Click to run live tests
- View detailed results in modal

#### For Available Integrations:
- Look for the **"Test Connection"** button at the bottom of the card
- Click to verify the integration is ready to be configured
- View setup requirements and current status

### 2. Via API (Command Line)

#### Test IAM Integration
```bash
curl -X POST http://localhost:8002/api/iam/test-connection | jq
```

**Example Response:**
```json
{
  "success": true,
  "timestamp": "2025-01-04T00:14:36.330096",
  "providers": {
    "okta": {
      "enabled": false,
      "configured": false
    },
    "entra_id": {
      "enabled": false,
      "configured": false
    }
  },
  "tests": [
    {
      "name": "Database Connection",
      "status": "passed",
      "message": "Successfully connected to database"
    },
    {
      "name": "Users Table",
      "status": "passed",
      "message": "Found 3 users in database"
    },
    {
      "name": "Okta Integration",
      "status": "info",
      "message": "Okta not configured"
    },
    {
      "name": "Entra ID Integration",
      "status": "info",
      "message": "Entra ID not configured"
    }
  ],
  "summary": "2/4 tests passed"
}
```

#### Test Zscaler Integration
```bash
curl -X POST http://localhost:8002/api/zscaler/test-connection | jq
```

**Example Response:**
```json
{
  "success": false,
  "timestamp": "2025-01-04T00:14:31.723275",
  "tests": [
    {
      "name": "Configuration Check",
      "status": "failed",
      "message": "No enabled Zscaler configuration found"
    }
  ]
}
```

**After Configuration:**
```json
{
  "success": true,
  "timestamp": "2025-01-04T12:00:00.000000",
  "tests": [
    {
      "name": "Configuration Check",
      "status": "passed",
      "message": "Configuration found for cloud: zscaler"
    },
    {
      "name": "Database Schema",
      "status": "passed",
      "message": "All Zscaler tables exist"
    },
    {
      "name": "Database Write Access",
      "status": "passed",
      "message": "Can query zscaler_web_logs table"
    },
    {
      "name": "API Credentials",
      "status": "passed",
      "message": "API credentials are configured"
    },
    {
      "name": "Recent Activity",
      "status": "info",
      "message": "No logs ingested in last 24 hours (may be normal for new setup)"
    }
  ],
  "summary": "4/5 tests passed"
}
```

## Test Status Indicators

### Status Types

- **✅ Passed** - Test completed successfully
- **❌ Failed** - Critical failure, integration won't work
- **⚠️ Warning** - Non-critical issue, integration may have reduced functionality
- **ℹ️ Info** - Informational message, not an error

### Critical vs Non-Critical Tests

#### Critical Tests (Must Pass):
- Database Connection
- Database Schema
- API Endpoint Availability

#### Non-Critical Tests (Can Fail):
- Recent Activity (normal for new setups)
- Optional Features
- Sync Status

## What Tests Check

### IAM Integration Tests

1. **Database Connection**
   - Verifies PostgreSQL database is accessible
   - Tests connection pool availability

2. **Users Table**
   - Confirms users table exists
   - Reports current user count

3. **Okta Integration**
   - Checks if Okta environment variables are set
   - Queries for Okta-synced users
   - Reports last sync timestamp

4. **Entra ID Integration**
   - Checks if Entra ID environment variables are set
   - Queries for Entra ID-synced users
   - Reports last sync timestamp

### Zscaler Integration Tests

1. **Configuration Check**
   - Verifies Zscaler configuration exists in database
   - Checks if integration is enabled
   - Reports configured cloud name

2. **Database Schema**
   - Validates all 4 Zscaler tables exist:
     - `zscaler_web_logs`
     - `zscaler_zpa_logs`
     - `zscaler_ai_detections`
     - `zscaler_config`

3. **Database Write Access**
   - Tests ability to query Zscaler tables
   - Verifies database permissions

4. **API Credentials**
   - Checks if API key is configured
   - Validates username is set
   - Does NOT test actual API connectivity (that requires external network access)

5. **Recent Activity**
   - Counts logs ingested in last 24 hours
   - Indicates if log ingestion is working

## Troubleshooting

### Common Issues

#### "Database not available"
- **Cause**: PostgreSQL container is not running
- **Solution**: Run `docker compose up -d postgres`

#### "No enabled configuration found"
- **Cause**: Integration not configured yet
- **Solution**: Click "Configure" button and add credentials

#### "Missing tables"
- **Cause**: Database migration not run
- **Solution**: Run the migration:
  ```bash
  docker exec -i ai-policy-db psql -U aigovuser -d ai_governance < database/migrations/001_zscaler_tables.sql
  ```

#### "IAM provider not configured"
- **Status**: `info` (not an error)
- **Meaning**: Provider credentials not added yet
- **Solution**: Add environment variables and restart Decision API

### Test Failures vs Warnings

| Result | Action Required |
|--------|----------------|
| All Critical Tests Pass | ✅ Integration is ready to use |
| Some Non-Critical Tests Fail | ⚠️ Integration works but may have limited functionality |
| Critical Test Fails | ❌ Must fix before integration will work |

## Integration-Specific Notes

### Okta
- Requires `OKTA_DOMAIN`, `OKTA_CLIENT_ID`, `OKTA_CLIENT_SECRET`, `OKTA_API_TOKEN`
- Test verifies configuration but doesn't make external API calls
- User sync must be run separately

### Microsoft Entra ID
- Requires `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET`
- Test verifies configuration but doesn't make external API calls
- User sync must be run separately

### Zscaler
- Requires cloud name, API key, username, password
- Test checks database and configuration only
- Actual log ingestion requires:
  1. Valid Zscaler API credentials
  2. Zscaler log streaming configured
  3. Webhook or API polling enabled

### Google Workspace (Coming Soon)
- Will test service account credentials
- Will verify Admin SDK API access
- Will check last sync status

### AWS CloudTrail (Coming Soon)
- Will test IAM role/credentials
- Will verify S3 bucket access
- Will check CloudTrail is enabled

### Netskope (Coming Soon)
- Will test API token validity
- Will verify tenant access
- Will check log export configuration

## Running Automated Tests

### Full Integration Test Suite
```bash
#!/bin/bash
# test-all-integrations.sh

echo "Testing IAM Integration..."
curl -s -X POST http://localhost:8002/api/iam/test-connection | jq '.success'

echo "Testing Zscaler Integration..."
curl -s -X POST http://localhost:8002/api/zscaler/test-connection | jq '.success'

# Add more as they become available
```

### CI/CD Integration

Add to your `.github/workflows/test.yml`:
```yaml
- name: Test Integrations
  run: |
    docker compose up -d
    sleep 10

    # Test IAM
    curl -f -X POST http://localhost:8002/api/iam/test-connection

    # Test Zscaler
    curl -f -X POST http://localhost:8002/api/zscaler/test-connection
```

## Next Steps

After successful testing:
1. **Configure the integration** with real credentials
2. **Test again** to verify configured state
3. **Enable log ingestion** if applicable
4. **Monitor activity** in the dashboard

---

**Last Updated**: 2025-01-04
**Test Endpoints Available**: 2 (IAM, Zscaler)
**Coming Soon**: Google Workspace, AWS CloudTrail, Netskope
