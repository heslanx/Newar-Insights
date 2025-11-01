#!/bin/bash

# Script para criar schema no Supabase via SQL
# Usa a API REST do Supabase para executar o SQL

set -e

echo "📊 Criando schema no Supabase PostgreSQL..."
echo ""

# Lê o SQL
SQL=$(cat << 'EOF'
-- Drop existing tables
DROP TABLE IF EXISTS meetings CASCADE;
DROP TABLE IF EXISTS api_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    max_concurrent_bots INTEGER DEFAULT 5,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Tokens table
CREATE TABLE api_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meetings table
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

-- Indexes
CREATE INDEX idx_meetings_user_id ON meetings(user_id);
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_meetings_bot_container_id ON meetings(bot_container_id);
CREATE INDEX idx_meetings_recording_session_id ON meetings(recording_session_id);
CREATE INDEX idx_api_tokens_token_hash ON api_tokens(token_hash);
CREATE INDEX idx_users_email ON users(email);

-- Triggers
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
EOF
)

echo "✅ Schema SQL preparado"
echo ""
echo "⚠️  ATENÇÃO: Execute este SQL no Supabase Dashboard:"
echo ""
echo "1. Acesse: https://supabase.com/dashboard/project/iykklyrujvbmytkhwcfi/editor"
echo "2. Cole o SQL acima no editor"
echo "3. Clique em 'Run'"
echo ""
echo "Conteúdo do SQL:"
echo "================"
echo "$SQL"
echo ""
echo "Ou copie de: migrations/postgres/001_initial_schema_supabase.sql"
