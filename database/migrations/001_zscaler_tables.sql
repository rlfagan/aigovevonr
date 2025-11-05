-- Zscaler Integration Tables
-- Supports ingestion of Zscaler Internet Access (ZIA) and Private Access (ZPA) logs

-- ==========================================
-- ZSCALER WEB LOGS (ZIA)
-- ==========================================

CREATE TABLE zscaler_web_logs (
    log_id UUID DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL,

    -- User information
    user_email VARCHAR(255),
    user_department VARCHAR(100),
    user_location VARCHAR(255),

    -- Request details
    url TEXT NOT NULL,
    domain VARCHAR(255),
    category VARCHAR(100),
    action VARCHAR(50) NOT NULL CHECK (action IN ('Allowed', 'Blocked', 'Cautioned')),

    -- Threat information
    threat_category VARCHAR(100),
    threat_name VARCHAR(255),
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),

    -- DLP information
    dlp_dictionaries TEXT[],
    dlp_engine VARCHAR(50),
    file_type VARCHAR(50),

    -- Application details
    application VARCHAR(255),
    application_class VARCHAR(100),
    cloud_app VARCHAR(255),

    -- Policy information
    policy_name VARCHAR(255),
    policy_reason TEXT,

    -- Network details
    source_ip INET,
    dest_ip INET,
    bytes_sent BIGINT,
    bytes_received BIGINT,

    -- Metadata
    device_owner VARCHAR(255),
    device_hostname VARCHAR(255),
    raw_log JSONB,

    PRIMARY KEY (log_id, timestamp)
);

-- Convert to hypertable
SELECT create_hypertable('zscaler_web_logs', 'timestamp',
    chunk_time_interval => INTERVAL '1 day');

-- Indexes
CREATE INDEX idx_zscaler_web_user ON zscaler_web_logs(user_email, timestamp DESC);
CREATE INDEX idx_zscaler_web_action ON zscaler_web_logs(action, timestamp DESC);
CREATE INDEX idx_zscaler_web_category ON zscaler_web_logs(category, timestamp DESC);
CREATE INDEX idx_zscaler_web_threat ON zscaler_web_logs(threat_category, timestamp DESC)
    WHERE threat_category IS NOT NULL;
CREATE INDEX idx_zscaler_web_dlp ON zscaler_web_logs USING GIN(dlp_dictionaries)
    WHERE dlp_dictionaries IS NOT NULL;

-- ==========================================
-- ZSCALER PRIVATE ACCESS LOGS (ZPA)
-- ==========================================

CREATE TABLE zscaler_zpa_logs (
    log_id UUID DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL,

    -- User information
    user_email VARCHAR(255),
    user_department VARCHAR(100),

    -- Application details
    application_name VARCHAR(255),
    application_id VARCHAR(255),

    -- Connection details
    connection_status VARCHAR(50),
    connection_reason TEXT,

    -- Policy information
    policy_name VARCHAR(255),
    policy_action VARCHAR(50),

    -- Network details
    connector_group VARCHAR(255),
    client_public_ip INET,
    bytes_tx BIGINT,
    bytes_rx BIGINT,

    -- Session information
    session_id VARCHAR(255),
    session_duration INTEGER,

    -- Metadata
    device_type VARCHAR(100),
    os_type VARCHAR(100),
    raw_log JSONB,

    PRIMARY KEY (log_id, timestamp)
);

-- Convert to hypertable
SELECT create_hypertable('zscaler_zpa_logs', 'timestamp',
    chunk_time_interval => INTERVAL '1 day');

-- Indexes
CREATE INDEX idx_zscaler_zpa_user ON zscaler_zpa_logs(user_email, timestamp DESC);
CREATE INDEX idx_zscaler_zpa_app ON zscaler_zpa_logs(application_name, timestamp DESC);
CREATE INDEX idx_zscaler_zpa_status ON zscaler_zpa_logs(connection_status, timestamp DESC);

-- ==========================================
-- ZSCALER AI SERVICE DETECTIONS
-- ==========================================

CREATE TABLE zscaler_ai_detections (
    detection_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Reference to web log
    zscaler_log_id UUID,

    -- User context
    user_email VARCHAR(255) NOT NULL,
    user_department VARCHAR(100),

    -- AI Service identified
    ai_service_name VARCHAR(255),
    ai_service_domain VARCHAR(255) NOT NULL,
    ai_service_category VARCHAR(100),

    -- Detection details
    action_taken VARCHAR(50) NOT NULL,
    zscaler_policy VARCHAR(255),

    -- Risk assessment
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),

    -- DLP findings
    has_sensitive_data BOOLEAN DEFAULT FALSE,
    dlp_violations TEXT[],

    -- Integration with internal decisions
    internal_decision_id UUID,  -- Links to decisions table

    -- Metadata
    metadata JSONB
);

