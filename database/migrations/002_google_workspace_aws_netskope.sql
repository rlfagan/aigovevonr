-- Google Workspace, AWS CloudTrail, and Netskope Integration Tables

-- ==========================================
-- GOOGLE WORKSPACE ACTIVITY LOGS
-- ==========================================

CREATE TABLE google_workspace_logs (
    log_id UUID DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL,

    -- User information
    user_email VARCHAR(255),
    user_department VARCHAR(100),

    -- Event details
    event_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    application_name VARCHAR(100),

    -- AI/ML service detection
    is_ai_service BOOLEAN DEFAULT FALSE,
    ai_service_name VARCHAR(255),

    -- Document/resource details
    document_id VARCHAR(255),
    document_title TEXT,
    resource_id VARCHAR(255),

    -- Activity details
    activity_type VARCHAR(100),
    visibility VARCHAR(50),
    owner_email VARCHAR(255),

    -- Sharing and permissions
    target_user VARCHAR(255),
    old_value TEXT,
    new_value TEXT,

    -- IP and device
    ip_address INET,
    user_agent TEXT,

    -- Metadata
    raw_log JSONB,

    PRIMARY KEY (log_id, timestamp)
);

SELECT create_hypertable('google_workspace_logs', 'timestamp',
    chunk_time_interval => INTERVAL '1 day');

CREATE INDEX idx_gws_user ON google_workspace_logs(user_email, timestamp DESC);
CREATE INDEX idx_gws_event ON google_workspace_logs(event_type, timestamp DESC);
CREATE INDEX idx_gws_app ON google_workspace_logs(application_name, timestamp DESC);
CREATE INDEX idx_gws_ai ON google_workspace_logs(is_ai_service, timestamp DESC)
    WHERE is_ai_service = TRUE;

-- ==========================================
-- AWS CLOUDTRAIL LOGS
-- ==========================================

CREATE TABLE aws_cloudtrail_logs (
    log_id UUID DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL,

    -- Identity information
    user_identity_type VARCHAR(100),
    user_identity_arn VARCHAR(500),
    user_identity_principal_id VARCHAR(255),
    user_email VARCHAR(255),
    user_department VARCHAR(100),

    -- Event details
    event_name VARCHAR(255) NOT NULL,
    event_source VARCHAR(255),
    event_type VARCHAR(50),

    -- AWS Service details
    aws_region VARCHAR(50),
    aws_account_id VARCHAR(20),

    -- AI/ML service detection
    is_ai_service BOOLEAN DEFAULT FALSE,
    ai_service_name VARCHAR(255),
    service_category VARCHAR(100),

    -- Request details
    request_parameters JSONB,
    response_elements JSONB,

    -- Resource details
    resources JSONB,
    resource_type VARCHAR(255),
    resource_arn VARCHAR(500),

    -- Error and status
    error_code VARCHAR(255),
    error_message TEXT,

    -- Source details
    source_ip INET,
    user_agent TEXT,

    -- API call details
    read_only BOOLEAN,
    api_version VARCHAR(50),

    -- Session context
    session_issuer VARCHAR(500),
    mfa_used BOOLEAN,

    -- Metadata
    raw_log JSONB,

    PRIMARY KEY (log_id, timestamp)
);

SELECT create_hypertable('aws_cloudtrail_logs', 'timestamp',
    chunk_time_interval => INTERVAL '1 day');

CREATE INDEX idx_aws_user ON aws_cloudtrail_logs(user_email, timestamp DESC);
CREATE INDEX idx_aws_event ON aws_cloudtrail_logs(event_name, timestamp DESC);
CREATE INDEX idx_aws_service ON aws_cloudtrail_logs(event_source, timestamp DESC);
CREATE INDEX idx_aws_ai ON aws_cloudtrail_logs(is_ai_service, timestamp DESC)
    WHERE is_ai_service = TRUE;
CREATE INDEX idx_aws_error ON aws_cloudtrail_logs(error_code, timestamp DESC)
    WHERE error_code IS NOT NULL;

-- ==========================================
-- NETSKOPE LOGS
-- ==========================================

