# Policy Definition Language
## Enterprise AI Policy Management and Enforcement Platform

---

## Overview

This document defines the **Policy Definition Language (PDL)** for the AI Policy Management Platform. Policies are written in **YAML** format and compiled to executable rules using **Open Policy Agent (OPA Rego)** or **AWS Cedar**.

The PDL supports four policy categories:
1. **Regulatory policies** (EU AI Act, NIST AI RMF, ISO 42001)
2. **Organizational risk policies** (company-specific rules)
3. **Technical policies** (infrastructure and security controls)
4. **Business function policies** (department or role-specific rules)

---

## 1. Policy Schema

### 1.1 YAML Structure

```yaml
apiVersion: policy.ai-governance.io/v1
kind: Policy
metadata:
  id: uuid  # Auto-generated if not provided
  name: string (required)
  description: string (required)
  version: semver (required, e.g., 1.0.0)
  labels:
    framework: string  # EU_AI_ACT, NIST_AI_RMF, ISO_42001, etc.
    policy_type: string  # regulatory, organizational, technical, business_function
    severity: string  # low, medium, high, critical
    article_reference: string  # Article 5, GOVERN-1.1, etc.
  tags: [string]  # searchable keywords

spec:
  priority: integer  # 0-1000, higher = evaluated first
  enabled: boolean  # default: true

  # Who does this apply to?
  scope:
    departments: [string]  # Department IDs or names, empty = all
    users: [string]  # User IDs or emails, empty = all
    groups: [string]  # Group IDs or names, empty = all
    roles: [string]  # Role names, empty = all
    exclude:
      users: [string]
      groups: [string]

  # What resources does this apply to?
  resources:
    ai_services: [string]  # Service IDs, names, or patterns
    categories: [string]  # llm, image_generation, code_assistant, etc.
    risk_tiers: [string]  # low, medium, high, critical
    vendors: [string]  # OpenAI, Anthropic, Google, etc.

  # When does this apply?
  conditions:
    time_windows:  # Optional time-based restrictions
      - days: [monday, tuesday, wednesday, thursday, friday]
        start_time: "09:00"
        end_time: "17:00"
        timezone: "America/New_York"
    locations: [string]  # Geo-locations (US, EU, etc.)
    data_classifications: [string]  # PII, PHI, financial, etc.

  # Rules (OPA Rego or Cedar)
  rules:
    engine: opa  # or cedar
    inline: |
      # Rego code here (see examples below)
    # OR
    file: policies/eu-ai-act-article-5.rego  # External file

  # Decision
  decision:
    default: DENY  # ALLOW, DENY, REVIEW
    on_error: DENY  # What to do if rule evaluation fails
    explanation_template: string  # User-facing explanation

  # Compliance mapping
  compliance:
    frameworks:
      - framework: EU_AI_ACT
        controls:
          - article: "Article 5"
            description: "Prohibited AI practices"
      - framework: NIST_AI_RMF
        controls:
          - function: GOVERN
            category: "GOVERN-1"
            subcategory: "GOVERN-1.1"

  # Lifecycle
  lifecycle:
    effective_from: timestamp
    effective_until: timestamp  # Optional expiry
    review_interval: duration  # e.g., 90d, 1y

  # Notifications
  notifications:
    on_violation:
      channels: [email, slack, pagerduty]
      recipients: [string]  # User IDs or email addresses
      severity_threshold: medium  # Only notify on medium+ violations
```

---

## 2. Regulatory Policies

### 2.1 EU AI Act - Article 5 (Prohibited AI Practices)

