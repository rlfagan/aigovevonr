# Enforcement Plugin Architecture
## Enterprise AI Policy Management and Enforcement Platform

---

## Overview

This document describes the **enforcement layer** — the plugins, agents, and interceptors that enforce AI governance policies at every endpoint where users interact with AI services.

**Enforcement Points**:
1. **Browser Extensions** (Chrome, Edge, Firefox, Safari)
2. **IDE Plugins** (VS Code, IntelliJ, PyCharm, Visual Studio)
3. **API Gateway** (Kong, Apigee, AWS API Gateway)
4. **Proxy Chain** (Squid, NGINX, corporate proxy)
5. **Email Scanner** (detect AI service links in emails)
6. **SaaS Connectors** (Okta, Workday, Slack)
7. **Desktop Agent** (system-wide enforcement for Windows/Mac/Linux)

All enforcement points share a common architecture:
- **Policy SDK** (lightweight client library)
- **Decision caching** (reduce latency)
- **Offline fallback** (fail-open or fail-closed)
- **Audit logging** (async event upload)
- **Self-update** (auto-update to latest version)

---

## 1. Common Architecture

### 1.1 Enforcement Flow

```
┌─────────────────────────────────────────────────────────────┐
│  User Action                                                │
│  (Navigate to AI service / Send prompt / API call)         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Enforcement Point (Browser / IDE / Gateway / Proxy)        │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  1. Intercept request                                 │ │
│  │  2. Collect context (user, URL, content preview)     │ │
│  │  3. Check local cache for decision                   │ │
│  │  4. If cache miss, call Decision Engine (gRPC)       │ │
│  │  5. Receive decision (ALLOW / DENY / REVIEW)         │ │
│  │  6. Apply decision (block, allow, redirect)          │ │
│  │  7. Log event (async to audit service)               │ │
│  │  8. Show user notification (if blocked)              │ │
│  └───────────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   Decision Engine     │
         │   (gRPC / REST)       │
         └───────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   Audit Service       │
         │   (Async logging)     │
         └───────────────────────┘
```

### 1.2 Policy SDK (Shared Library)

**Available in**:
- JavaScript/TypeScript (browser, Node.js)
- Python (API servers, scripts)
- Go (microservices, proxies)
- Java/Kotlin (Android, enterprise apps)
- C#/.NET (Windows desktop)

**Core Interface**:

```typescript
interface PolicySDK {
  // Evaluate a request
  evaluate(request: EvaluateRequest): Promise<EvaluateResponse>;

  // Batch evaluation
  batchEvaluate(requests: EvaluateRequest[]): Promise<EvaluateResponse[]>;

  // Get cached decision
  getCachedDecision(key: string): EvaluateResponse | null;

  // Clear cache
  clearCache(): void;

  // Get current user context
  getCurrentUser(): UserContext;

  // Check SDK health
  healthCheck(): Promise<HealthStatus>;
}

interface EvaluateRequest {
  user: UserContext;
  action: string;  // "access_ai_service", "send_prompt", "api_call"
  resource: ResourceContext;
  context: AdditionalContext;
}

interface EvaluateResponse {
  decision: "ALLOW" | "DENY" | "REVIEW";
  reason: string;
  riskScore: number;
  policies: PolicyMatch[];
  explanation: Explanation;
  ttl: number;  // Cache TTL in seconds
}
```

**Implementation Example (TypeScript)**:

```typescript
// @company/ai-policy-sdk
import { AIPolicyClient } from '@company/ai-policy-sdk';

const client = new AIPolicyClient({
  endpoint: 'grpc://policy-engine.company.com:443',
  apiKey: process.env.AI_POLICY_API_KEY,
  cacheSize: 1000,
  cacheTTL: 300,  // 5 minutes
  offlineMode: 'fail-closed',
  logLevel: 'info'
});

// Evaluate request
const decision = await client.evaluate({
  user: {
    userId: 'user-123',
    email: 'user@company.com',
    department: 'engineering'
  },
  action: 'access_ai_service',
  resource: {
    type: 'ai_service',
    serviceId: 'chatgpt',
    url: 'https://chatgpt.com'
  },
  context: {
    source: 'browser_plugin',
    timestamp: Date.now(),
    deviceId: 'device-456'
  }
});

if (decision.decision === 'DENY') {
  // Block access, show explanation
  showBlockedNotification(decision.explanation);
}
```