CREATE TABLE netskope_logs (
    log_id UUID DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL,

    -- User information
    user_email VARCHAR(255),
    user_department VARCHAR(100),
    user_location VARCHAR(255),

    -- App details
    app VARCHAR(255),
    app_category VARCHAR(100),
    app_activity VARCHAR(255),
    ccl_category VARCHAR(100),

    -- URL and domain
    url TEXT,
    domain VARCHAR(255),

    -- Action and policy
    action VARCHAR(50) NOT NULL,
    policy_name VARCHAR(255),

    -- DLP information
    dlp_incident_id VARCHAR(255),
    dlp_rule VARCHAR(255),
    dlp_profile VARCHAR(255),
    dlp_file VARCHAR(255),
    dlp_fingerprint_match BOOLEAN DEFAULT FALSE,

    -- Threat information
    malware_type VARCHAR(100),
    malware_name VARCHAR(255),
    threat_severity VARCHAR(50),

    -- AI/ML service detection
    is_ai_service BOOLEAN DEFAULT FALSE,
    ai_service_name VARCHAR(255),

    -- File details
    file_name VARCHAR(500),
    file_type VARCHAR(100),
    file_size BIGINT,
    md5 VARCHAR(32),

    -- Device details
    device_name VARCHAR(255),
    os VARCHAR(100),
    browser VARCHAR(100),

    -- Network details
    source_ip INET,
    destination_ip INET,
    bytes_sent BIGINT,
    bytes_received BIGINT,

    -- Instance and org
    instance_name VARCHAR(255),
    organization_unit VARCHAR(255),

    -- Metadata
    raw_log JSONB,

    PRIMARY KEY (log_id, timestamp)
);

SELECT create_hypertable('netskope_logs', 'timestamp',
    chunk_time_interval => INTERVAL '1 day');

CREATE INDEX idx_netskope_user ON netskope_logs(user_email, timestamp DESC);
CREATE INDEX idx_netskope_app ON netskope_logs(app, timestamp DESC);
CREATE INDEX idx_netskope_action ON netskope_logs(action, timestamp DESC);
CREATE INDEX idx_netskope_dlp ON netskope_logs(dlp_incident_id, timestamp DESC)
    WHERE dlp_incident_id IS NOT NULL;
CREATE INDEX idx_netskope_ai ON netskope_logs(is_ai_service, timestamp DESC)
    WHERE is_ai_service = TRUE;
CREATE INDEX idx_netskope_malware ON netskope_logs(malware_type, timestamp DESC)
    WHERE malware_type IS NOT NULL;

-- ==========================================
-- INTEGRATION CONFIGURATIONS
-- ==========================================