```yaml
apiVersion: policy.ai-governance.io/v1
kind: Policy
metadata:
  id: eu-ai-act-article-5-prohibited
  name: "EU AI Act - Prohibited AI Systems"
  description: "Blocks access to AI systems prohibited under EU AI Act Article 5"
  version: "1.0.0"
  labels:
    framework: EU_AI_ACT
    policy_type: regulatory
    severity: critical
    article_reference: "Article 5"
  tags:
    - eu-ai-act
    - prohibition
    - high-risk

spec:
  priority: 1000  # Highest priority
  enabled: true

  scope:
    departments: []  # Applies to all
    users: []
    exclude:
      users: []

  resources:
    ai_services: []  # All AI services
    categories: []
    risk_tiers: [critical, high]

  rules:
    engine: opa
    inline: |
      package eu_ai_act.article_5

      import future.keywords.if
      import future.keywords.in

      default allow = false
      default deny = false

      # Deny: Social scoring AI systems
      deny if {
        "social_scoring" in input.resource.capabilities
      }

      # Deny: Real-time biometric identification in public spaces
      deny if {
        "biometric_identification" in input.resource.capabilities
        input.context.location_type == "public_space"
        input.context.real_time == true
      }

      # Deny: Subliminal manipulation
      deny if {
        "subliminal_manipulation" in input.resource.capabilities
      }

      # Deny: Exploitation of vulnerabilities (age, disability)
      deny if {
        "vulnerability_exploitation" in input.resource.capabilities
      }

      # Final decision
      decision := "DENY" if deny else "ALLOW"
      reason := "AI system prohibited under EU AI Act Article 5" if deny else "Allowed"

  decision:
    default: DENY
    on_error: DENY
    explanation_template: |
      This AI system is prohibited under EU AI Act Article 5.
      Prohibited AI practices include social scoring, real-time biometric
      identification in public spaces, and exploitation of vulnerabilities.

  compliance:
    frameworks:
      - framework: EU_AI_ACT
        controls:
          - article: "Article 5"
            description: "Prohibited artificial intelligence practices"

  lifecycle:
    effective_from: "2025-02-01T00:00:00Z"
    effective_until: null
    review_interval: "365d"

  notifications:
    on_violation:
      channels: [email, slack, pagerduty]
      recipients:
        - compliance@company.com
        - ciso@company.com
      severity_threshold: critical
```

### 2.2 EU AI Act - Article 52 (Transparency Obligations)

```yaml
apiVersion: policy.ai-governance.io/v1
kind: Policy
metadata:
  id: eu-ai-act-article-52-transparency
  name: "EU AI Act - Transparency Obligations"
  description: "Requires disclosure when interacting with AI systems"
  version: "1.0.0"
  labels:
    framework: EU_AI_ACT
    policy_type: regulatory
    severity: high
    article_reference: "Article 52"

spec:
  priority: 900
  enabled: true

  scope:
    departments: []  # All departments

  resources:
    categories: [chatbot, virtual_assistant, content_generation]

  rules:
    engine: opa
    inline: |
      package eu_ai_act.article_52

      import future.keywords.if

      default allow = false
      default review = false

      # Review required if transparency not disclosed
      review if {
        input.resource.category in ["chatbot", "virtual_assistant", "content_generation"]
        not transparency_disclosed
      }

      transparency_disclosed if {
        input.context.transparency_banner_shown == true
      }

      transparency_disclosed if {
        input.resource.metadata.transparency_compliant == true
      }

      decision := "REVIEW" if review else "ALLOW"
      reason := "Transparency disclosure required under EU AI Act Article 52" if review else "Allowed"

  decision:
    default: REVIEW
    on_error: REVIEW
    explanation_template: |
      EU AI Act Article 52 requires transparency when interacting with AI systems.
      Users must be informed that they are interacting with an AI system.

  compliance:
    frameworks:
      - framework: EU_AI_ACT
        controls:
          - article: "Article 52"
            description: "Transparency obligations for certain AI systems"
```

### 2.3 NIST AI RMF - GOVERN Function

