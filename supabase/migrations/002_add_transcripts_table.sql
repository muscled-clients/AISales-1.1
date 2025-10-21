-- Add transcripts table to store all transcript segments for each session
CREATE TABLE IF NOT EXISTS transcripts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES recording_sessions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  is_interim BOOLEAN DEFAULT FALSE,
  speaker TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster session lookups
CREATE INDEX IF NOT EXISTS idx_transcripts_session_id ON transcripts(session_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_timestamp ON transcripts(timestamp);

-- Add RLS policies
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for now (you can customize this later)
CREATE POLICY "Allow all access to transcripts" ON transcripts
  FOR ALL USING (true);
