# Data Models & Schemas
## Enterprise AI Policy Management and Enforcement Platform

---

## Overview

This document defines the complete data model for the AI Policy Management Platform, including:

- **Policy data structures** (regulatory, organizational, technical, business)
- **User and role context** (IAM, departments, permissions)
- **AI service catalog** (signatures, risk profiles, vendor info)
- **Asset inventory** (devices, software, crown jewels)
- **Audit events** (decisions, violations, administrative actions)
- **Compliance mappings** (framework controls, evidence)

All schemas are designed for **PostgreSQL 16** with JSON/JSONB support, optimized for **read-heavy** workloads with appropriate indices.

---

## 1. Policy Domain

### 1.1 Policies Table

```sql
CREATE TABLE policies (
    policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) NOT NULL,  -- Semantic versioning (1.2.3)
    status VARCHAR(50) NOT NULL,  -- draft, review, active, archived
    priority INTEGER NOT NULL DEFAULT 100,  -- Higher = higher priority
    policy_type VARCHAR(50) NOT NULL,  -- regulatory, organizational, technical, business_function
    framework VARCHAR(50),  -- EU_AI_ACT, NIST_AI_RMF, ISO_42001, ISO_27001, etc.
    article_reference TEXT,  -- "Article 5", "NIST GOVERN-1.1", etc.

    -- Policy content
    rule_engine VARCHAR(50) NOT NULL,  -- opa, cedar
    rule_content TEXT NOT NULL,  -- Rego/Cedar policy code
    rule_metadata JSONB,  -- Additional metadata for rule execution

    -- Scope
    scope JSONB NOT NULL,  -- {departments: [], users: [], services: []}

    -- Lifecycle
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL,  -- Reference to users.user_id
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_by UUID NOT NULL,
    approved_by UUID,
    approved_at TIMESTAMP,
    effective_date TIMESTAMP NOT NULL,
    expiry_date TIMESTAMP,

    -- Compliance
    compliance_mappings JSONB,  -- [{framework, control_id, evidence}]

    -- Metadata
    tags TEXT[],
    comments TEXT,

    CONSTRAINT valid_status CHECK (status IN ('draft', 'review', 'active', 'archived')),
    CONSTRAINT valid_priority CHECK (priority >= 0 AND priority <= 1000)
);

CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_type ON policies(policy_type);
CREATE INDEX idx_policies_framework ON policies(framework);
CREATE INDEX idx_policies_effective_date ON policies(effective_date);
CREATE INDEX idx_policies_tags ON policies USING GIN(tags);
CREATE INDEX idx_policies_scope ON policies USING GIN(scope);
```

### 1.2 Policy Versions Table

```sql
CREATE TABLE policy_versions (
    version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES policies(policy_id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    rule_content TEXT NOT NULL,
    rule_metadata JSONB,

    -- Change tracking
    change_summary TEXT,
    changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    changed_by UUID NOT NULL,

    -- Git integration
    git_commit_sha VARCHAR(40),
    git_branch VARCHAR(100),

    CONSTRAINT unique_policy_version UNIQUE (policy_id, version)
);

CREATE INDEX idx_policy_versions_policy_id ON policy_versions(policy_id);
CREATE INDEX idx_policy_versions_changed_at ON policy_versions(changed_at);
```

### 1.3 Policy Conflicts Table

```sql
CREATE TABLE policy_conflicts (
    conflict_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_a_id UUID NOT NULL REFERENCES policies(policy_id),
    policy_b_id UUID NOT NULL REFERENCES policies(policy_id),
    conflict_type VARCHAR(50) NOT NULL,  -- scope_overlap, contradictory_action, priority_ambiguity
    conflict_details JSONB NOT NULL,
    severity VARCHAR(20) NOT NULL,  -- low, medium, high, critical
    resolved BOOLEAN DEFAULT FALSE,
    resolution_notes TEXT,
    detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP,

    CONSTRAINT valid_severity CHECK (severity IN ('low', 'medium', 'high', 'critical'))
);

CREATE INDEX idx_policy_conflicts_unresolved ON policy_conflicts(resolved) WHERE NOT resolved;
```

---

## 2. User & Role Context Domain

### 2.1 Users Table