```yaml
apiVersion: policy.ai-governance.io/v1
kind: Policy
metadata:
  id: nist-ai-rmf-govern-1-1
  name: "NIST AI RMF - Governance Structure"
  description: "Ensures AI usage follows documented governance policies"
  version: "1.0.0"
  labels:
    framework: NIST_AI_RMF
    policy_type: regulatory
    severity: high
    article_reference: "GOVERN-1.1"

spec:
  priority: 850
  enabled: true

  scope:
    departments: []

  resources:
    ai_services: []

  rules:
    engine: opa
    inline: |
      package nist_ai_rmf.govern

      import future.keywords.if

      default allow = false
      default deny = false

      # Deny if user hasn't completed AI governance training
      deny if {
        not user_completed_training
      }

      user_completed_training if {
        input.user.training_status.ai_governance == "completed"
        training_date := time.parse_rfc3339_ns(input.user.training_status.completion_date)
        now := time.now_ns()
        # Training valid for 1 year
        now - training_date < (365 * 24 * 60 * 60 * 1000000000)
      }

      # Deny if AI service not in approved inventory
      deny if {
        not service_approved
      }

      service_approved if {
        input.resource.service_id in data.approved_services
      }

      decision := "DENY" if deny else "ALLOW"
      reason := "User must complete AI governance training and use approved services" if deny else "Allowed"

  decision:
    default: DENY
    on_error: DENY
    explanation_template: |
      NIST AI RMF GOVERN-1.1 requires:
      1. All users complete AI governance training (annually)
      2. AI services must be in approved inventory

  compliance:
    frameworks:
      - framework: NIST_AI_RMF
        controls:
          - function: GOVERN
            category: "GOVERN-1"
            subcategory: "GOVERN-1.1"
            description: "Policies, processes, and procedures established and communicated"
```

---

## 3. Organizational Risk Policies

### 3.1 No PII to External GenAI

```yaml
apiVersion: policy.ai-governance.io/v1
kind: Policy
metadata:
  id: org-policy-no-pii-external-genai
  name: "No PII to External GenAI Services"
  description: "Blocks sending PII to external generative AI services"
  version: "2.1.0"
  labels:
    policy_type: organizational
    severity: high
  tags:
    - pii
    - data-protection
    - genai

spec:
  priority: 950
  enabled: true

  scope:
    departments: []  # All departments
    exclude:
      users:
        - privacy-team@company.com  # Exception for privacy team testing

  resources:
    categories: [llm, chatbot, content_generation]

  conditions:
    data_classifications: [PII, PHI, financial, confidential]

  rules:
    engine: opa
    inline: |
      package organizational.data_protection

      import future.keywords.if
      import future.keywords.in

      default allow = false
      default deny = false

      # Deny if PII detected in content
      deny if {
        pii_detected
        external_service
      }

      pii_detected if {
        count(input.context.detected_entities) > 0
        some entity in input.context.detected_entities
        entity.type in ["SSN", "EMAIL", "PHONE", "ADDRESS", "CREDIT_CARD", "DOB"]
      }

      pii_detected if {
        some classification in input.context.data_classifications
        classification in ["PII", "PHI", "financial"]
      }

      external_service if {
        input.resource.data_handling in ["trains_on_data", "retains_data"]
      }

      external_service if {
        not input.resource.deployment_type == "on_premise"
      }

      decision := "DENY" if deny else "ALLOW"

      reason := sprintf(
        "Detected %v PII entities: %v. Policy prohibits sending PII to external GenAI services.",
        [count(input.context.detected_entities), [e.type | e := input.context.detected_entities[_]]]
      ) if deny else "No PII detected"

  decision:
    default: DENY
    on_error: DENY
    explanation_template: |
      **Policy Violation: PII Detected**

      Your content contains Personally Identifiable Information (PII):
      {{detected_entities}}

      Company policy prohibits sending PII to external GenAI services to prevent:
      - Data exfiltration
      - Compliance violations (GDPR, CCPA, HIPAA)
      - Unauthorized data training

      **Alternatives:**
      - Use internal AI services (Copilot Enterprise with data residency)
      - Redact PII before sending
      - Request exception from privacy@company.com

  compliance:
    frameworks:
      - framework: ISO_27001
        controls:
          - control: "A.8.2.3"
            description: "Handling of assets"
      - framework: ISO_27701
        controls:
          - control: "7.2.2"
            description: "Identify legal basis for PII processing"

  lifecycle:
    effective_from: "2024-06-01T00:00:00Z"
    review_interval: "180d"

  notifications:
    on_violation:
      channels: [email, slack]
      recipients:
        - privacy@company.com
        - ${user.manager}
      severity_threshold: high
```

### 3.2 Crown Jewel Protection