---

## 2. Browser Extensions

### 2.1 Supported Browsers

- **Chrome** (Manifest V3)
- **Edge** (Chromium-based, Manifest V3)
- **Firefox** (WebExtensions API)
- **Safari** (Safari Web Extensions)

### 2.2 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser Extension                                          │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────┐ │
│  │  Background     │  │  Content        │  │  Popup UI  │ │
│  │  Service Worker │  │  Script         │  │            │ │
│  │                 │  │                 │  │            │ │
│  │  - Intercept    │  │  - Inject       │  │  - Show    │ │
│  │    requests     │  │    banner       │  │    status  │ │
│  │  - Call SDK     │  │  - Block forms  │  │  - Config  │ │
│  │  - Cache        │  │  - Redact PII   │  │  - Logs    │ │
│  └─────────────────┘  └─────────────────┘  └────────────┘ │
│           │                     │                   │      │
│           └─────────────────────┴───────────────────┘      │
│                             │                               │
│                   ┌─────────▼─────────┐                    │
│                   │  Policy SDK       │                    │
│                   │  (JavaScript)     │                    │
│                   └─────────┬─────────┘                    │
└─────────────────────────────┼─────────────────────────────┘
                              │
                              ▼
                    Decision Engine (gRPC-Web)
```

### 2.3 Implementation (Chrome/Edge - Manifest V3)

**manifest.json**:

```json
{
  "manifest_version": 3,
  "name": "AI Policy Enforcer",
  "version": "1.0.0",
  "description": "Enforces company AI governance policies",

  "permissions": [
    "webRequest",
    "webRequestBlocking",
    "storage",
    "tabs",
    "identity"
  ],

  "host_permissions": [
    "<all_urls>"
  ],

  "background": {
    "service_worker": "background.js",
    "type": "module"
  },

  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_start"
    }
  ],

  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  },

  "web_accessible_resources": [
    {
      "resources": ["blocked.html"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

**background.js** (Service Worker):

```javascript
import { AIPolicyClient } from '@company/ai-policy-sdk';

// Initialize SDK
const policyClient = new AIPolicyClient({
  endpoint: 'https://policy-engine.company.com',
  apiKey: await getApiKey(),
  cacheSize: 1000,
  cacheTTL: 300,
  offlineMode: 'fail-closed'
});

// Intercept web requests
chrome.webRequest.onBeforeRequest.addListener(
  async (details) => {
    const url = new URL(details.url);

    // Check if URL matches AI service signature
    const service = await identifyAIService(url);
    if (!service) {
      return { cancel: false };  // Not an AI service, allow
    }

    // Get user context
    const user = await getUserContext();

    // Evaluate policy
    const decision = await policyClient.evaluate({
      user,
      action: 'access_ai_service',
      resource: {
        type: 'ai_service',
        serviceId: service.id,
        url: url.href
      },
      context: {
        source: 'browser_plugin',
        timestamp: Date.now(),
        tabId: details.tabId
      }
    });

    if (decision.decision === 'DENY') {
      // Block request and show explanation
      chrome.tabs.update(details.tabId, {
        url: chrome.runtime.getURL('blocked.html') +
             '?reason=' + encodeURIComponent(decision.explanation)
      });
      return { cancel: true };
    }

    if (decision.decision === 'REVIEW') {
      // Redirect to review page
      chrome.tabs.update(details.tabId, {
        url: 'https://policy-portal.company.com/review?request=' + decision.requestId
      });
      return { cancel: true };
    }

    // ALLOW - let request through
    return { cancel: false };
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

// AI service identification
async function identifyAIService(url) {
  const aiServiceSignatures = await getAIServiceSignatures();

  for (const service of aiServiceSignatures) {
    for (const domain of service.domains) {
      if (url.hostname.includes(domain)) {
        return service;
      }
    }
  }

  return null;
}

// Get user context (from SSO)
async function getUserContext() {
  const identity = await chrome.identity.getProfileUserInfo();
  return {
    userId: identity.id,
    email: identity.email
  };
}
```

**content.js** (Content Script):

```javascript
// Inject warning banner on AI service pages
(function() {
  const aiServiceBanner = document.createElement('div');
  aiServiceBanner.id = 'ai-policy-banner';
  aiServiceBanner.innerHTML = `
    <div style="background: #fff3cd; padding: 10px; border-bottom: 2px solid #ffc107;">
      <strong>⚠️ AI Service Detected</strong>
      <p>Your usage is monitored per company AI governance policy.</p>
      <a href="https://policy-portal.company.com/guidelines">View guidelines</a>
    </div>
  `;
  document.body.prepend(aiServiceBanner);

  // Monitor form submissions for PII
  document.addEventListener('submit', async (e) => {
    const form = e.target;
    const content = extractFormContent(form);

    // Check for PII
    const piiCheck = await checkForPII(content);
    if (piiCheck.detected) {
      e.preventDefault();
      showPIIWarning(piiCheck.entities);
    }
  });
})();

async function checkForPII(content) {
  // Call PII detection API
  const response = await fetch('https://policy-engine.company.com/api/v1/classify-content', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getApiKey()}`
    },
    body: JSON.stringify({ content })
  });
  return response.json();
}
```

**blocked.html** (Block Page):

```html
<!DOCTYPE html>
<html>
<head>
  <title>Access Blocked - AI Policy</title>
  <style>
    body { font-family: system-ui; max-width: 600px; margin: 100px auto; }
    .blocked { background: #f8d7da; border: 2px solid #f5c6cb; padding: 20px; border-radius: 8px; }
    .reason { background: white; padding: 15px; margin: 15px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="blocked">
    <h1>🚫 Access Blocked</h1>
    <p>This AI service is blocked by your organization's AI governance policy.</p>

    <div class="reason">
      <h3>Reason:</h3>
      <p id="reason"></p>
    </div>

    <h3>What you can do:</h3>
    <ul>
      <li><a href="https://policy-portal.company.com/approved-services">View approved AI services</a></li>
      <li><a href="https://policy-portal.company.com/request-exception">Request an exception</a></li>
      <li><a href="mailto:ai-governance@company.com">Contact AI Governance Team</a></li>
    </ul>
  </div>

  <script>
    const params = new URLSearchParams(window.location.search);
    document.getElementById('reason').textContent = params.get('reason') || 'No reason provided';
  </script>
</body>
</html>
```

### 2.4 Firefox Implementation

Same logic, but using Firefox WebExtensions API. Key differences:
- Use `browser` namespace instead of `chrome`
- `manifest.json` has Firefox-specific fields

### 2.5 Deployment

**Enterprise Deployment**:
1. **Chrome/Edge**: Use Google Admin Console / Microsoft Intune to force-install extension
2. **Firefox**: Use GPO or `policies.json`
3. **Safari**: Use MDM (Mobile Device Management)

**Configuration**:
```json
{
  "policy_engine_url": "https://policy-engine.company.com",
  "api_key": "${MANAGED_BY_IT}",
  "offline_mode": "fail-closed",
  "update_url": "https://extensions.company.com/ai-policy/updates.xml"
}
```

---

## 3. IDE Plugins

### 3.1 Supported IDEs

- **Visual Studio Code** (TypeScript/JavaScript extension)
- **IntelliJ IDEA** (Java/Kotlin plugin)
- **PyCharm** (Python plugin)
- **Visual Studio** (C# extension)

### 3.2 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  IDE Plugin                                                 │
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐ │
│  │  Activation   │  │  Copilot      │  │  Terminal      │ │
│  │  Handler      │  │  Interceptor  │  │  Watcher       │ │
│  │               │  │               │  │                │ │
│  │  - On file    │  │  - Intercept  │  │  - Monitor     │ │
│  │    open       │  │    copilot    │  │    curl/API    │ │
│  │  - On save    │  │    requests   │  │    calls       │ │
│  │  - On paste   │  │  - Check code │  │                │ │
│  └───────────────┘  └───────────────┘  └────────────────┘ │
│           │                  │                   │         │
│           └──────────────────┴───────────────────┘         │
│                             │                               │
│                   ┌─────────▼─────────┐                    │
│                   │  Policy SDK       │                    │
│                   │  (Node.js)        │                    │
│                   └─────────┬─────────┘                    │
└─────────────────────────────┼─────────────────────────────┘
                              │
                              ▼
                    Decision Engine (gRPC)
```

### 3.3 VS Code Extension Implementation

**package.json**:

```json
{
  "name": "ai-policy-enforcer",
  "displayName": "AI Policy Enforcer",
  "version": "1.0.0",
  "publisher": "company",
  "engines": {
    "vscode": "^1.80.0"
  },
  "activationEvents": [
    "onStartupFinished"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "configuration": {
      "title": "AI Policy",
      "properties": {
        "aiPolicy.engineUrl": {
          "type": "string",
          "default": "https://policy-engine.company.com"
        },
        "aiPolicy.enabled": {
          "type": "boolean",
          "default": true
        }
      }
    },
    "commands": [
      {
        "command": "aiPolicy.checkCurrentFile",
        "title": "AI Policy: Check Current File"
      }
    ]
  }
}
```

**extension.ts**:

```typescript
import * as vscode from 'vscode';
import { AIPolicyClient } from '@company/ai-policy-sdk';

let policyClient: AIPolicyClient;

export function activate(context: vscode.ExtensionContext) {
  console.log('AI Policy Enforcer activated');

  // Initialize SDK
  const config = vscode.workspace.getConfiguration('aiPolicy');
  policyClient = new AIPolicyClient({
    endpoint: config.get('engineUrl'),
    apiKey: process.env.AI_POLICY_API_KEY
  });

  // Intercept Copilot requests
  interceptCopilot(context);

  // Monitor file opens (check for sensitive code)
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(checkDocument)
  );

  // Monitor paste events (check for PII)
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      checkForSensitiveContent(e.document);
    })
  );

  // Command: Manual check
  context.subscriptions.push(
    vscode.commands.registerCommand('aiPolicy.checkCurrentFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        await checkDocument(editor.document);
      }
    })
  );
}

async function interceptCopilot(context: vscode.ExtensionContext) {
  // Hook into Copilot extension (if installed)
  const copilotExt = vscode.extensions.getExtension('GitHub.copilot');
  if (!copilotExt) return;

  // Intercept Copilot API calls
  const originalFetch = global.fetch;
  global.fetch = async (...args) => {
    const url = args[0] as string;

    // Check if this is a Copilot request
    if (url.includes('copilot') || url.includes('github.com')) {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const decision = await checkCopilotUsage(editor.document);
        if (decision.decision === 'DENY') {
          vscode.window.showErrorMessage(
            `Copilot blocked: ${decision.reason}`
          );
          throw new Error('Copilot usage blocked by policy');
        }
      }
    }

    return originalFetch(...args);
  };
}

async function checkDocument(document: vscode.TextDocument) {
  const code = document.getText();
  const filePath = document.fileName;

  // Check if file contains proprietary markers
  const isProprietary =
    filePath.includes('internal/') ||
    code.includes('@proprietary') ||
    code.includes('CONFIDENTIAL');

  if (!isProprietary) return;

  // Evaluate policy
  const user = await getUserContext();
  const decision = await policyClient.evaluate({
    user,
    action: 'edit_proprietary_code',
    resource: {
      type: 'code_file',
      filePath,
      language: document.languageId
    },
    context: {
      source: 'vscode_plugin',
      isProprietary: true
    }
  });

  if (decision.decision === 'DENY') {
    vscode.window.showWarningMessage(
      `Policy warning: ${decision.reason}`,
      'View Policy'
    ).then(selection => {
      if (selection === 'View Policy') {
        vscode.env.openExternal(
          vscode.Uri.parse('https://policy-portal.company.com')
        );
      }
    });
  }
}

async function checkCopilotUsage(document: vscode.TextDocument) {
  const user = await getUserContext();
  return policyClient.evaluate({
    user,
    action: 'use_code_assistant',
    resource: {
      type: 'ai_service',
      serviceId: 'github-copilot',
      filePath: document.fileName
    },
    context: {
      source: 'vscode_plugin',
      language: document.languageId
    }
  });
}

async function getUserContext() {
  // Get user from Git config or SSO
  const gitConfig = await vscode.workspace.getConfiguration('git');
  const email = gitConfig.get('user.email') as string;

  return {
    userId: email,
    email: email
  };
}
```

### 3.4 IntelliJ Plugin Implementation

**plugin.xml**:

```xml
<idea-plugin>
  <id>com.company.ai-policy-enforcer</id>
  <name>AI Policy Enforcer</name>
  <version>1.0.0</version>
  <vendor>Company</vendor>

  <depends>com.intellij.modules.platform</depends>

  <extensions defaultExtensionNs="com.intellij">
    <applicationConfigurable instance="com.company.aipolicy.Settings"/>
    <fileEditorManagerListener implementation="com.company.aipolicy.FileOpenListener"/>
  </extensions>

  <actions>
    <action id="AiPolicy.CheckFile" class="com.company.aipolicy.CheckFileAction" text="Check AI Policy"/>
  </actions>
</idea-plugin>
```

**FileOpenListener.kt**:

```kotlin
package com.company.aipolicy

import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.FileEditorManagerListener
import com.intellij.openapi.vfs.VirtualFile
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch

class FileOpenListener : FileEditorManagerListener {
    override fun fileOpened(source: FileEditorManager, file: VirtualFile) {
        GlobalScope.launch {
            checkFile(file)
        }
    }

    private suspend fun checkFile(file: VirtualFile) {
        val content = String(file.contentsToByteArray())

        // Check for proprietary markers
        if (content.contains("@proprietary") || file.path.contains("internal/")) {
            val decision = PolicyClient.evaluate(
                action = "edit_proprietary_code",
                resource = mapOf(
                    "type" to "code_file",
                    "filePath" to file.path
                )
            )

            if (decision.decision == "DENY") {
                NotificationManager.showWarning(
                    "Policy Warning",
                    decision.reason
                )
            }
        }
    }
}
```

---

## 4. API Gateway Integration

### 4.1 Kong Plugin

**Custom Kong Plugin** (`ai-policy-enforcer/schema.lua`):

```lua
local typedefs = require "kong.db.schema.typedefs"

return {
  name = "ai-policy-enforcer",
  fields = {
    { config = {
        type = "record",
        fields = {
          { policy_engine_url = typedefs.url({ required = true }) },
          { api_key = { type = "string", required = true, encrypted = true } },
          { timeout = { type = "number", default = 1000 } },
          { cache_ttl = { type = "number", default = 300 } },
        },
      },
    },
  },
}
```

**Plugin Handler** (`ai-policy-enforcer/handler.lua`):

```lua
local http = require "resty.http"
local cjson = require "cjson"

local AIPolicyEnforcer = {
  VERSION = "1.0.0",
  PRIORITY = 1000,
}

function AIPolicyEnforcer:access(conf)
  local httpc = http.new()
  httpc:set_timeout(conf.timeout)

  -- Extract context
  local user = kong.client.get_credential()
  local service = kong.router.get_service()

  -- Build evaluation request
  local request_body = cjson.encode({
    user = {
      userId = user.id,
      email = user.email
    },
    action = "api_call",
    resource = {
      type = "ai_service",
      serviceId = service.id,
      url = kong.request.get_forwarded_scheme() .. "://" .. kong.request.get_forwarded_host() .. kong.request.get_path()
    },
    context = {
      source = "api_gateway",
      method = kong.request.get_method(),
      headers = kong.request.get_headers()
    }
  })

  -- Call Decision Engine
  local res, err = httpc:request_uri(conf.policy_engine_url .. "/api/v1/evaluate", {
    method = "POST",
    body = request_body,
    headers = {
      ["Content-Type"] = "application/json",
      ["Authorization"] = "Bearer " .. conf.api_key
    }
  })

  if not res then
    kong.log.err("Failed to call policy engine: ", err)
    -- Fail-closed: deny on error
    return kong.response.exit(503, { message = "Policy engine unavailable" })
  end

  local decision = cjson.decode(res.body)

  if decision.decision == "DENY" then
    return kong.response.exit(403, {
      message = "Access denied by AI governance policy",
      reason = decision.reason,
      request_id = decision.decisionId
    })
  end

  if decision.decision == "REVIEW" then
    return kong.response.exit(202, {
      message = "Manual review required",
      review_url = "https://policy-portal.company.com/review/" .. decision.decisionId
    })
  end

  -- ALLOW - continue to upstream
  kong.log.info("AI policy check passed: ", decision.decisionId)
end

return AIPolicyEnforcer
```

**Enable Plugin**:

```bash
curl -X POST http://kong:8001/services/openai-api/plugins \
  --data "name=ai-policy-enforcer" \
  --data "config.policy_engine_url=https://policy-engine.company.com" \
  --data "config.api_key=secret-key"
```

---

## 5. Proxy Chain Integration

### 5.1 Squid Proxy with ICAP

**ICAP Server** (Content Adaptation):

```python
# icap_ai_policy_server.py
from pyicap import ICAPServer, BaseICAPRequestHandler
import asyncio

class AIPolicyICAPHandler(BaseICAPRequestHandler):
    async def OPTIONS_reqmod(self):
        self.set_icap_response(200)
        self.set_icap_header('Methods', 'REQMOD')
        self.set_icap_header('Allow', '204')
        self.send_headers()

    async def REQMOD_reqmod(self):
        # Extract URL
        url = self.enc_req[0].decode()

        # Check if AI service
        service = await identify_ai_service(url)
        if not service:
            # Not an AI service, allow
            self.no_adaptation_required()
            return

        # Evaluate policy
        decision = await evaluate_policy(url, service)

        if decision['decision'] == 'DENY':
            # Block request
            self.set_icap_response(200)
            self.set_enc_status('HTTP/1.1 403 Forbidden')
            self.set_enc_header('Content-Type', 'text/html')

            block_page = f"""
            <html><body>
            <h1>Access Blocked</h1>
            <p>{decision['reason']}</p>
            </body></html>
            """
            self.send_headers()
            self.write(block_page.encode())
        else:
            # Allow request
            self.no_adaptation_required()

if __name__ == '__main__':
    server = ICAPServer(('0.0.0.0', 1344), AIPolicyICAPHandler)
    server.serve_forever()
```

**Squid Configuration** (`squid.conf`):

```
# ICAP service for AI policy
icap_enable on
icap_service ai_policy reqmod_precache icap://127.0.0.1:1344/reqmod
adaptation_access ai_policy allow all

# ACL for AI services (backup)
acl ai_services dstdomain .openai.com .anthropic.com .chatgpt.com
http_access deny ai_services
```

---

## 6. Desktop Agent

### 6.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Desktop Agent (System Service)                             │
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐ │
│  │  Network      │  │  Process      │  │  Clipboard     │ │
│  │  Monitor      │  │  Monitor      │  │  Monitor       │ │
│  │               │  │               │  │                │ │
│  │  - Intercept  │  │  - Detect AI  │  │  - Scan for    │ │
│  │    DNS        │  │    apps       │  │    PII         │ │
│  │  - Filter     │  │  - Block      │  │  - Redact      │ │
│  │    traffic    │  │    launch     │  │                │ │
│  └───────────────┘  └───────────────┘  └────────────────┘ │
│           │                  │                   │         │
│           └──────────────────┴───────────────────┘         │
│                             │                               │
│                   ┌─────────▼─────────┐                    │
│                   │  Policy SDK       │                    │
│                   │  (Native)         │                    │
│                   └─────────┬─────────┘                    │
└─────────────────────────────┼─────────────────────────────┘
                              │
                              ▼
                    Decision Engine (gRPC)
```

### 6.2 Implementation (Windows - C#)

```csharp
// WindowsAgentService.cs
using System;
using System.ServiceProcess;
using System.Net;
using System.Diagnostics;

namespace AIPolicyAgent
{
    public class WindowsAgentService : ServiceBase
    {
        private PolicyClient policyClient;
        private NetworkMonitor networkMonitor;
        private ProcessMonitor processMonitor;

        public WindowsAgentService()
        {
            ServiceName = "AIPolicyAgent";
        }

        protected override void OnStart(string[] args)
        {
            // Initialize policy client
            policyClient = new PolicyClient(
                endpoint: "policy-engine.company.com:443",
                apiKey: GetApiKeyFromRegistry()
            );

            // Start network monitoring
            networkMonitor = new NetworkMonitor(policyClient);
            networkMonitor.Start();

            // Start process monitoring
            processMonitor = new ProcessMonitor(policyClient);
            processMonitor.Start();
        }

        protected override void OnStop()
        {
            networkMonitor.Stop();
            processMonitor.Stop();
        }
    }

    public class NetworkMonitor
    {
        private PolicyClient policyClient;

        public void Start()
        {
            // Hook DNS requests
            DnsHook.Install(OnDnsRequest);
        }

        private DnsResponse OnDnsRequest(DnsRequest request)
        {
            // Check if domain is AI service
            var service = IdentifyAIService(request.Domain);
            if (service == null)
                return DnsResponse.Allow();

            // Evaluate policy
            var decision = policyClient.Evaluate(new EvaluateRequest
            {
                Action = "access_ai_service",
                Resource = new Resource
                {
                    ServiceId = service.Id,
                    Domain = request.Domain
                }
            }).Result;

            if (decision.Decision == "DENY")
            {
                // Block DNS resolution
                return DnsResponse.Block();
            }

            return DnsResponse.Allow();
        }
    }

    public class ProcessMonitor
    {
        public void Start()
        {
            // Monitor process launches
            var watcher = new ManagementEventWatcher(
                "SELECT * FROM Win32_ProcessStartTrace"
            );
            watcher.EventArrived += OnProcessStart;
            watcher.Start();
        }

        private void OnProcessStart(object sender, EventArrivedEventArgs e)
        {
            string processName = e.NewEvent.Properties["ProcessName"].Value.ToString();

            // Check if process is AI app (e.g., ChatGPT desktop app)
            if (IsAIApp(processName))
            {
                // Evaluate policy
                var decision = policyClient.Evaluate(...);

                if (decision.Decision == "DENY")
                {
                    // Kill process
                    int pid = (int)e.NewEvent.Properties["ProcessID"].Value;
                    Process.GetProcessById(pid).Kill();

                    // Show notification
                    ShowNotification("AI app blocked by policy");
                }
            }
        }
    }
}
```

---

## 7. Email Scanner

### 7.1 Microsoft Exchange / Office 365

**Exchange Transport Rule**:

```powershell
New-TransportRule -Name "AI Service Link Detection" `
  -SubjectOrBodyContainsWords @("chatgpt.com", "claude.ai", "bard.google.com") `
  -SetHeaderName "X-AI-Policy-Scan" `
  -SetHeaderValue "Required"
```

**Custom Transport Agent**:

```csharp
public class AIPolicyTransportAgent : RoutingAgent
{
    public override void OnResolvedMessage(ResolvedMessageEventSource source, QueuedMessageEventArgs e)
    {
        EmailMessage message = e.MailItem.Message;

        // Scan for AI service URLs
        var aiLinks = ScanForAIServiceLinks(message.Body.ToString());

        if (aiLinks.Any())
        {
            // Evaluate policy
            var decision = policyClient.Evaluate(...);

            if (decision.Decision == "DENY")
            {
                // Quarantine email
                e.MailItem.Quarantine("AI service links prohibited by policy");
            }
            else
            {
                // Add warning banner
                AddWarningBanner(message, aiLinks);
            }
        }
    }
}
```

---

## 8. Deployment & Updates

### 8.1 Auto-Update Mechanism

All enforcement points support auto-update:

```json
{
  "update_manifest": {
    "version": "1.2.0",
    "release_date": "2025-01-29",
    "download_url": "https://updates.company.com/ai-policy-plugin/1.2.0",
    "checksum": "sha256:abc123...",
    "required": true,
    "rollout_percentage": 10
  }
}
```

**Update Check** (every 24 hours):

```typescript
async function checkForUpdates() {
  const manifest = await fetch('https://updates.company.com/manifest.json');
  const data = await manifest.json();

  if (semver.gt(data.version, currentVersion)) {
    if (data.required) {
      // Force update
      await downloadAndInstall(data.download_url);
    } else {
      // Prompt user
      showUpdateNotification(data);
    }
  }
}
```

### 8.2 Centralized Configuration

All plugins pull config from central server:

```json
{
  "policy_engine_url": "https://policy-engine.company.com",
  "api_key_encrypted": "...",
  "offline_mode": "fail-closed",
  "cache_ttl": 300,
  "log_level": "info",
  "enabled_features": [
    "pii_detection",
    "proprietary_code_check",
    "real_time_blocking"
  ]
}
```

---

## 9. Summary

**Enforcement Coverage**:
- ✓ Browser (Chrome, Edge, Firefox, Safari)
- ✓ IDE (VS Code, IntelliJ, PyCharm, Visual Studio)
- ✓ API Gateway (Kong, Apigee)
- ✓ Proxy (Squid, NGINX)
- ✓ Email (Exchange, Office 365)
- ✓ Desktop (Windows, macOS, Linux agents)

**Key Features**:
- Unified SDK across all enforcement points
- Real-time policy evaluation (<100ms)
- Decision caching for performance
- Offline fallback (fail-open or fail-closed)
- Auto-update mechanism
- Centralized configuration
- Comprehensive audit logging

**Next Document**: Integration Patterns (CrowdStrike, SentinelOne, Netskope, ServiceNow, etc.)
