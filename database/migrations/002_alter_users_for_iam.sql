-- Alter existing users table for IAM integration

-- Change user_id from UUID to VARCHAR to support IAM provider IDs
ALTER TABLE users DROP CONSTRAINT users_pkey CASCADE;
ALTER TABLE users ALTER COLUMN user_id TYPE VARCHAR(255);
ALTER TABLE users ADD PRIMARY KEY (user_id);

-- Add IAM-related columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS groups TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS iam_provider VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS iam_synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_users_iam_provider ON users(iam_provider);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen_at);

-- Add user_id column to decisions table if doesn't exist
ALTER TABLE decisions ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_decisions_user_id ON decisions(user_id);

-- Drop and recreate user activity view with new schema
DROP VIEW IF EXISTS user_activity_summary;

CREATE VIEW user_activity_summary AS
SELECT
    u.user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.department,
    COALESCE(u.iam_provider, 'local') as iam_provider,
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

COMMENT ON COLUMN users.user_id IS 'Unique user ID from IAM provider or local UUID';
COMMENT ON COLUMN users.groups IS 'Array of group/role names from IAM provider';
COMMENT ON COLUMN users.iam_provider IS 'IAM provider: okta, entra_id, or NULL for local';