```yaml
apiVersion: policy.ai-governance.io/v1
kind: Policy
metadata:
  id: org-policy-crown-jewel-protection
  name: "Crown Jewel Asset Protection"
  description: "Enhanced protection for crown jewel assets accessing AI services"
  version: "1.0.0"
  labels:
    policy_type: organizational
    severity: critical

spec:
  priority: 980
  enabled: true

  scope:
    departments: []

  resources:
    ai_services: []

  conditions: {}

  rules:
    engine: opa
    inline: |
      package organizational.crown_jewel_protection

      import future.keywords.if

      default allow = false
      default deny = false

      # Deny if accessing from crown jewel asset without enhanced controls
      deny if {
        input.context.asset.crown_jewel == true
        not enhanced_controls_met
      }

      enhanced_controls_met if {
        # Must have EDR agent
        input.context.asset.edr_agent_installed == true
        # Must be compliant
        input.context.asset.compliance_status == "compliant"
        # Must use MFA
        input.user.mfa_enabled == true
        # Must use approved service only
        input.resource.approval_status == "approved"
      }

      decision := "DENY" if deny else "ALLOW"
      reason := "Crown jewel asset requires enhanced controls (EDR, MFA, compliance, approved service)" if deny else "Allowed"

  decision:
    default: DENY
    on_error: DENY
    explanation_template: |
      **Crown Jewel Asset Detected**

      You are accessing AI services from a crown jewel asset (high-value system).
      Additional security controls are required:

      ✓ EDR agent installed and active
      ✓ Device compliance status: Compliant
      ✓ Multi-factor authentication enabled
      ✓ AI service must be pre-approved

      Contact security@company.com for assistance.

  notifications:
    on_violation:
      channels: [email, pagerduty]
      recipients:
        - security@company.com
        - soc@company.com
      severity_threshold: critical
```

---

## 4. Technical Policies

### 4.1 API Gateway Enforcement

```yaml
apiVersion: policy.ai-governance.io/v1
kind: Policy
metadata:
  id: tech-policy-api-gateway-enforcement
  name: "API Gateway Enforcement"
  description: "All external AI API calls must route through enterprise API gateway"
  version: "1.0.0"
  labels:
    policy_type: technical
    severity: high

spec:
  priority: 900
  enabled: true

  scope:
    departments: [engineering, data-science]

  resources:
    categories: [llm, image_generation]

  rules:
    engine: opa
    inline: |
      package technical.api_gateway

      import future.keywords.if

      default allow = false
      default deny = false

      # Deny if not using enterprise API gateway
      deny if {
        input.action == "api_call"
        not via_enterprise_gateway
      }

      via_enterprise_gateway if {
        input.context.source == "api_gateway"
      }

      via_enterprise_gateway if {
        # Check if request has enterprise gateway header
        input.context.headers["X-Enterprise-Gateway"] == "true"
      }

      decision := "DENY" if deny else "ALLOW"
      reason := "API calls to external AI services must route through enterprise API gateway" if deny else "Allowed"

  decision:
    default: DENY
    on_error: DENY
    explanation_template: |
      **Policy: API Gateway Required**

      Direct API calls to external AI services are not permitted.
      All calls must route through the enterprise API gateway.

      **Benefits:**
      - Centralized authentication
      - Rate limiting
      - Cost tracking
      - Audit logging

      **How to configure:**
      ```python
      from enterprise_ai_sdk import Client

      client = Client(
          api_key=os.getenv("ENTERPRISE_API_KEY"),
          gateway_url="https://api-gateway.company.com"
      )

      response = client.openai.completions.create(...)
      ```

  compliance:
    frameworks:
      - framework: ISO_27001
        controls:
          - control: "A.13.1.3"
            description: "Segregation in networks"
```

### 4.2 Model Version Control

