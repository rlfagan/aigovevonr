# 🔐 IAM Integration Guide (Okta & Microsoft Entra ID)

Complete guide to integrate your AI Governance Platform with enterprise identity providers.

---

## 🎯 Overview

The platform supports:
- **Okta** - Enterprise SSO and identity management
- **Microsoft Entra ID** (Azure AD) - Microsoft 365 identity
- **Mock Provider** - Development/testing mode

---

## 📦 What's Included

### 1. Authentication Library
**File**: `admin-ui/lib/auth.ts`

Features:
- ✅ Multi-provider support (Okta, Entra, Mock)
- ✅ OAuth 2.0 / OpenID Connect
- ✅ User attribute extraction
- ✅ Role-based access control (RBAC)
- ✅ Permission checking

### 2. Environment Configuration
**File**: `admin-ui/.env.example`

Supports configuration for:
- Provider selection
- Client credentials
- API endpoints
- Custom claim mapping

---

## 🚀 Quick Setup

### Option 1: Mock Provider (Development)

```bash
cd admin-ui
cp .env.example .env

# Edit .env
NEXT_PUBLIC_AUTH_PROVIDER=mock
```

That's it! Mock provider works out of the box.

---

### Option 2: Okta Integration

#### Step 1: Create Okta Application

1. Log into Okta Admin Console
2. Go to **Applications** → **Create App Integration**
3. Select **OIDC - OpenID Connect**
4. Choose **Web Application**
5. Configure:
   - **App integration name**: AI Governance Platform
   - **Sign-in redirect URIs**: `http://localhost:3001/callback`
   - **Sign-out redirect URIs**: `http://localhost:3001`
   - **Controlled access**: Choose your policy

6. Save and note down:
   - Client ID
   - Okta Domain (e.g., `your-company.okta.com`)

#### Step 2: Configure Custom Claims (Optional)

Add custom claims to include user attributes:

1. Go to **Security** → **API** → **Authorization Servers**
2. Select your server (usually `default`)
3. Go to **Claims** tab → **Add Claim**

Example claims:
```
Name: department
Include in token type: ID Token
Value type: Expression
Value: user.department

Name: ai_training_completed
Include in token type: ID Token
Value type: Expression
Value: user.ai_training_completed

Name: approved_services
Include in token type: ID Token
Value type: Expression
Value: user.approved_services
```

#### Step 3: Configure Environment

```bash
cd admin-ui
cp .env.example .env

# Edit .env
NEXT_PUBLIC_AUTH_PROVIDER=okta
NEXT_PUBLIC_OKTA_DOMAIN=your-company.okta.com
NEXT_PUBLIC_OKTA_CLIENT_ID=0oa...xyz
NEXT_PUBLIC_OKTA_REDIRECT_URI=http://localhost:3001/callback
```

#### Step 4: Test

```bash
npm run dev
# Visit http://localhost:3001
# Should redirect to Okta login
```

---

### Option 3: Microsoft Entra ID (Azure AD)

#### Step 1: Register Application

1. Log into **Azure Portal**
2. Go to **Microsoft Entra ID** (formerly Azure AD)
3. Select **App registrations** → **New registration**
4. Configure:
   - **Name**: AI Governance Platform
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**: Web - `http://localhost:3001/callback`

5. After registration, note down:
   - **Application (client) ID**
   - **Directory (tenant) ID**

#### Step 2: Create Client Secret

