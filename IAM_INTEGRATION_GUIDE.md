# IAM Integration Guide

Complete guide for integrating Okta and Microsoft Entra ID (Azure AD) with AI Governance Platform.

## Features

✅ **JWT Token Verification** - Verify tokens from Okta/Entra ID
✅ **User Synchronization** - Sync user details and groups from IAM providers  
✅ **Automatic Group Mapping** - Map IAM groups to departments/roles
✅ **SSO Support** - Single Sign-On for Admin UI
✅ **API Authentication** - Bearer token authentication for all API endpoints
✅ **Dual Auth Mode** - Support both IAM tokens and API keys

## Configuration

See full documentation in the file for Okta and Entra ID setup instructions.

## API Endpoints

- `GET /api/iam/status` - Check IAM integration status
- `POST /api/iam/verify-token` - Verify JWT token
- `POST /api/iam/sync-user` - Sync user from IAM provider
- `GET /api/iam/users` - List all users
- `GET /api/iam/users/{email}` - Get user details
- `GET /api/iam/users/{email}/activity` - Get user activity

