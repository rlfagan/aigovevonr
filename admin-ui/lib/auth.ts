// Authentication utilities for Okta and Microsoft Entra ID (Azure AD)

export interface AuthConfig {
  provider: 'okta' | 'entra' | 'mock'
  clientId: string
  domain: string
  redirectUri: string
  scopes: string[]
}

export interface User {
  id: string
  email: string
  name: string
  department: string
  roles: string[]
  attributes: {
    ai_training_completed?: boolean
    approved_services?: Record<string, boolean>
    [key: string]: any
  }
}

// Load auth config from environment
export function getAuthConfig(): AuthConfig {
  const provider = (process.env.NEXT_PUBLIC_AUTH_PROVIDER || 'mock') as AuthConfig['provider']

  if (provider === 'okta') {
    return {
      provider: 'okta',
      clientId: process.env.NEXT_PUBLIC_OKTA_CLIENT_ID || '',
      domain: process.env.NEXT_PUBLIC_OKTA_DOMAIN || '',
      redirectUri: process.env.NEXT_PUBLIC_OKTA_REDIRECT_URI || 'http://localhost:3001/callback',
      scopes: ['openid', 'profile', 'email', 'groups']
    }
  }

  if (provider === 'entra') {
    return {
      provider: 'entra',
      clientId: process.env.NEXT_PUBLIC_ENTRA_CLIENT_ID || '',
      domain: process.env.NEXT_PUBLIC_ENTRA_TENANT_ID || '',
      redirectUri: process.env.NEXT_PUBLIC_ENTRA_REDIRECT_URI || 'http://localhost:3001/callback',
      scopes: ['openid', 'profile', 'email', 'User.Read']
    }
  }

  // Mock provider for development
  return {
    provider: 'mock',
    clientId: 'mock-client-id',
    domain: 'mock-domain',
    redirectUri: 'http://localhost:3001/callback',
    scopes: ['openid', 'profile', 'email']
  }
}

// Initialize auth based on provider
export async function initAuth() {
  const config = getAuthConfig()

  if (config.provider === 'mock') {
    console.log('Using mock authentication for development')
    return
  }

  // Initialize Okta or Entra SDK here
  console.log(`Initializing ${config.provider} authentication`)
}

// Get current user from session
export async function getCurrentUser(): Promise<User | null> {
  const config = getAuthConfig()

  if (config.provider === 'mock') {
    // Return mock user for development
    return {
      id: 'mock-user-123',
      email: 'admin@company.com',
      name: 'Admin User',
      department: 'IT',
      roles: ['admin', 'policy_manager'],
      attributes: {
        ai_training_completed: true,
        approved_services: {
          'chatgpt.com': true,
          'claude.ai': true,
          'copilot.github.com': true
        }
      }
    }
  }

  // In production, fetch from Okta/Entra
  try {
    const response = await fetch('/api/auth/user')
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.error('Failed to get current user:', error)
    return null
  }
}

// Login redirect
export function login() {
  const config = getAuthConfig()

  if (config.provider === 'okta') {
    const authUrl = `https://${config.domain}/oauth2/v1/authorize?` +
      `client_id=${config.clientId}&` +
      `response_type=code&` +
      `scope=${config.scopes.join(' ')}&` +
      `redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
      `state=${generateState()}`

    window.location.href = authUrl
  } else if (config.provider === 'entra') {
    const authUrl = `https://login.microsoftonline.com/${config.domain}/oauth2/v2.0/authorize?` +
      `client_id=${config.clientId}&` +
      `response_type=code&` +
      `scope=${config.scopes.join(' ')}&` +
      `redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
      `state=${generateState()}`

    window.location.href = authUrl
  } else {
    // Mock login - redirect to dashboard
    window.location.href = '/'
  }
}

// Logout
export function logout() {
  const config = getAuthConfig()

  if (config.provider === 'okta') {
    window.location.href = `https://${config.domain}/oauth2/v1/logout?` +
      `post_logout_redirect_uri=${encodeURIComponent(window.location.origin)}`
  } else if (config.provider === 'entra') {
    window.location.href = `https://login.microsoftonline.com/${config.domain}/oauth2/v2.0/logout?` +
      `post_logout_redirect_uri=${encodeURIComponent(window.location.origin)}`
  } else {
    // Mock logout
    window.location.href = '/login'
  }
}

// Check if user has permission
export function hasPermission(user: User | null, permission: string): boolean {
  if (!user) return false

  // Admins have all permissions
  if (user.roles.includes('admin')) return true

  // Check specific permissions
  const permissionMap: Record<string, string[]> = {
    'manage_policies': ['admin', 'policy_manager'],
    'view_violations': ['admin', 'policy_manager', 'auditor'],
    'manage_users': ['admin'],
    'view_dashboard': ['admin', 'policy_manager', 'auditor', 'user']
  }

  const requiredRoles = permissionMap[permission] || []
  return user.roles.some(role => requiredRoles.includes(role))
}

// Helper: Generate random state for OAuth
function generateState(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15)
}

// Extract user attributes from OAuth claims
export function extractUserAttributes(claims: any): User['attributes'] {
  return {
    ai_training_completed: claims.ai_training_completed === 'true' || claims.ai_training_completed === true,
    approved_services: claims.approved_services ? JSON.parse(claims.approved_services) : {},
    department: claims.department || claims['extension_Department'] || 'unknown',
    // Add more custom claims as needed
  }
}