```sql
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(255) UNIQUE,  -- From IdP (Okta, Azure AD)
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(200),

    -- Organizational context
    department_id UUID REFERENCES departments(department_id),
    job_title VARCHAR(150),
    manager_id UUID REFERENCES users(user_id),
    employee_type VARCHAR(50),  -- full_time, contractor, intern, vendor

    -- Risk profile
    risk_score INTEGER DEFAULT 50,  -- 0-100
    risk_factors JSONB,  -- {violations_count, training_status, access_level}
    clearance_level VARCHAR(50),  -- public, internal, confidential, secret, top_secret

    -- Authentication
    sso_enabled BOOLEAN DEFAULT TRUE,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,

    -- Lifecycle
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, suspended, inactive
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deactivated_at TIMESTAMP,

    CONSTRAINT valid_risk_score CHECK (risk_score >= 0 AND risk_score <= 100),
    CONSTRAINT valid_status CHECK (status IN ('active', 'suspended', 'inactive'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_department_id ON users(department_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_risk_score ON users(risk_score);
CREATE INDEX idx_users_external_id ON users(external_id);
```

### 2.2 Departments Table

```sql
CREATE TABLE departments (
    department_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    parent_department_id UUID REFERENCES departments(department_id),
    cost_center VARCHAR(50),

    -- Policy overrides
    default_risk_tolerance INTEGER DEFAULT 50,  -- 0-100
    allowed_ai_services TEXT[],  -- Service IDs that are pre-approved
    prohibited_ai_services TEXT[],

    -- Business unit info
    business_unit VARCHAR(100),
    region VARCHAR(100),

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_departments_name ON departments(name);
CREATE INDEX idx_departments_parent ON departments(parent_department_id);
```

### 2.3 Roles Table

```sql
CREATE TABLE roles (
    role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL,  -- {policies: [read, write], audit: [read], ...}
    is_system_role BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_roles_name ON roles(name);
```

### 2.4 User Roles (Many-to-Many)

```sql
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES users(user_id),
    expires_at TIMESTAMP,

    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
```

### 2.5 Groups Table

```sql
CREATE TABLE groups (
    group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    external_id VARCHAR(255),  -- From IdP
    group_type VARCHAR(50),  -- security, distribution, role

    -- Policy scope
    allowed_ai_services TEXT[],
    prohibited_ai_services TEXT[],

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_groups_name ON groups(name);
CREATE INDEX idx_groups_external_id ON groups(external_id);
```

### 2.6 User Groups (Many-to-Many)

```sql
CREATE TABLE user_groups (
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    added_at TIMESTAMP NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id, group_id)
);

CREATE INDEX idx_user_groups_user_id ON user_groups(user_id);
CREATE INDEX idx_user_groups_group_id ON user_groups(group_id);
```

---

## 3. AI Service Catalog Domain

### 3.1 AI Services Table

```sql
CREATE TABLE ai_services (
    service_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    vendor VARCHAR(200),
    service_type VARCHAR(50),  -- llm, image_generation, code_assistant, chatbot, etc.

    -- Identification
    signatures JSONB NOT NULL,  -- {domains: [], headers: [], api_patterns: []}
    /*
    Example:
    {
      "domains": ["openai.com", "chatgpt.com", "api.openai.com"],
      "headers": [{"name": "X-OpenAI-Client", "pattern": ".*"}],
      "api_patterns": ["/v1/chat/completions", "/v1/images/generations"],
      "ssl_fingerprints": ["sha256:abc123..."]
    }
    */

    -- Risk profile
    risk_tier VARCHAR(20) NOT NULL,  -- low, medium, high, critical
    risk_score INTEGER NOT NULL,  -- 0-100
    risk_factors JSONB,  -- {data_retention, training_on_data, geo_location, compliance}

    -- Approval status
    approval_status VARCHAR(50) NOT NULL,  -- approved, prohibited, review_required, unknown
    approved_for TEXT[],  -- Department IDs or group IDs
    prohibited_for TEXT[],

    -- Vendor info
    vendor_contact_email VARCHAR(255),
    support_url TEXT,
    documentation_url TEXT,

    -- Compliance
    certifications TEXT[],  -- SOC2, ISO27001, HIPAA, GDPR, etc.
    data_handling VARCHAR(100),  -- no_retention, trains_on_data, retains_90_days, etc.
    data_regions TEXT[],  -- us-east, eu-west, etc.
    privacy_policy_url TEXT,
    terms_of_service_url TEXT,

    -- Metadata
    model_version VARCHAR(100),
    capabilities TEXT[],  -- text_generation, image_generation, code_completion, etc.
    pricing_model VARCHAR(50),  -- free, freemium, subscription, pay_per_use

    -- Lifecycle
    discovered_at TIMESTAMP,
    last_seen TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_risk_tier CHECK (risk_tier IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT valid_risk_score CHECK (risk_score >= 0 AND risk_score <= 100),
    CONSTRAINT valid_approval_status CHECK (approval_status IN ('approved', 'prohibited', 'review_required', 'unknown'))
);

CREATE INDEX idx_ai_services_name ON ai_services(name);
CREATE INDEX idx_ai_services_vendor ON ai_services(vendor);
CREATE INDEX idx_ai_services_risk_tier ON ai_services(risk_tier);
CREATE INDEX idx_ai_services_approval_status ON ai_services(approval_status);
CREATE INDEX idx_ai_services_signatures ON ai_services USING GIN(signatures);
```

