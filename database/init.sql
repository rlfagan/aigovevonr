-- AI Governance Database Schema
-- PostgreSQL 16 + TimescaleDB

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- DECISIONS TABLE (Hypertable for audit logs)
-- ==========================================

CREATE TABLE decisions (
    decision_id UUID DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- User context
    user_email VARCHAR(255),
    user_department VARCHAR(100),
    user_id VARCHAR(255),

    -- Action
    action VARCHAR(100) NOT NULL,

    -- Resource
    resource_type VARCHAR(50) NOT NULL,
    resource_url TEXT,
    resource_service VARCHAR(255),

    -- Decision
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('ALLOW', 'DENY', 'REVIEW')),
    reason TEXT NOT NULL,
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),

    -- Context
    source VARCHAR(50),
    ip_address INET,
    user_agent TEXT,

    -- Content analysis (if applicable)
    has_pii BOOLEAN DEFAULT FALSE,
    has_proprietary BOOLEAN DEFAULT FALSE,

    -- Performance
    evaluation_duration_ms INTEGER,

    -- Metadata
    request_id UUID,
    metadata JSONB,

    -- Composite primary key including timestamp for TimescaleDB partitioning
    PRIMARY KEY (decision_id, timestamp)
);

-- Convert to TimescaleDB hypertable (partitioned by time)
SELECT create_hypertable('decisions', 'timestamp');

-- Add unique constraint on decision_id for foreign key references
CREATE UNIQUE INDEX idx_decisions_id_unique ON decisions(decision_id, timestamp);

-- Create indices for common queries
CREATE INDEX idx_decisions_user ON decisions(user_email, timestamp DESC);
CREATE INDEX idx_decisions_decision ON decisions(decision, timestamp DESC);
CREATE INDEX idx_decisions_service ON decisions(resource_service, timestamp DESC);
CREATE INDEX idx_decisions_risk ON decisions(risk_score, timestamp DESC) WHERE risk_score > 50;

-- Create continuous aggregate for hourly stats
CREATE MATERIALIZED VIEW decisions_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', timestamp) AS hour,
    user_email,
    resource_service,
    decision,
    COUNT(*) AS decision_count,
    AVG(risk_score) AS avg_risk_score,
    MAX(risk_score) AS max_risk_score
FROM decisions
GROUP BY hour, user_email, resource_service, decision
WITH NO DATA;