```yaml
apiVersion: policy.ai-governance.io/v1
kind: Policy
metadata:
  id: tech-policy-approved-model-versions
  name: "Approved Model Versions Only"
  description: "Only approved model versions can be used in production"
  version: "1.0.0"
  labels:
    policy_type: technical
    severity: medium

spec:
  priority: 700
  enabled: true

  scope:
    departments: [engineering]

  resources:
    ai_services: []

  conditions:
    # Only apply in production environment
    environments: [production]

  rules:
    engine: opa
    inline: |
      package technical.model_version_control

      import future.keywords.if

      default allow = false
      default deny = false

      # Deny if model version not approved
      deny if {
        input.context.environment == "production"
        not model_version_approved
      }

      model_version_approved if {
        input.resource.model_version in data.approved_model_versions[input.resource.service]
      }

      decision := "DENY" if deny else "ALLOW"
      reason := sprintf(
        "Model version %v not approved for production. Approved versions: %v",
        [input.resource.model_version, data.approved_model_versions[input.resource.service]]
      ) if deny else "Allowed"

  decision:
    default: ALLOW  # Allow in non-production
    on_error: DENY
    explanation_template: |
      **Model Version Not Approved**

      The model version you're using is not approved for production.

      Approved versions for {{service}}:
      {{approved_versions}}

      To request approval for a new model version:
      1. Test in dev/staging environments
      2. Complete model evaluation checklist
      3. Submit approval request to ai-governance@company.com
```

---

## 5. Business Function Policies

### 5.1 Marketing Department - Approved Services

```yaml
apiVersion: policy.ai-governance.io/v1
kind: Policy
metadata:
  id: biz-policy-marketing-approved-services
  name: "Marketing - Approved AI Services"
  description: "Marketing department can only use pre-approved AI services"
  version: "1.0.0"
  labels:
    policy_type: business_function
    severity: medium
  tags:
    - marketing
    - content-generation

spec:
  priority: 600
  enabled: true

  scope:
    departments: [marketing, communications]

  resources:
    ai_services: []

  rules:
    engine: opa
    inline: |
      package business_function.marketing

      import future.keywords.if
      import future.keywords.in

      default allow = false

      # Marketing approved services
      marketing_approved_services := [
        "jasper",
        "copy-ai",
        "canva-ai",
        "grammarly",
        "chatgpt-team"  # Team plan with data protection
      ]

      allow if {
        input.user.department in ["marketing", "communications"]
        lower(input.resource.name) in marketing_approved_services
      }

      # Also allow if service is in user's group approved list
      allow if {
        some group in input.user.groups
        input.resource.service_id in data.group_approved_services[group]
      }

      decision := "ALLOW" if allow else "DENY"
      reason := sprintf(
        "Marketing approved services: %v. Requested: %v",
        [marketing_approved_services, input.resource.name]
      ) if not allow else "Approved service for marketing"

  decision:
    default: DENY
    on_error: DENY
    explanation_template: |
      **Marketing Department Policy**

      Your department can use these AI services:
      - Jasper (content generation)
      - Copy.ai (copywriting)
      - Canva AI (image generation)
      - Grammarly (writing assistant)
      - ChatGPT Team (with data protection)

      To request additional services:
      - marketing-ops@company.com

  notifications:
    on_violation:
      channels: [slack]
      recipients:
        - marketing-ops@company.com
      severity_threshold: medium
```

### 5.2 Engineering - Code Assistant Restrictions

```yaml
apiVersion: policy.ai-governance.io/v1
kind: Policy
metadata:
  id: biz-policy-engineering-code-assistants
  name: "Engineering - Code Assistant Restrictions"
  description: "Code assistants must not send proprietary code to external services"
  version: "1.0.0"
  labels:
    policy_type: business_function
    severity: high

spec:
  priority: 850
  enabled: true

  scope:
    departments: [engineering, data-science]

  resources:
    categories: [code_assistant]

  rules:
    engine: opa
    inline: |
      package business_function.engineering

      import future.keywords.if

      default allow = false
      default deny = false

      # Deny if proprietary code detected
      deny if {
        proprietary_code_detected
        not approved_code_assistant
      }

      proprietary_code_detected if {
        # Check for proprietary markers
        some marker in ["@proprietary", "@confidential", "CONFIDENTIAL"]
        contains(input.context.code_content, marker)
      }

      proprietary_code_detected if {
        # Check file path (e.g., internal/ directory)
        contains(input.context.file_path, "internal/")
      }

      proprietary_code_detected if {
        # Check data classification
        "proprietary" in input.context.data_classifications
      }

      approved_code_assistant if {
        # GitHub Copilot Enterprise with IP protection
        input.resource.name == "github-copilot"
        input.resource.plan == "enterprise"
      }

      approved_code_assistant if {
        # Internal code assistant
        input.resource.deployment_type == "on_premise"
      }

      decision := "DENY" if deny else "ALLOW"
      reason := "Proprietary code detected. Use GitHub Copilot Enterprise or internal code assistant." if deny else "Allowed"

  decision:
    default: DENY
    on_error: DENY
    explanation_template: |
      **Proprietary Code Detected**

      Your code contains proprietary markers or is in a confidential directory.

      **Approved code assistants for proprietary code:**
      - GitHub Copilot Enterprise (with IP protection)
      - Internal Code Assistant (code-assist.company.com)

      **Detected:**
      - File: {{file_path}}
      - Classification: {{data_classification}}

  compliance:
    frameworks:
      - framework: ISO_27001
        controls:
          - control: "A.8.2.1"
            description: "Classification of information"
```