### 3.2 AI Service Signatures (for fast lookup)

```sql
CREATE TABLE ai_service_signatures (
    signature_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES ai_services(service_id) ON DELETE CASCADE,
    signature_type VARCHAR(50) NOT NULL,  -- domain, header, api_pattern, ssl_fingerprint
    pattern TEXT NOT NULL,
    confidence FLOAT DEFAULT 1.0,  -- 0.0-1.0

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_signatures_service_id ON ai_service_signatures(service_id);
CREATE INDEX idx_service_signatures_type_pattern ON ai_service_signatures(signature_type, pattern);
CREATE INDEX idx_service_signatures_pattern ON ai_service_signatures(pattern);
```

---

## 4. Asset Inventory Domain

### 4.1 Assets Table

```sql
CREATE TABLE assets (
    asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(255),  -- From CrowdStrike, SentinelOne, etc.
    asset_type VARCHAR(50) NOT NULL,  -- laptop, desktop, server, mobile, vm, container

    -- Identification
    hostname VARCHAR(255),
    ip_addresses INET[],
    mac_addresses TEXT[],
    serial_number VARCHAR(100),

    -- Owner
    owner_id UUID REFERENCES users(user_id),
    department_id UUID REFERENCES departments(department_id),

    -- Technical details
    os VARCHAR(100),
    os_version VARCHAR(50),
    installed_software JSONB,  -- [{name, version, vendor}]

    -- Security posture
    compliance_status VARCHAR(50),  -- compliant, non_compliant, unknown
    vulnerabilities JSONB,  -- [{cve_id, severity, remediation}]
    last_scan TIMESTAMP,
    edr_agent_installed BOOLEAN DEFAULT FALSE,
    edr_agent_version VARCHAR(50),

    -- Classification
    crown_jewel BOOLEAN DEFAULT FALSE,  -- High-value asset
    sensitivity VARCHAR(50),  -- low, medium, high, critical
    data_classification TEXT[],  -- PII, PHI, financial, trade_secret, etc.

    -- Lifecycle
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, retired, lost, stolen
    acquired_date TIMESTAMP,
    retired_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_sensitivity CHECK (sensitivity IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'retired', 'lost', 'stolen'))
);

CREATE INDEX idx_assets_owner_id ON assets(owner_id);
CREATE INDEX idx_assets_department_id ON assets(department_id);
CREATE INDEX idx_assets_hostname ON assets(hostname);
CREATE INDEX idx_assets_crown_jewel ON assets(crown_jewel) WHERE crown_jewel = TRUE;
CREATE INDEX idx_assets_compliance_status ON assets(compliance_status);
CREATE INDEX idx_assets_external_id ON assets(external_id);
```

---

## 5. Decision & Audit Domain

### 5.1 Decisions Table (TimescaleDB Hypertable)