-- Refresh policy for continuous aggregate
SELECT add_continuous_aggregate_policy('decisions_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

-- ==========================================
-- AI SERVICES TABLE
-- ==========================================

CREATE TABLE ai_services (
    service_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    vendor VARCHAR(255),
    domain VARCHAR(255) NOT NULL UNIQUE,

    -- Classification
    service_type VARCHAR(50),
    risk_tier VARCHAR(20) CHECK (risk_tier IN ('low', 'medium', 'high', 'critical')),

    -- Approval status
    approval_status VARCHAR(50) NOT NULL DEFAULT 'unknown'
        CHECK (approval_status IN ('approved', 'prohibited', 'review_required', 'unknown')),
    approved_for TEXT[],
    prohibited_for TEXT[],

    -- Metadata
    requires_training BOOLEAN DEFAULT TRUE,
    data_handling VARCHAR(100),
    certifications TEXT[],

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed approved services
INSERT INTO ai_services (name, vendor, domain, service_type, risk_tier, approval_status, approved_for, requires_training) VALUES
('ChatGPT', 'OpenAI', 'chatgpt.com', 'llm', 'medium', 'approved', ARRAY['engineering', 'marketing', 'product'], TRUE),
('Claude', 'Anthropic', 'claude.ai', 'llm', 'medium', 'approved', ARRAY['engineering', 'research'], TRUE),
('Gemini', 'Google', 'gemini.google.com', 'llm', 'medium', 'approved', ARRAY['engineering', 'research'], TRUE),
('GitHub Copilot', 'GitHub', 'copilot.github.com', 'code_assistant', 'medium', 'approved', ARRAY['engineering'], TRUE);

-- Seed prohibited services
INSERT INTO ai_services (name, vendor, domain, service_type, risk_tier, approval_status, requires_training) VALUES
('Character.AI', 'Character Technologies', 'character.ai', 'chatbot', 'high', 'prohibited', FALSE),
('Replika', 'Luka Inc', 'replika.com', 'chatbot', 'high', 'prohibited', FALSE);

-- ==========================================
-- USERS TABLE (Minimal for MVP)
-- ==========================================

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    department VARCHAR(100),

    -- Training status
    training_completed BOOLEAN DEFAULT FALSE,
    training_completed_date TIMESTAMPTZ,

    -- Risk profile
    risk_score INTEGER DEFAULT 50 CHECK (risk_score >= 0 AND risk_score <= 100),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed test users
INSERT INTO users (email, department, training_completed, training_completed_date) VALUES
('john.doe@company.com', 'engineering', TRUE, NOW() - INTERVAL '30 days'),
('jane.smith@company.com', 'marketing', TRUE, NOW() - INTERVAL '15 days'),
('bob.wilson@company.com', 'finance', FALSE, NULL);

-- ==========================================
-- VIOLATIONS TABLE
-- ==========================================

CREATE TABLE violations (
    violation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    decision_id UUID NOT NULL,  -- References decisions but without FK constraint due to composite PK
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Violator
    user_email VARCHAR(255) NOT NULL,
    user_department VARCHAR(100),

    -- Violation details
    violation_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),

    -- Resource
    resource_service VARCHAR(255),
    resource_url TEXT,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),

    -- Timestamps
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_violations_status ON violations(status, timestamp DESC);
CREATE INDEX idx_violations_user ON violations(user_email, timestamp DESC);
CREATE INDEX idx_violations_severity ON violations(severity, timestamp DESC);

-- ==========================================
-- ANALYTICS VIEWS
-- ==========================================

-- Daily summary view
CREATE VIEW daily_summary AS
SELECT
    DATE(timestamp) AS date,
    decision,
    COUNT(*) AS count,
    COUNT(DISTINCT user_email) AS unique_users,
    AVG(risk_score) AS avg_risk_score
FROM decisions
GROUP BY DATE(timestamp), decision
ORDER BY date DESC;

-- Top services view
CREATE VIEW top_services AS
SELECT
    resource_service,
    COUNT(*) AS total_requests,
    COUNT(*) FILTER (WHERE decision = 'ALLOW') AS allowed,
    COUNT(*) FILTER (WHERE decision = 'DENY') AS denied,
    AVG(risk_score) AS avg_risk_score
FROM decisions
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY resource_service
ORDER BY total_requests DESC;

-- Top users view
CREATE VIEW top_users AS
SELECT
    user_email,
    user_department,
    COUNT(*) AS total_requests,
    COUNT(*) FILTER (WHERE decision = 'DENY') AS violations,
    AVG(risk_score) AS avg_risk_score
FROM decisions
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY user_email, user_department
ORDER BY total_requests DESC;

-- ==========================================
-- RETENTION POLICY
-- ==========================================

-- Drop raw data after 90 days (keep aggregates)
SELECT add_retention_policy('decisions', INTERVAL '90 days');

-- ==========================================
-- FUNCTIONS
-- ==========================================

-- Function to log a decision
CREATE OR REPLACE FUNCTION log_decision(
    p_user_email VARCHAR,
    p_user_department VARCHAR,
    p_action VARCHAR,
    p_resource_type VARCHAR,
    p_resource_url TEXT,
    p_resource_service VARCHAR,
    p_decision VARCHAR,
    p_reason TEXT,
    p_risk_score INTEGER,
    p_source VARCHAR DEFAULT NULL,
    p_has_pii BOOLEAN DEFAULT FALSE,
    p_has_proprietary BOOLEAN DEFAULT FALSE,
    p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_decision_id UUID;
BEGIN
    INSERT INTO decisions (
        user_email, user_department, action,
        resource_type, resource_url, resource_service,
        decision, reason, risk_score,
        source, has_pii, has_proprietary, metadata
    ) VALUES (
        p_user_email, p_user_department, p_action,
        p_resource_type, p_resource_url, p_resource_service,
        p_decision, p_reason, p_risk_score,
        p_source, p_has_pii, p_has_proprietary, p_metadata
    ) RETURNING decision_id INTO v_decision_id;

    -- Create violation if denied
    IF p_decision = 'DENY' THEN
        INSERT INTO violations (
            decision_id, user_email, user_department,
            violation_type, severity,
            resource_service, resource_url
        ) VALUES (
            v_decision_id, p_user_email, p_user_department,
            'policy_violation',
            CASE
                WHEN p_risk_score >= 80 THEN 'critical'
                WHEN p_risk_score >= 60 THEN 'high'
                WHEN p_risk_score >= 40 THEN 'medium'
                ELSE 'low'
            END,
            p_resource_service, p_resource_url
        );
    END IF;

    RETURN v_decision_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aigovuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO aigovuser;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'AI Governance database initialized successfully!';
    RAISE NOTICE 'Tables created: decisions (hypertable), ai_services, users, violations';
    RAISE NOTICE 'Sample data inserted: 3 users, 6 AI services';
END $$;
