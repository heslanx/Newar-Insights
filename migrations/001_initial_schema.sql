-- Newar Insights - Initial Database Schema
-- Compatible with SQLite and PostgreSQL (Supabase)
-- Date: 2025-10-28

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- SQLite
    -- id BIGSERIAL PRIMARY KEY, -- PostgreSQL/Supabase
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    max_concurrent_bots INTEGER DEFAULT 5 NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =====================================================
-- API TOKENS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS api_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- SQLite
    -- id BIGSERIAL PRIMARY KEY, -- PostgreSQL/Supabase
    user_id INTEGER NOT NULL,
    token_hash TEXT UNIQUE NOT NULL, -- SHA-256 hash (64 chars)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- MEETINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS meetings (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- SQLite
    -- id BIGSERIAL PRIMARY KEY, -- PostgreSQL/Supabase
    user_id INTEGER NOT NULL,
    platform TEXT NOT NULL, -- 'google_meet' or 'teams'
    meeting_id TEXT NOT NULL, -- Native meeting ID (e.g., 'abc-defg-hij')
    bot_container_id TEXT, -- Docker container ID
    status TEXT NOT NULL DEFAULT 'requested', -- requested, joining, active, recording, finalizing, completed, failed
    meeting_url TEXT NOT NULL,
    recording_path TEXT, -- Path to final recording (e.g., 'final/user_1/meeting_123.webm')
    started_at DATETIME,
    completed_at DATETIME,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    -- UNIQUE(platform, meeting_id, user_id) -- Temporarily disabled for debugging
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_platform_meeting_id ON meetings(platform, meeting_id);
CREATE INDEX IF NOT EXISTS idx_api_tokens_token_hash ON api_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =====================================================
-- STATUS FLOW
-- =====================================================
-- requested → joining → active → recording → finalizing → completed
--                                                      ↓
--                                                   failed

-- =====================================================
-- SAMPLE DATA (OPTIONAL - for testing)
-- =====================================================
-- Uncomment to insert test user

-- INSERT INTO users (email, name, max_concurrent_bots) VALUES
-- ('test@newar.com', 'Test User', 10);

-- To generate a test API token:
-- 1. Generate random string: openssl rand -hex 20
-- 2. Hash it: echo -n "your_random_string" | sha256sum
-- 3. Insert: INSERT INTO api_tokens (user_id, token_hash) VALUES (1, 'your_hash');