```sql
CREATE TABLE decisions (
    decision_id UUID NOT NULL,
    request_id UUID NOT NULL,  -- For tracing
    timestamp TIMESTAMPTZ NOT NULL,

    -- Context
    user_id UUID NOT NULL,
    user_email VARCHAR(255),
    user_department VARCHAR(200),

    -- Action
    action VARCHAR(100) NOT NULL,  -- access_ai_service, send_prompt, upload_file, etc.

    -- Resource
    resource_type VARCHAR(50) NOT NULL,  -- ai_service, api_endpoint, file, etc.
    resource_id UUID,  -- Reference to ai_services.service_id if applicable
    resource_name VARCHAR(255),
    resource_url TEXT,

    -- Decision
    decision VARCHAR(20) NOT NULL,  -- ALLOW, DENY, REVIEW
    reason TEXT NOT NULL,
    confidence FLOAT,  -- 0.0-1.0

    -- Risk assessment
    risk_score INTEGER,  -- 0-100
    risk_factors JSONB,

    -- Policies applied
    policies_evaluated JSONB NOT NULL,  -- [{policy_id, policy_name, matched, priority}]
    primary_policy_id UUID,  -- The policy that triggered the decision

    -- Context
    source VARCHAR(50),  -- browser_plugin, ide_plugin, api_gateway, proxy, etc.
    device_id UUID,
    ip_address INET,
    geo_location VARCHAR(100),
    user_agent TEXT,

    -- Content inspection (if applicable)
    content_classified BOOLEAN DEFAULT FALSE,
    detected_entities JSONB,  -- [{type: PII, value: redacted, confidence}]
    data_classification TEXT[],

    -- Performance
    evaluation_duration_ms INTEGER,

    -- Explainability
    explanation JSONB,  -- Detailed reasoning for UI

    PRIMARY KEY (decision_id, timestamp)
);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('decisions', 'timestamp');

-- Indices
CREATE INDEX idx_decisions_user_id ON decisions(user_id, timestamp DESC);
CREATE INDEX idx_decisions_decision ON decisions(decision, timestamp DESC);
CREATE INDEX idx_decisions_resource_id ON decisions(resource_id, timestamp DESC);
CREATE INDEX idx_decisions_risk_score ON decisions(risk_score, timestamp DESC);
CREATE INDEX idx_decisions_source ON decisions(source, timestamp DESC);

-- Retention policy (auto-delete after 90 days)
SELECT add_retention_policy('decisions', INTERVAL '90 days');

-- Continuous aggregates
CREATE MATERIALIZED VIEW decisions_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', timestamp) AS hour,
    user_id,
    resource_id,
    decision,
    COUNT(*) AS decision_count,
    AVG(risk_score) AS avg_risk_score,
    AVG(evaluation_duration_ms) AS avg_duration_ms
FROM decisions
GROUP BY hour, user_id, resource_id, decision;

SELECT add_continuous_aggregate_policy('decisions_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');
```

### 5.2 Audit Events Table (TimescaleDB Hypertable)

```sql
CREATE TABLE audit_events (
    event_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    event_type VARCHAR(100) NOT NULL,  -- ai_service_access_attempt, policy_updated, etc.
    severity VARCHAR(20) NOT NULL,  -- info, warning, error, critical

    -- Actor
    actor_id UUID,  -- user_id or system account
    actor_email VARCHAR(255),
    actor_type VARCHAR(50),  -- user, system, integration

    -- Target
    target_type VARCHAR(50),  -- policy, ai_service, user, asset, etc.
    target_id UUID,
    target_name VARCHAR(255),

    -- Event details
    action VARCHAR(100) NOT NULL,
    result VARCHAR(50),  -- success, failure, partial

    -- Context
    decision_id UUID,  -- Link to decision if applicable
    source VARCHAR(50),
    ip_address INET,
    user_agent TEXT,

    -- Metadata
    event_data JSONB,  -- Event-specific data
    changes JSONB,  -- Before/after for updates

    -- Compliance
    compliance_relevant BOOLEAN DEFAULT FALSE,
    frameworks TEXT[],  -- EU_AI_ACT, NIST_AI_RMF, etc.

    PRIMARY KEY (event_id, timestamp)
);

-- Convert to hypertable
SELECT create_hypertable('audit_events', 'timestamp');

-- Indices
CREATE INDEX idx_audit_events_actor_id ON audit_events(actor_id, timestamp DESC);
CREATE INDEX idx_audit_events_event_type ON audit_events(event_type, timestamp DESC);
CREATE INDEX idx_audit_events_severity ON audit_events(severity, timestamp DESC);
CREATE INDEX idx_audit_events_compliance ON audit_events(compliance_relevant, timestamp DESC)
    WHERE compliance_relevant = TRUE;

-- Retention: 7 years for compliance
SELECT add_retention_policy('audit_events', INTERVAL '7 years');
```

