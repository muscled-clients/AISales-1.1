-- ================================
-- AISALES CONVERSATION DATABASE
-- ================================
-- Migration: Create recording sessions and AI conversations tables
-- Run this in Supabase SQL Editor

-- ================================
-- RECORDING SESSIONS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS recording_sessions (
  id TEXT PRIMARY KEY,
  title TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration INTEGER,
  transcript_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_sessions_started
ON recording_sessions(started_at DESC);

-- Add RLS (Row Level Security)
ALTER TABLE recording_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for now (you can restrict this later)
CREATE POLICY "Allow all operations on recording_sessions"
ON recording_sessions
FOR ALL
USING (true)
WITH CHECK (true);

-- ================================
-- AI CONVERSATIONS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES recording_sessions(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  context_used TEXT,
  selected_transcript TEXT,
  transcript_start_time REAL,
  transcript_end_time REAL,
  speaker_info TEXT,
  model_used TEXT DEFAULT 'llama-3.3-70b-versatile',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster session lookups
CREATE INDEX IF NOT EXISTS idx_conversations_session
ON ai_conversations(session_id);

-- Add index for timestamp queries
CREATE INDEX IF NOT EXISTS idx_conversations_created
ON ai_conversations(created_at DESC);

-- Add RLS
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for now
CREATE POLICY "Allow all operations on ai_conversations"
ON ai_conversations
FOR ALL
USING (true)
WITH CHECK (true);

-- ================================
-- HELPFUL QUERIES
-- ================================

-- View recent sessions with conversation counts
-- SELECT
--   s.*,
--   COUNT(c.id) as conversation_count
-- FROM recording_sessions s
-- LEFT JOIN ai_conversations c ON c.session_id = s.id
-- GROUP BY s.id
-- ORDER BY s.started_at DESC
-- LIMIT 10;

-- View conversations for a specific session
-- SELECT * FROM ai_conversations
-- WHERE session_id = 'your-session-id'
-- ORDER BY created_at ASC;