---

## 6. Composite Policies (Combining Multiple Rules)

### 6.1 Comprehensive AI Access Policy

```yaml
apiVersion: policy.ai-governance.io/v1
kind: Policy
metadata:
  id: composite-ai-access-comprehensive
  name: "Comprehensive AI Access Policy"
  description: "Combines multiple checks: training, PII, approved service, technical controls"
  version: "1.0.0"
  labels:
    policy_type: organizational
    severity: high

spec:
  priority: 900
  enabled: true

  scope:
    departments: []

  resources:
    ai_services: []

  rules:
    engine: opa
    inline: |
      package composite.comprehensive_access

      import future.keywords.if
      import future.keywords.in

      default allow = false
      default deny = false
      default review = false

      # Check 1: User must have completed training
      deny if {
        not user_training_valid
      }

      user_training_valid if {
        input.user.training_status.ai_governance == "completed"
        training_date := time.parse_rfc3339_ns(input.user.training_status.completion_date)
        now := time.now_ns()
        now - training_date < (365 * 24 * 60 * 60 * 1000000000)
      }

      # Check 2: No PII to external services
      deny if {
        pii_detected
        external_service
      }

      pii_detected if {
        count(input.context.detected_entities) > 0
      }

      external_service if {
        not input.resource.deployment_type == "on_premise"
      }

      # Check 3: Service must be approved
      deny if {
        not service_approved
      }

      service_approved if {
        input.resource.approval_status == "approved"
      }

      # Check 4: High-risk services require review
      review if {
        input.resource.risk_tier in ["high", "critical"]
        input.action == "access_ai_service"
      }

      # Check 5: Crown jewel assets require MFA
      deny if {
        input.context.asset.crown_jewel == true
        not input.user.mfa_enabled == true
      }

      # Check 6: Compliance with data residency
      deny if {
        not data_residency_compliant
      }

      data_residency_compliant if {
        # If user in EU, service must have EU region
        input.user.region == "EU"
        "eu-west" in input.resource.data_regions
      }

      data_residency_compliant if {
        # Non-EU users don't have this restriction
        not input.user.region == "EU"
      }

      # Final decision
      decision := "DENY" if deny else (
        "REVIEW" if review else "ALLOW"
      )

      reasons := [reason |
        deny_reason = [
          {"condition": not user_training_valid, "msg": "User training not completed or expired"},
          {"condition": pii_detected, "msg": "PII detected in content"},
          {"condition": not service_approved, "msg": "Service not approved"},
          {"condition": input.context.asset.crown_jewel and not input.user.mfa_enabled, "msg": "MFA required for crown jewel assets"},
          {"condition": not data_residency_compliant, "msg": "Data residency requirements not met"}
        ]
        reason := deny_reason[_].msg
        deny_reason[_].condition
      ]

      reason := concat("; ", reasons) if count(reasons) > 0 else "Allowed"

  decision:
    default: DENY
    on_error: DENY
    explanation_template: |
      **Comprehensive AI Access Check**

      {{#if denied}}
      **Access Denied. Reasons:**
      {{reasons}}

      **Remediation Steps:**
      1. Complete AI governance training (if expired)
      2. Remove PII from content
      3. Use approved AI services only
      4. Enable MFA for crown jewel assets
      5. Ensure data residency compliance
      {{/if}}

      {{#if review_required}}
      **Manual Review Required**
      This is a high-risk AI service. Your request has been sent for approval.
      {{/if}}

  compliance:
    frameworks:
      - framework: EU_AI_ACT
        controls:
          - article: "Article 9"
            description: "Risk management system"
      - framework: NIST_AI_RMF
        controls:
          - function: GOVERN
            category: "GOVERN-1.1"
      - framework: ISO_27001
        controls:
          - control: "A.8.2.3"
```