### 5.3 Violations Table

```sql
CREATE TABLE violations (
    violation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id UUID NOT NULL,  -- Reference to decisions table
    timestamp TIMESTAMPTZ NOT NULL,

    -- Violator
    user_id UUID NOT NULL,
    user_email VARCHAR(255),
    user_department VARCHAR(200),

    -- Violation details
    violation_type VARCHAR(100) NOT NULL,  -- unapproved_service, pii_detected, policy_evasion, etc.
    policy_id UUID NOT NULL,  -- Policy that was violated
    policy_name VARCHAR(255),
    severity VARCHAR(20) NOT NULL,  -- low, medium, high, critical

    -- Resource
    resource_type VARCHAR(50),
    resource_id UUID,
    resource_name VARCHAR(255),

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'open',  -- open, investigating, resolved, false_positive
    assigned_to UUID REFERENCES users(user_id),
    resolution_notes TEXT,
    resolved_at TIMESTAMP,

    -- Notifications
    notification_sent BOOLEAN DEFAULT FALSE,
    escalated BOOLEAN DEFAULT FALSE,
    escalated_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_severity CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT valid_status CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive'))
);

CREATE INDEX idx_violations_user_id ON violations(user_id);
CREATE INDEX idx_violations_status ON violations(status);
CREATE INDEX idx_violations_severity ON violations(severity);
CREATE INDEX idx_violations_timestamp ON violations(timestamp DESC);
CREATE INDEX idx_violations_unresolved ON violations(status, timestamp DESC)
    WHERE status IN ('open', 'investigating');
```

### 5.4 Exceptions Table

```sql
CREATE TABLE exceptions (
    exception_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Exception details
    exception_type VARCHAR(50) NOT NULL,  -- temporary, permanent
    reason TEXT NOT NULL,
    justification TEXT NOT NULL,

    -- Scope
    user_id UUID REFERENCES users(user_id),
    department_id UUID REFERENCES departments(department_id),
    group_id UUID REFERENCES groups(group_id),

    -- What's being excepted
    policy_id UUID REFERENCES policies(policy_id),
    ai_service_id UUID REFERENCES ai_services(service_id),

    -- Conditions
    conditions JSONB,  -- {max_uses: 100, data_types: [non-pii], ...}

    -- Lifecycle
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, approved, denied, expired, revoked
    requested_by UUID NOT NULL REFERENCES users(user_id),
    requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMP,
    effective_from TIMESTAMP,
    effective_until TIMESTAMP,

    -- Tracking
    usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMP,

    -- Audit
    revoked_by UUID REFERENCES users(user_id),
    revoked_at TIMESTAMP,
    revocation_reason TEXT,

    CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'denied', 'expired', 'revoked'))
);

CREATE INDEX idx_exceptions_user_id ON exceptions(user_id);
CREATE INDEX idx_exceptions_status ON exceptions(status);
CREATE INDEX idx_exceptions_effective_dates ON exceptions(effective_from, effective_until);
CREATE INDEX idx_exceptions_policy_id ON exceptions(policy_id);
```

---

## 6. Compliance Domain

### 6.1 Compliance Frameworks Table

```sql
CREATE TABLE compliance_frameworks (
    framework_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,  -- EU_AI_ACT, NIST_AI_RMF, ISO_42001, etc.
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50),
    description TEXT,
    jurisdiction VARCHAR(100),  -- EU, US, Global, etc.
    effective_date TIMESTAMP,

    -- Metadata
    url TEXT,
    documentation_url TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert initial frameworks
INSERT INTO compliance_frameworks (code, name, version, jurisdiction) VALUES
('EU_AI_ACT', 'EU Artificial Intelligence Act', '2024', 'EU'),
('NIST_AI_RMF', 'NIST AI Risk Management Framework', '1.0', 'US'),
('ISO_42001', 'ISO/IEC 42001 - AI Management System', '2023', 'Global'),
('ISO_27001', 'ISO/IEC 27001 - Information Security', '2022', 'Global'),
('ISO_27701', 'ISO/IEC 27701 - Privacy Information Management', '2019', 'Global');
```

### 6.2 Compliance Controls Table