1. In your app registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Add description and select expiration
4. Copy the **Value** (you won't see it again!)

#### Step 3: Configure API Permissions

1. Go to **API permissions** → **Add a permission**
2. Select **Microsoft Graph**
3. Choose **Delegated permissions**
4. Add:
   - `User.Read`
   - `profile`
   - `email`
   - `openid`
5. Click **Grant admin consent**

#### Step 4: Add Custom Attributes (Optional)

To add custom user attributes:

1. Go to **Microsoft Entra ID** → **Users**
2. Select **User settings** → **Manage user attributes**
3. Add custom attributes like:
   - `ai_training_completed`
   - `approved_services`
   - `department` (if not already present)

Or use **Extension Attributes** in app registration.

#### Step 5: Configure Environment

```bash
cd admin-ui
cp .env.example .env

# Edit .env
NEXT_PUBLIC_AUTH_PROVIDER=entra
NEXT_PUBLIC_ENTRA_TENANT_ID=your-tenant-id
NEXT_PUBLIC_ENTRA_CLIENT_ID=your-client-id
NEXT_PUBLIC_ENTRA_REDIRECT_URI=http://localhost:3001/callback
ENTRA_CLIENT_SECRET=your-client-secret
```

#### Step 6: Test

```bash
npm run dev
# Visit http://localhost:3001
# Should redirect to Microsoft login
```

---

## 🔧 Browser Extension Integration

The browser extension needs to get user identity from the SSO provider.

### Update Extension Background Script

Edit `browser-extension/background.js`:

```javascript
// Replace hardcoded user with SSO-fetched user
const USER_EMAIL = await getUserFromSSO();
const USER_DEPARTMENT = await getUserDepartment();

async function getUserFromSSO() {
  try {
    // Fetch from admin UI API that validates SSO token
    const response = await fetch('http://localhost:3001/api/auth/extension-user', {
      credentials: 'include'
    });
    const data = await response.json();
    return data.email;
  } catch (error) {
    console.error('Failed to get user from SSO:', error);
    return 'unknown@company.com';
  }
}
```

### Create API Endpoint for Extension

Create `admin-ui/app/api/auth/extension-user/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    email: user.email,
    department: user.department,
    attributes: user.attributes
  })
}
```

---

## 🎨 Custom Claims & Attributes

### User Attributes Schema

The platform expects these user attributes:

```typescript
{
  id: string                    // Unique user ID
  email: string                 // User email
  name: string                  // Full name
  department: string            // Department (engineering, marketing, etc.)
  roles: string[]               // Roles (admin, policy_manager, auditor, user)
  attributes: {
    ai_training_completed: boolean
    approved_services: {
      [service: string]: boolean
    }
  }
}
```

### Mapping Okta Claims

In your Okta config, map claims to these attributes:

| Okta Claim | Platform Attribute |
|------------|-------------------|
| `sub` | `id` |
| `email` | `email` |
| `name` | `name` |
| `department` | `department` |
| `groups` | `roles` |
| `ai_training_completed` | `attributes.ai_training_completed` |
| `approved_services` | `attributes.approved_services` |

### Mapping Entra Claims

For Microsoft Entra ID:

| Entra Claim | Platform Attribute |
|-------------|-------------------|
| `oid` | `id` |
| `email` or `upn` | `email` |
| `name` | `name` |
| `extension_Department` | `department` |
| `roles` | `roles` |
| Custom extensions | `attributes.*` |

---

## 🔐 Role-Based Access Control (RBAC)

### Available Roles

- **admin**: Full access to everything
- **policy_manager**: Manage policies, view violations
- **auditor**: Read-only access to violations
- **user**: Basic dashboard access

### Permissions

```typescript
const permissions = {
  'manage_policies': ['admin', 'policy_manager'],
  'view_violations': ['admin', 'policy_manager', 'auditor'],
  'manage_users': ['admin'],
  'view_dashboard': ['admin', 'policy_manager', 'auditor', 'user']
}
```

### Usage in Components

```typescript
import { getCurrentUser, hasPermission } from '@/lib/auth'

const user = await getCurrentUser()

if (hasPermission(user, 'manage_policies')) {
  // Show policy management UI
}
```

---

## 🧪 Testing

### Test with Mock Provider

```bash
# Already enabled by default
npm run dev
# No login required, uses mock user
```

### Test Okta Integration

```bash
# Set up Okta dev account
# Configure .env with Okta credentials
npm run dev
# Should redirect to Okta login
```

### Test Entra Integration

```bash
# Set up Azure AD
# Configure .env with Entra credentials
npm run dev
# Should redirect to Microsoft login
```

---

## 🚀 Production Deployment

### Environment Variables

Set these in your production environment:

```bash
NEXT_PUBLIC_AUTH_PROVIDER=okta  # or 'entra'
NEXT_PUBLIC_OKTA_DOMAIN=company.okta.com
NEXT_PUBLIC_OKTA_CLIENT_ID=prod_client_id
NEXT_PUBLIC_OKTA_REDIRECT_URI=https://ai-governance.company.com/callback
OKTA_API_TOKEN=prod_api_token
```

### Update Redirect URIs

In Okta/Entra:
1. Add production redirect URI
2. Update sign-out redirect URI
3. Test with production domain

### Security Checklist

- [ ] Use HTTPS in production
- [ ] Store secrets securely (never in code)
- [ ] Rotate client secrets regularly
- [ ] Enable MFA for admin accounts
- [ ] Monitor authentication logs
- [ ] Set up session timeouts
- [ ] Implement CSRF protection
- [ ] Validate all tokens server-side

---

## 📊 Integration with Policy Engine

### Sending User Context to Policy Engine

Update Decision API calls to include full user context:

```typescript
const decision = await fetch('http://localhost:8002/api/decide', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    resource_url: url,
    user_email: user.email,
    user_department: user.department,
    user_attributes: {
      ai_training_completed: user.attributes.ai_training_completed,
      approved_services: user.attributes.approved_services,
      roles: user.roles
    }
  })
})
```

### Policy Rules Using User Attributes

Example policy using SSO attributes:

```rego
# Allow if user completed training
allow if {
    input.user_attributes.ai_training_completed == true
    approved_service
}

# Check if service in user's approved list
allow if {
    input.user_attributes.approved_services[input.service] == true
}

# Admin bypass
allow if {
    "admin" in input.user_attributes.roles
}
```

---

## 🎯 Next Steps

1. **Choose Provider**: Okta, Entra, or Mock
2. **Configure**: Set up app registration
3. **Test**: Verify login flow works
4. **Customize**: Add custom claims for your org
5. **Deploy**: Move to production with real credentials

---

## 📞 Support

- **Okta Docs**: https://developer.okta.com/docs/
- **Entra Docs**: https://learn.microsoft.com/en-us/entra/
- **Issues**: Create GitHub issue with `[IAM]` tag

---

**Authentication is ready to deploy!** 🔐
