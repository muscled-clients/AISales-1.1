# Supabase Database Setup

## Quick Setup

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project: `atssnebuumpbswxybodn`

2. **Run Migration**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"
   - Copy the contents of `migrations/001_create_sessions_and_conversations.sql`
   - Paste into the editor
   - Click "Run" (or press Cmd/Ctrl + Enter)

3. **Verify Tables Created**
   - Click on "Table Editor" in the left sidebar
   - You should see two new tables:
     - `recording_sessions`
     - `ai_conversations`

## Tables Created

### `recording_sessions`
Stores each recording session (call).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Unique session identifier |
| title | TEXT | Optional session title |
| started_at | TIMESTAMPTZ | When recording started |
| ended_at | TIMESTAMPTZ | When recording ended |
| duration | INTEGER | Duration in seconds |
| transcript_count | INTEGER | Number of transcripts |
| created_at | TIMESTAMPTZ | Auto-generated timestamp |

### `ai_conversations`
Stores all AI chat interactions within sessions.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Unique conversation identifier |
| session_id | TEXT | Links to recording_sessions |
| user_message | TEXT | User's question |
| ai_response | TEXT | AI's response |
| context_used | TEXT | Full context sent to AI |
| selected_transcript | TEXT | Selected transcript segment |
| transcript_start_time | REAL | Start time in seconds |
| transcript_end_time | REAL | End time in seconds |
| speaker_info | TEXT | Who was speaking |
| model_used | TEXT | AI model name |
| created_at | TIMESTAMPTZ | Auto-generated timestamp |

## Security (RLS Policies)

Currently set to allow all operations. Update policies in Supabase Dashboard under:
- Authentication → Policies

## Querying Data

### View recent sessions with conversation counts
```sql
SELECT
  s.*,
  COUNT(c.id) as conversation_count
FROM recording_sessions s
LEFT JOIN ai_conversations c ON c.session_id = s.id
GROUP BY s.id
ORDER BY s.started_at DESC
LIMIT 10;
```

### View conversations for a session
```sql
SELECT * FROM ai_conversations
WHERE session_id = 'your-session-id'
ORDER BY created_at ASC;
```

## Environment Variables

Already configured in `.env`:
```
SUPABASE_URL=https://atssnebuumpbswxybodn.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Testing Connection

The app will automatically connect to Supabase when you:
1. Start a recording (creates a session)
2. Send a chat message (saves conversation)