```sql
CREATE TABLE compliance_controls (
    control_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    framework_id UUID NOT NULL REFERENCES compliance_frameworks(framework_id),
    control_number VARCHAR(50) NOT NULL,  -- Article 5, GOVERN-1.1, A.5.1, etc.
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    control_type VARCHAR(50),  -- preventive, detective, corrective

    -- Implementation
    implementation_status VARCHAR(50),  -- not_implemented, partial, implemented, n/a
    implementation_notes TEXT,

    -- Evidence
    evidence_required BOOLEAN DEFAULT TRUE,
    evidence_description TEXT,

    -- Metadata
    parent_control_id UUID REFERENCES compliance_controls(control_id),
    tags TEXT[],

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_framework_control UNIQUE (framework_id, control_number)
);

CREATE INDEX idx_compliance_controls_framework_id ON compliance_controls(framework_id);
CREATE INDEX idx_compliance_controls_status ON compliance_controls(implementation_status);
```

### 6.3 Policy Control Mappings (Many-to-Many)

```sql
CREATE TABLE policy_control_mappings (
    policy_id UUID NOT NULL REFERENCES policies(policy_id) ON DELETE CASCADE,
    control_id UUID NOT NULL REFERENCES compliance_controls(control_id) ON DELETE CASCADE,
    mapping_notes TEXT,
    coverage_percentage INTEGER,  -- 0-100, how much of the control does this policy cover

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),

    PRIMARY KEY (policy_id, control_id),
    CONSTRAINT valid_coverage CHECK (coverage_percentage >= 0 AND coverage_percentage <= 100)
);

CREATE INDEX idx_policy_control_policy_id ON policy_control_mappings(policy_id);
CREATE INDEX idx_policy_control_control_id ON policy_control_mappings(control_id);
```

### 6.4 Compliance Evidence Table

```sql
CREATE TABLE compliance_evidence (
    evidence_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    control_id UUID NOT NULL REFERENCES compliance_controls(control_id),
    evidence_type VARCHAR(50) NOT NULL,  -- document, screenshot, log_export, attestation, etc.

    -- Evidence details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT,  -- S3 URL
    file_hash VARCHAR(64),  -- SHA-256

    -- Time period
    period_start TIMESTAMP,
    period_end TIMESTAMP,

    -- Metadata
    collected_by UUID REFERENCES users(user_id),
    collected_at TIMESTAMP NOT NULL DEFAULT NOW(),
    verified_by UUID REFERENCES users(user_id),
    verified_at TIMESTAMP,

    -- Retention
    retention_until TIMESTAMP,  -- Legal hold requirement

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_compliance_evidence_control_id ON compliance_evidence(control_id);
CREATE INDEX idx_compliance_evidence_collected_at ON compliance_evidence(collected_at DESC);
```

---

## 7. Integration Domain

### 7.1 Integrations Table

```sql
CREATE TABLE integrations (
    integration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    integration_type VARCHAR(50) NOT NULL,  -- identity, asset_discovery, casb, dlp, siem, etc.
    provider VARCHAR(100) NOT NULL,  -- okta, crowdstrike, netskope, etc.

    -- Configuration
    config JSONB NOT NULL,  -- Provider-specific config (encrypted)
    enabled BOOLEAN DEFAULT TRUE,

    -- Sync settings
    sync_schedule VARCHAR(100),  -- Cron expression
    last_sync_at TIMESTAMP,
    last_sync_status VARCHAR(50),  -- success, failure, partial
    last_sync_error TEXT,
    next_sync_at TIMESTAMP,

    -- Webhooks
    webhook_url TEXT,
    webhook_secret VARCHAR(255),  -- Encrypted

    -- Health
    health_status VARCHAR(20) DEFAULT 'unknown',  -- healthy, degraded, unhealthy, unknown
    health_check_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_integration_type CHECK (integration_type IN (
        'identity', 'asset_discovery', 'cmdb', 'dlp', 'casb', 'siem', 'grc', 'communication'
    ))
);

CREATE INDEX idx_integrations_type ON integrations(integration_type);
CREATE INDEX idx_integrations_enabled ON integrations(enabled) WHERE enabled = TRUE;
```

### 7.2 Integration Sync Logs Table

