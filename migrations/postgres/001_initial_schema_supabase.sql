-- Newar Insights - Supabase PostgreSQL Schema
-- Execute este script no Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/iykklyrujvbmytkhwcfi/editor

-- ==========================================
-- DROP EXISTING TABLES (if running again)
-- ==========================================
DROP TABLE IF EXISTS meetings CASCADE;
DROP TABLE IF EXISTS api_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==========================================
-- USERS TABLE
-- ==========================================
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    max_concurrent_bots INTEGER DEFAULT 5,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- API TOKENS TABLE
-- ==========================================
CREATE TABLE api_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- MEETINGS TABLE
-- ==========================================
CREATE TABLE meetings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    meeting_id VARCHAR(255) NOT NULL,
    meeting_url TEXT NOT NULL,
    bot_name VARCHAR(255),
    bot_container_id VARCHAR(255),
    recording_session_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'requested',
    recording_path TEXT,
    recording_duration INTEGER,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX idx_meetings_user_id ON meetings(user_id);
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_meetings_bot_container_id ON meetings(bot_container_id);
CREATE INDEX idx_meetings_recording_session_id ON meetings(recording_session_id);
CREATE INDEX idx_api_tokens_token_hash ON api_tokens(token_hash);
CREATE INDEX idx_users_email ON users(email);

-- ==========================================
-- UPDATED_AT TRIGGER (auto-update timestamp)
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- VERIFY TABLES CREATED
-- ==========================================
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('users', 'api_tokens', 'meetings')
ORDER BY table_name;

-- ==========================================
-- SUCCESS MESSAGE
-- ==========================================
DO $$
BEGIN
    RAISE NOTICE '✅ Schema criado com sucesso!';
    RAISE NOTICE '📊 Tabelas: users, api_tokens, meetings';
    RAISE NOTICE '🔍 Índices: 6 índices de performance criados';
    RAISE NOTICE '⚡ Triggers: updated_at auto-update';
END $$;
