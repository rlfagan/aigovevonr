-- IAM Users Table
-- Stores synchronized users from Okta/Entra ID

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,  -- IAM provider user ID
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    department VARCHAR(255),
    job_title VARCHAR(255),
    groups TEXT[],  -- Array of group names
    iam_provider VARCHAR(50) NOT NULL,  -- 'okta' or 'entra_id'
    iam_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'active',  -- active, inactive, suspended
    metadata JSONB  -- Additional provider-specific data
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_id ON users(user_id);
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_iam_provider ON users(iam_provider);
CREATE INDEX idx_users_last_seen ON users(last_seen_at);

-- Add user_id column to decisions table for tracking
ALTER TABLE decisions ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_decisions_user_id ON decisions(user_id);

-- User Activity Summary View
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT
    u.user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.department,
    u.iam_provider,
    COUNT(d.decision_id) as total_requests,
    COUNT(d.decision_id) FILTER (WHERE d.decision = 'ALLOW') as allowed_requests,
    COUNT(d.decision_id) FILTER (WHERE d.decision = 'DENY') as denied_requests,
    AVG(d.risk_score) as avg_risk_score,
    MAX(d.timestamp) as last_activity,
    u.last_seen_at
FROM users u
LEFT JOIN decisions d ON u.email = d.user_email
WHERE d.timestamp > NOW() - INTERVAL '30 days' OR d.timestamp IS NULL
GROUP BY u.user_id, u.email, u.first_name, u.last_name, u.department, u.iam_provider, u.last_seen_at;

-- Function to update user last_seen timestamp
CREATE OR REPLACE FUNCTION update_user_last_seen(p_email VARCHAR)
RETURNS VOID AS $$
BEGIN
    UPDATE users
    SET last_seen_at = NOW()
    WHERE email = p_email;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

COMMENT ON TABLE users IS 'Synchronized users from IAM providers (Okta, Entra ID)';
COMMENT ON COLUMN users.user_id IS 'Unique user ID from IAM provider';
COMMENT ON COLUMN users.groups IS 'Array of group/role names from IAM provider';
COMMENT ON COLUMN users.iam_provider IS 'IAM provider: okta or entra_id';
