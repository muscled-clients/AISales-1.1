-- ================================
-- Add description field to recording_sessions
-- ================================

ALTER TABLE recording_sessions
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add index for searching descriptions
CREATE INDEX IF NOT EXISTS idx_sessions_description
ON recording_sessions USING gin(to_tsvector('english', description));