CREATE TABLE integration_configs (
    config_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(100) NOT NULL UNIQUE,

    -- Authentication
    auth_type VARCHAR(50) NOT NULL CHECK (auth_type IN ('api_key', 'oauth2', 'service_account', 'iam_role')),
    credentials_encrypted JSONB NOT NULL,

    -- Integration settings
    enabled BOOLEAN DEFAULT TRUE,
    sync_interval_minutes INTEGER DEFAULT 5,

    -- Webhook configuration
    webhook_url TEXT,
    webhook_secret_encrypted TEXT,

    -- Last sync status
    last_sync_timestamp TIMESTAMPTZ,
    last_sync_status VARCHAR(50),
    last_sync_record_count INTEGER,
    last_error TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default configurations
INSERT INTO integration_configs (provider, auth_type, credentials_encrypted, enabled)
VALUES
    ('google_workspace', 'service_account', '{}'::JSONB, FALSE),
    ('aws_cloudtrail', 'iam_role', '{}'::JSONB, FALSE),
    ('netskope', 'api_key', '{}'::JSONB, FALSE);

-- ==========================================
-- UNIFIED AI SERVICE DETECTIONS
-- ==========================================

-- Extend the existing zscaler_ai_detections table concept to a unified view
CREATE VIEW unified_ai_detections AS
-- Zscaler detections
SELECT
    detection_id,
    timestamp,
    user_email,
    user_department,
    ai_service_domain AS service_identifier,
    ai_service_name AS service_name,
    'zscaler' AS source,
    action_taken AS action,
    risk_level,
    has_sensitive_data,
    metadata
FROM zscaler_ai_detections

UNION ALL

-- Google Workspace AI service usage
SELECT
    log_id AS detection_id,
    timestamp,
    user_email,
    user_department,
    ai_service_name AS service_identifier,
    ai_service_name AS service_name,
    'google_workspace' AS source,
    activity_type AS action,
    'medium' AS risk_level,
    FALSE AS has_sensitive_data,
    raw_log AS metadata
FROM google_workspace_logs
WHERE is_ai_service = TRUE

UNION ALL

-- AWS AI/ML service usage
SELECT
    log_id AS detection_id,
    timestamp,
    user_email,
    user_department,
    ai_service_name AS service_identifier,
    ai_service_name AS service_name,
    'aws_cloudtrail' AS source,
    event_name AS action,
    'medium' AS risk_level,
    FALSE AS has_sensitive_data,
    raw_log AS metadata
FROM aws_cloudtrail_logs
WHERE is_ai_service = TRUE

UNION ALL

-- Netskope AI service detections
SELECT
    log_id AS detection_id,
    timestamp,
    user_email,
    user_department,
    ai_service_name AS service_identifier,
    ai_service_name AS service_name,
    'netskope' AS source,
    action,
    CASE
        WHEN action = 'block' THEN 'high'
        WHEN dlp_incident_id IS NOT NULL THEN 'high'
        ELSE 'medium'
    END AS risk_level,
    dlp_incident_id IS NOT NULL AS has_sensitive_data,
    raw_log AS metadata
FROM netskope_logs
WHERE is_ai_service = TRUE;

-- ==========================================
-- ANALYTICS VIEWS
-- ==========================================

-- Cloud platform AI usage summary
CREATE VIEW cloud_ai_usage_summary AS
SELECT
    source,
    service_name,
    COUNT(*) AS total_detections,
    COUNT(DISTINCT user_email) AS unique_users,
    COUNT(*) FILTER (WHERE has_sensitive_data = TRUE) AS with_sensitive_data,
    COUNT(*) FILTER (WHERE risk_level IN ('high', 'critical')) AS high_risk_count,
    MAX(timestamp) AS last_seen
FROM unified_ai_detections
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY source, service_name
ORDER BY total_detections DESC;

-- DLP incidents across all platforms
CREATE VIEW unified_dlp_incidents AS
SELECT
    'zscaler' AS source,
    timestamp,
    user_email,
    user_department,
    domain AS resource,
    dlp_dictionaries AS dlp_rules,
    action
FROM zscaler_web_logs
WHERE dlp_dictionaries IS NOT NULL
    AND timestamp > NOW() - INTERVAL '30 days'

UNION ALL

SELECT
    'netskope' AS source,
    timestamp,
    user_email,
    user_department,
    app AS resource,
    ARRAY[dlp_rule] AS dlp_rules,
    action
FROM netskope_logs
WHERE dlp_incident_id IS NOT NULL
    AND timestamp > NOW() - INTERVAL '30 days'

ORDER BY timestamp DESC;

-- User activity summary across all sources
CREATE VIEW user_activity_summary AS
SELECT
    user_email,
    user_department,
    COUNT(*) AS total_activities,
    COUNT(*) FILTER (WHERE source = 'zscaler') AS zscaler_events,
    COUNT(*) FILTER (WHERE source = 'google_workspace') AS gws_events,
    COUNT(*) FILTER (WHERE source = 'aws_cloudtrail') AS aws_events,
    COUNT(*) FILTER (WHERE source = 'netskope') AS netskope_events,
    COUNT(*) FILTER (WHERE has_sensitive_data = TRUE) AS dlp_incidents,
    MAX(timestamp) AS last_activity
FROM unified_ai_detections
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY user_email, user_department
ORDER BY total_activities DESC;

-- ==========================================
-- FUNCTIONS
-- ==========================================

-- Function to identify if a service is an AI service
CREATE OR REPLACE FUNCTION is_known_ai_service(p_service_name VARCHAR) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM ai_services
        WHERE name ILIKE '%' || p_service_name || '%'
            OR domain ILIKE '%' || p_service_name || '%'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to update sync status
CREATE OR REPLACE FUNCTION update_sync_status(
    p_provider VARCHAR,
    p_status VARCHAR,
    p_record_count INTEGER DEFAULT NULL,
    p_error TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE integration_configs
    SET
        last_sync_timestamp = NOW(),
        last_sync_status = p_status,
        last_sync_record_count = COALESCE(p_record_count, last_sync_record_count),
        last_error = p_error,
        updated_at = NOW()
    WHERE provider = p_provider;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL PRIVILEGES ON google_workspace_logs TO aigovuser;
GRANT ALL PRIVILEGES ON aws_cloudtrail_logs TO aigovuser;
GRANT ALL PRIVILEGES ON netskope_logs TO aigovuser;
GRANT ALL PRIVILEGES ON integration_configs TO aigovuser;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Cloud platform integration tables created successfully!';
    RAISE NOTICE 'Tables: google_workspace_logs, aws_cloudtrail_logs, netskope_logs, integration_configs';
    RAISE NOTICE 'Views: unified_ai_detections, cloud_ai_usage_summary, unified_dlp_incidents';
END $$;