---

## 7. Policy Testing

### 7.1 Test Cases (OPA format)

```rego
package composite.comprehensive_access_test

import future.keywords.if
import data.composite.comprehensive_access

# Test: User without training should be denied
test_deny_without_training if {
    input := {
        "user": {
            "user_id": "user-123",
            "training_status": {"ai_governance": "not_started"}
        },
        "resource": {
            "service_id": "service-456",
            "approval_status": "approved"
        },
        "context": {}
    }
    comprehensive_access.decision == "DENY" with input as input
}

# Test: PII to external service should be denied
test_deny_pii_external if {
    input := {
        "user": {
            "training_status": {
                "ai_governance": "completed",
                "completion_date": "2024-06-01T00:00:00Z"
            }
        },
        "resource": {
            "approval_status": "approved",
            "deployment_type": "cloud"
        },
        "context": {
            "detected_entities": [
                {"type": "SSN", "value": "***-**-6789"}
            ]
        }
    }
    comprehensive_access.decision == "DENY" with input as input
}

# Test: High-risk service should trigger review
test_review_high_risk if {
    input := {
        "user": {
            "training_status": {
                "ai_governance": "completed",
                "completion_date": "2024-06-01T00:00:00Z"
            }
        },
        "resource": {
            "approval_status": "approved",
            "risk_tier": "high"
        },
        "action": "access_ai_service",
        "context": {}
    }
    comprehensive_access.decision == "REVIEW" with input as input
}

# Test: Valid access should be allowed
test_allow_valid_access if {
    input := {
        "user": {
            "training_status": {
                "ai_governance": "completed",
                "completion_date": "2024-06-01T00:00:00Z"
            },
            "region": "US"
        },
        "resource": {
            "approval_status": "approved",
            "risk_tier": "low",
            "deployment_type": "cloud"
        },
        "action": "access_ai_service",
        "context": {}
    }
    comprehensive_access.decision == "ALLOW" with input as input
}
```

Run tests:
```bash
opa test policies/ -v
```

---

## 8. Policy Deployment Workflow

### 8.1 Development Workflow

```yaml
# .github/workflows/policy-ci.yml
name: Policy CI/CD

on:
  pull_request:
    paths:
      - 'policies/**'
  push:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate YAML
        run: |
          yamllint policies/

      - name: Validate Policy Schema
        run: |
          python scripts/validate_policy_schema.py policies/

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install OPA
        run: |
          curl -L -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64
          chmod +x opa

      - name: Run Policy Tests
        run: |
          ./opa test policies/ -v

  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Policy Impact Analysis
        run: |
          python scripts/policy_impact_analysis.py \
            --policy policies/new-policy.yaml \
            --historical-data data/decisions-last-30d.json

  deploy:
    if: github.ref == 'refs/heads/main'
    needs: [validate, test, analyze]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Policy Store
        run: |
          curl -X POST https://policy-store.company.com/api/v1/policies \
            -H "Authorization: Bearer ${{ secrets.POLICY_API_TOKEN }}" \
            -H "Content-Type: application/yaml" \
            --data-binary @policies/new-policy.yaml
```

---

## 9. Summary

The Policy Definition Language (PDL) provides:

1. **Unified YAML format** for all policy types
2. **OPA Rego integration** for flexible, powerful rule evaluation
3. **Compliance mapping** to frameworks (EU AI Act, NIST, ISO)
4. **Scoping and conditions** for fine-grained control
5. **Explainability templates** for user-facing messaging
6. **Testing framework** for policy validation
7. **CI/CD integration** for safe policy deployment

**Key Features**:
- Declarative, human-readable syntax
- Version control integration
- Automated testing and validation
- Impact analysis before deployment
- Real-time compilation to enforcement rules

**Next Document**: Enforcement Plugin Architecture (browser, IDE, API gateway, proxy)