```sql
CREATE TABLE integration_sync_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL REFERENCES integrations(integration_id) ON DELETE CASCADE,
    sync_started_at TIMESTAMP NOT NULL,
    sync_completed_at TIMESTAMP,
    status VARCHAR(50) NOT NULL,  -- running, success, failure, partial

    -- Metrics
    records_fetched INTEGER,
    records_created INTEGER,
    records_updated INTEGER,
    records_deleted INTEGER,
    records_failed INTEGER,

    -- Error details
    error_message TEXT,
    error_details JSONB,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_logs_integration_id ON integration_sync_logs(integration_id);
CREATE INDEX idx_sync_logs_started_at ON integration_sync_logs(sync_started_at DESC);
```

---

## 8. Readiness Assessment Domain

### 8.1 Readiness Assessments Table

```sql
CREATE TABLE readiness_assessments (
    assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,  -- Multi-tenant support
    org_name VARCHAR(255),

    -- Assessment details
    assessment_type VARCHAR(50) NOT NULL,  -- full, quick, targeted
    scan_date TIMESTAMP NOT NULL,

    -- Overall scores
    overall_score INTEGER NOT NULL,  -- 0-100
    maturity_level INTEGER NOT NULL,  -- 1-5
    maturity_name VARCHAR(50),

    -- Dimension scores
    dimension_scores JSONB NOT NULL,
    /*
    {
      "shadow_ai": {"score": 52, "weight": 0.20, "findings": {...}},
      "policy_coverage": {"score": 70, "weight": 0.15, "findings": {...}},
      ...
    }
    */

    -- Findings
    critical_gaps JSONB,  -- [{gap, risk_level, impact, priority}]
    recommendations JSONB,

    -- Remediation
    remediation_roadmap JSONB,
    quick_wins JSONB,

    -- Benchmark
    industry_avg_score INTEGER,
    percentile INTEGER,  -- 0-100

    -- Metadata
    scan_duration_seconds INTEGER,
    data_sources TEXT[],  -- Which integrations provided data

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id)
);

CREATE INDEX idx_assessments_org_id ON readiness_assessments(org_id);
CREATE INDEX idx_assessments_scan_date ON readiness_assessments(scan_date DESC);
CREATE INDEX idx_assessments_overall_score ON readiness_assessments(overall_score);
```

### 8.2 Shadow AI Detection Table

```sql
CREATE TABLE shadow_ai_detections (
    detection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID REFERENCES readiness_assessments(assessment_id),

    -- Service detected
    service_name VARCHAR(200),
    service_id UUID REFERENCES ai_services(service_id),  -- NULL if unknown service

    -- Usage
    user_id UUID REFERENCES users(user_id),
    user_email VARCHAR(255),
    department VARCHAR(200),

    -- Detection details
    detected_at TIMESTAMP NOT NULL,
    detection_source VARCHAR(50),  -- casb_log, proxy_log, browser_history, etc.
    access_count INTEGER DEFAULT 1,
    last_access TIMESTAMP,

    -- Risk
    approved BOOLEAN DEFAULT FALSE,
    risk_level VARCHAR(20),

    -- Action taken
    action_taken VARCHAR(50),  -- none, blocked, flagged, exception_granted
    action_date TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shadow_ai_assessment_id ON shadow_ai_detections(assessment_id);
CREATE INDEX idx_shadow_ai_user_id ON shadow_ai_detections(user_id);
CREATE INDEX idx_shadow_ai_service_id ON shadow_ai_detections(service_id);
CREATE INDEX idx_shadow_ai_unapproved ON shadow_ai_detections(approved) WHERE approved = FALSE;
```

---

## 9. Notification Domain

### 9.1 Notifications Table

```sql
CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_type VARCHAR(50) NOT NULL,  -- violation, policy_update, exception_request, etc.
    severity VARCHAR(20) NOT NULL,  -- info, warning, critical

    -- Recipient
    recipient_id UUID NOT NULL REFERENCES users(user_id),

    -- Content
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,  -- Deep link to relevant UI

    -- Delivery
    channels TEXT[] NOT NULL,  -- email, slack, teams, pagerduty, sms
    delivery_status JSONB,  -- {email: sent, slack: delivered, ...}

    -- Tracking
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    dismissed BOOLEAN DEFAULT FALSE,
    dismissed_at TIMESTAMP,

    -- Context
    related_entity_type VARCHAR(50),  -- decision, violation, policy, etc.
    related_entity_id UUID,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP
);

CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, read)
    WHERE read = FALSE AND dismissed = FALSE;
```

---

## 10. Example Data

### Seed Data: Sample Policy