CREATE INDEX idx_zscaler_ai_user ON zscaler_ai_detections(user_email, timestamp DESC);
CREATE INDEX idx_zscaler_ai_service ON zscaler_ai_detections(ai_service_domain, timestamp DESC);
CREATE INDEX idx_zscaler_ai_action ON zscaler_ai_detections(action_taken, timestamp DESC);

-- ==========================================
-- ZSCALER CONFIGURATION
-- ==========================================

CREATE TABLE zscaler_config (
    config_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- API credentials (encrypted in application layer)
    cloud_name VARCHAR(255),
    api_key_encrypted TEXT,
    username VARCHAR(255),

    -- Integration settings
    enabled BOOLEAN DEFAULT TRUE,
    log_types TEXT[] DEFAULT ARRAY['web', 'zpa', 'firewall'],
    sync_interval_minutes INTEGER DEFAULT 5,

    -- Webhook configuration
    webhook_url TEXT,
    webhook_secret_encrypted TEXT,

    -- Last sync status
    last_sync_timestamp TIMESTAMPTZ,
    last_sync_status VARCHAR(50),
    last_sync_record_count INTEGER,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default config
INSERT INTO zscaler_config (cloud_name, enabled, log_types, sync_interval_minutes)
VALUES ('default', FALSE, ARRAY['web', 'zpa'], 5);

-- ==========================================
-- ANALYTICS VIEWS
-- ==========================================

-- AI Service usage from Zscaler
CREATE VIEW zscaler_ai_usage_summary AS
SELECT
    ai_service_domain,
    ai_service_name,
    COUNT(*) AS total_accesses,
    COUNT(*) FILTER (WHERE action_taken = 'Allowed') AS allowed,
    COUNT(*) FILTER (WHERE action_taken = 'Blocked') AS blocked,
    COUNT(DISTINCT user_email) AS unique_users,
    COUNT(*) FILTER (WHERE has_sensitive_data = TRUE) AS with_sensitive_data,
    MAX(timestamp) AS last_seen
FROM zscaler_ai_detections
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY ai_service_domain, ai_service_name
ORDER BY total_accesses DESC;

-- Top blocked categories
CREATE VIEW zscaler_top_blocks AS
SELECT
    category,
    COUNT(*) AS block_count,
    COUNT(DISTINCT user_email) AS affected_users,
    ARRAY_AGG(DISTINCT domain ORDER BY domain) FILTER (WHERE domain IS NOT NULL) AS domains
FROM zscaler_web_logs
WHERE action = 'Blocked'
    AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY category
ORDER BY block_count DESC
LIMIT 20;

-- DLP incidents
CREATE VIEW zscaler_dlp_incidents AS
SELECT
    DATE(timestamp) AS incident_date,
    user_email,
    user_department,
    domain,
    dlp_dictionaries,
    dlp_engine,
    file_type,
    action,
    policy_name
FROM zscaler_web_logs
WHERE dlp_dictionaries IS NOT NULL
    AND timestamp > NOW() - INTERVAL '30 days'
ORDER BY timestamp DESC;

-- ==========================================
-- FUNCTIONS
-- ==========================================

-- Function to ingest Zscaler web log
CREATE OR REPLACE FUNCTION ingest_zscaler_web_log(
    p_timestamp TIMESTAMPTZ,
    p_user_email VARCHAR,
    p_url TEXT,
    p_domain VARCHAR,
    p_category VARCHAR,
    p_action VARCHAR,
    p_raw_log JSONB
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_is_ai_service BOOLEAN;
    v_service_domain VARCHAR;
BEGIN
    -- Insert web log
    INSERT INTO zscaler_web_logs (
        timestamp, user_email, url, domain, category, action, raw_log
    ) VALUES (
        p_timestamp, p_user_email, p_url, p_domain, p_category, p_action, p_raw_log
    ) RETURNING log_id INTO v_log_id;

    -- Check if this is an AI service
    SELECT EXISTS (
        SELECT 1 FROM ai_services WHERE domain = p_domain
    ) INTO v_is_ai_service;

    -- If AI service, create detection record
    IF v_is_ai_service THEN
        INSERT INTO zscaler_ai_detections (
            zscaler_log_id,
            user_email,
            ai_service_domain,
            action_taken,
            zscaler_policy,
            timestamp,
            metadata
        ) SELECT
            v_log_id,
            p_user_email,
            p_domain,
            p_action,
            (p_raw_log->>'policy')::VARCHAR,
            p_timestamp,
            p_raw_log;
    END IF;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL PRIVILEGES ON zscaler_web_logs TO aigovuser;
GRANT ALL PRIVILEGES ON zscaler_zpa_logs TO aigovuser;
GRANT ALL PRIVILEGES ON zscaler_ai_detections TO aigovuser;
GRANT ALL PRIVILEGES ON zscaler_config TO aigovuser;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Zscaler integration tables created successfully!';
    RAISE NOTICE 'Tables: zscaler_web_logs, zscaler_zpa_logs, zscaler_ai_detections, zscaler_config';
END $$;