```sql
INSERT INTO policies (
    name, description, version, status, priority, policy_type, framework, article_reference,
    rule_engine, rule_content, scope, effective_date, created_by, updated_by
) VALUES (
    'EU AI Act - Prohibited AI Systems',
    'Blocks access to AI systems prohibited under EU AI Act Article 5',
    '1.0.0',
    'active',
    1000,  -- Highest priority
    'regulatory',
    'EU_AI_ACT',
    'Article 5',
    'opa',
    'package eu_ai_act.prohibited

import future.keywords.if

default allow = false

# Deny social scoring AI systems
deny if {
    input.resource.capabilities[_] == "social_scoring"
}

# Deny real-time biometric identification in public spaces
deny if {
    input.resource.capabilities[_] == "biometric_identification"
    input.context.location_type == "public_space"
}

# Deny subliminal manipulation
deny if {
    input.resource.capabilities[_] == "subliminal_manipulation"
}',
    '{"departments": [], "users": [], "services": []}',  -- Applies to all
    '2025-02-01 00:00:00',
    'system-user-uuid',
    'system-user-uuid'
);
```

### Seed Data: Sample AI Service (ChatGPT)

```sql
INSERT INTO ai_services (
    name, vendor, service_type, risk_tier, risk_score, approval_status,
    signatures, certifications, data_handling, data_regions
) VALUES (
    'ChatGPT',
    'OpenAI',
    'llm',
    'medium',
    60,
    'approved',
    '{
      "domains": ["openai.com", "chatgpt.com", "chat.openai.com"],
      "headers": [{"name": "X-OpenAI-Client-User-Agent", "pattern": ".*"}],
      "api_patterns": ["/backend-api/conversation"]
    }',
    ARRAY['SOC2', 'ISO27001'],
    'retains_30_days',
    ARRAY['us-east', 'eu-west']
);
```

---

## 11. Database Optimization & Maintenance

### 11.1 Partitioning Strategy

```sql
-- Partition decisions table by month (in addition to TimescaleDB hypertable)
-- TimescaleDB automatically handles this

-- Partition audit_events by severity for faster critical event queries
-- (Optional, for very high volume)
```

### 11.2 Archival Strategy

```sql
-- Move old decisions to cold storage (S3) after 90 days
CREATE OR REPLACE FUNCTION archive_old_decisions()
RETURNS void AS $$
BEGIN
    -- Export to S3 (via pg_dump or COPY TO PROGRAM)
    COPY (
        SELECT * FROM decisions
        WHERE timestamp < NOW() - INTERVAL '90 days'
    ) TO PROGRAM 'aws s3 cp - s3://ai-policy-archives/decisions/$(date +%Y-%m).parquet';

    -- Delete after successful export
    DELETE FROM decisions WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule monthly
SELECT cron.schedule('archive-decisions', '0 2 1 * *', 'SELECT archive_old_decisions()');
```

### 11.3 Backup Strategy

```sql
-- Full backup daily
-- Incremental backups every 4 hours
-- WAL archiving for point-in-time recovery

-- Example using pg_basebackup
pg_basebackup -D /backup/$(date +%Y%m%d) -Ft -z -P

-- Restore example
pg_restore -d ai_policy /backup/20250129/base.tar.gz
```

---

## 12. Summary

This data model provides:

- **Complete policy lifecycle**: versioning, conflicts, scope
- **Rich user context**: risk profiles, departments, groups, roles
- **Comprehensive AI service catalog**: signatures, risk assessment, approval workflows
- **Asset inventory**: crown jewel identification, compliance status
- **Full audit trail**: decisions, violations, exceptions, compliance evidence
- **Readiness assessment**: shadow AI detection, maturity scoring, gap analysis
- **Scalable event storage**: TimescaleDB hypertables for billions of events

**Key Design Principles**:
1. **Immutability**: Audit events are append-only
2. **Time-series optimization**: TimescaleDB for time-indexed queries
3. **JSONB flexibility**: Store variable schema data (signatures, metadata)
4. **Referential integrity**: Foreign keys enforce relationships
5. **Indexing strategy**: Optimized for read-heavy workloads
6. **Partitioning**: Automatic time-based partitioning via TimescaleDB
7. **Retention policies**: Automated data lifecycle management

**Next Document**: Policy Definition Language (YAML/JSON schema with examples)
