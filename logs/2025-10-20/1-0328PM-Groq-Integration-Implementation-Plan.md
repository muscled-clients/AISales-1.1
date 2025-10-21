# Groq Integration & Session-Based Chat Implementation Plan

## Project: AISales-1.1 (Muscled Sales AI Assistant)

---

## Overview

Implement advanced AI chat features from Unpuzzle MVP into AISales app, including Groq LLM integration, streaming responses, better context management, and session-based conversation persistence.

---

## Current State Analysis

### What Already Works
- ✅ Cmd+D transcript selection (TranscriptPanelOptimized.tsx:37-88)
- ✅ Selected context displays in chat input (ChatInput.tsx:86-139)
- ✅ Basic OpenAI chat integration (aiService.ts)
- ✅ Transcript generation and display
- ✅ Environment variable setup for API keys

### What Needs Implementation
- ❌ Groq LLM API integration (replace OpenAI)
- ❌ Real-time streaming responses
- ❌ Enhanced context building (transcript + timestamps + speaker info)
- ❌ Session-based conversation persistence to database
- ❌ Recording session management with separate chat histories

---

## Requirements Breakdown

### 1. Keep Existing Feature
**Cmd+D Selection** - No changes needed
- User selects transcript text
- Presses Cmd+D
- Text appears in context box above chat input
- Works as-is

### 2. Groq LLM Integration
**Replace OpenAI with Groq API**
- Use `llama-3.3-70b-versatile` model (same as Unpuzzle)
- User will provide new Groq API key (not using Unpuzzle's key)
- Environment variable: `GROQ_API_KEY`
- Temperature: 0.7, Max tokens: 800

### 3. Better Context Management
**Enhanced context sent to AI includes:**
- Selected transcript segment text
- Start/end timestamps of selected segment
- Speaker information (user vs client)
- Recent chat history (last 6 messages)
- Current recording metadata

### 4. Streaming Responses
**Real-time AI response streaming**
- Stream chunks as they generate (like Unpuzzle's ReadableStream)
- Display partial responses in real-time
- Show typing indicator while generating
- Better UX vs waiting for complete response

### 5. Session-Based Conversations
**Each recording session = separate chat thread**
- Start Recording → Creates new conversation session
- All chat messages linked to that recording session ID
- Each session has isolated chat history
- Can view/switch between past recording sessions

### 6. Database Persistence
**Save every AI interaction with:**
- User message text
- AI response text
- Context used (selected transcript + metadata)
- Timestamp of interaction
- Recording session ID (foreign key)
- Model used (`llama-3.3-70b-versatile`)

---

## Technical Implementation

### Phase 1: Database Schema Setup

**Create new table: `recording_sessions`**
```sql
CREATE TABLE recording_sessions (
  id TEXT PRIMARY KEY,
  title TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  duration INTEGER,
  transcript_count INTEGER DEFAULT 0
);
```

**Create new table: `ai_conversations`**
```sql
CREATE TABLE ai_conversations (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES recording_sessions(id),
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  context_used TEXT,
  selected_transcript TEXT,
  transcript_start_time REAL,
  transcript_end_time REAL,
  speaker_info TEXT,
  model_used TEXT DEFAULT 'llama-3.3-70b-versatile',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Storage Location:**
- Use Electron's `userData` directory (like settings.json)
- Path: `app.getPath('userData')/conversations.db`
- Use `better-sqlite3` or similar for Electron compatibility

### Phase 2: Groq Service Implementation

**File: `src/services/groqService.ts`**

```typescript
import Groq from 'groq-sdk';

class GroqService {
  private client: Groq | null = null;
  private apiKey: string = '';

  initialize(apiKey: string) {
    this.apiKey = apiKey;
    this.client = new Groq({ apiKey });
  }

  async sendChatMessage(params: {
    message: string;
    context?: {
      selectedTranscript?: string;
      startTime?: number;
      endTime?: number;
      speaker?: string;
    };
    chatHistory?: Array<{ role: string; content: string }>;
    onChunk?: (chunk: string) => void;
  }) {
    // Build context with priority
    const systemPrompt = this.buildSystemPrompt(params);

    // Stream response
    const completion = await this.client.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...params.chatHistory || [],
        { role: 'user', content: params.message }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 800,
      stream: true
    });

    // Handle streaming
    let fullResponse = '';
    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullResponse += content;
      if (params.onChunk) {
        params.onChunk(content);
      }
    }

    return { content: fullResponse, timestamp: new Date() };
  }

  private buildSystemPrompt(params) {
    let context = 'You are a helpful AI assistant for sales calls.';

    // Add selected transcript (HIGHEST PRIORITY)
    if (params.context?.selectedTranscript) {
      context += `\n\nCURRENT FOCUS SEGMENT (${params.context.startTime}s - ${params.context.endTime}s):\n`;
      context += `Speaker: ${params.context.speaker || 'Unknown'}\n`;
      context += `"${params.context.selectedTranscript}"`;
    }

    return context;
  }

  isReady(): boolean {
    return this.client !== null;
  }
}

export const groqService = new GroqService();
```

### Phase 3: Session Management

**Update `src/stores/appStore.ts`**

Add session state:
```typescript
interface AppState {
  // ... existing state
  currentSessionId: string | null;
  sessions: RecordingSession[];

  // Actions
  createSession: () => string;
  endSession: (sessionId: string) => void;
  loadSession: (sessionId: string) => void;
  getSessions: () => RecordingSession[];
}
```

**Integrate with recording:**
```typescript
startRecording: async () => {
  // ... existing code

  // Create new session
  const sessionId = createSession();
  set((state) => {
    state.currentSessionId = sessionId;
    state.chatHistory = []; // Clear chat for new session
  });

  // Save to database
  await saveSessionToDB({ id: sessionId, startedAt: new Date() });
}

stopRecording: async () => {
  // ... existing code

  // End session
  const { currentSessionId } = useAppStore.getState();
  if (currentSessionId) {
    await endSession(currentSessionId);
  }
}
```

### Phase 4: Streaming Chat UI

**Update `src/components/ChatPanel.tsx`**

Add streaming state:
```typescript
const [streamingResponse, setStreamingResponse] = useState('');
const [isStreaming, setIsStreaming] = useState(false);

const handleSendMessage = async (message: string) => {
  setIsLoading(true);
  setIsStreaming(true);
  setStreamingResponse('');

  // Add user message
  addChatMessage({ role: 'user', content: message, timestamp: new Date() });

  // Prepare context
  const context = {
    selectedTranscript: selectedContext.join('\n'),
    startTime: /* calculate from transcripts */,
    endTime: /* calculate from transcripts */,
    speaker: 'user'
  };

  // Get recent chat history
  const chatHistory = chatHistory.slice(-6).map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  // Stream response
  const response = await groqService.sendChatMessage({
    message,
    context,
    chatHistory,
    onChunk: (chunk) => {
      setStreamingResponse(prev => prev + chunk);
    }
  });

  // Add final AI message
  addChatMessage({ role: 'assistant', content: response.content, timestamp: response.timestamp });

  // Save to database
  await saveConversationToDB({
    sessionId: currentSessionId,
    userMessage: message,
    aiResponse: response.content,
    contextUsed: JSON.stringify(context),
    selectedTranscript: context.selectedTranscript,
    transcriptStartTime: context.startTime,
    transcriptEndTime: context.endTime,
    modelUsed: 'llama-3.3-70b-versatile'
  });

  setIsStreaming(false);
  setStreamingResponse('');
  clearSelectedContext();
};
```

**Display streaming response:**
```tsx
{isStreaming && (
  <div className="message assistant streaming">
    <MessageContent content={streamingResponse} role="assistant" />
    <div className="typing-indicator">●●●</div>
  </div>
)}
```

### Phase 5: Database Integration

**File: `src/services/conversationDB.ts`**

```typescript
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(app.getPath('userData'), 'conversations.db');

export async function saveSessionToDB(session: RecordingSession) {
  // Initialize DB if not exists
  // Insert session
}

export async function saveConversationToDB(conversation: AIConversation) {
  // Insert conversation
}

export async function getSessionConversations(sessionId: string) {
  // Query conversations for session
}

export async function getAllSessions() {
  // Query all sessions ordered by date
}

export async function updateSessionMetadata(sessionId: string, metadata: any) {
  // Update session title, duration, etc.
}
```

**Electron IPC Handlers (public/electron.js):**
```javascript
ipcMain.handle('save-conversation', async (event, data) => {
  return await saveConversationToDB(data);
});

ipcMain.handle('get-session-conversations', async (event, sessionId) => {
  return await getSessionConversations(sessionId);
});

ipcMain.handle('get-all-sessions', async () => {
  return await getAllSessions();
});
```

### Phase 6: Session Switcher UI (Optional Future Enhancement)

**Component: `src/components/SessionSwitcher.tsx`**

- List all past recording sessions
- Show date, duration, transcript count
- Click to load that session's chat history
- Highlight current active session

---

## File Changes Required

### New Files to Create
1. `src/services/groqService.ts` - Groq API integration
2. `src/services/conversationDB.ts` - Database operations
3. `src/types/conversation.ts` - TypeScript types for sessions/conversations
4. `src/components/SessionSwitcher.tsx` - (Optional) Session navigation UI

### Files to Modify
1. `src/stores/appStore.ts` - Add session state management
2. `src/components/ChatPanel.tsx` - Implement streaming UI
3. `src/services/aiService.ts` - Replace with groqService or refactor
4. `public/electron.js` - Add IPC handlers for DB operations
5. `package.json` - Add Groq SDK dependency

### Files to Keep As-Is
1. `src/components/TranscriptPanelOptimized.tsx` - Cmd+D works fine
2. `src/components/ChatInput.tsx` - Context display works fine
3. `src/components/Header.tsx` - No changes needed

---

## Environment Setup

### Dependencies to Install
```bash
npm install groq-sdk
npm install better-sqlite3
npm install @types/better-sqlite3 --save-dev
```

### Environment Variables
```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxx  # User will provide new key
DEEPGRAM_API_KEY=xxxxxxxx        # Keep existing
```

---

## Testing Checklist

- [ ] Groq API connection successful
- [ ] Streaming responses display in real-time
- [ ] Context includes selected transcript + timestamps
- [ ] Conversations save to database correctly
- [ ] New recording creates new session
- [ ] Session ID links conversations properly
- [ ] Can load past session conversations
- [ ] Cmd+D selection still works
- [ ] Chat history clears on new recording
- [ ] Error handling for API failures

---

## Data Flow Diagram

```
User Starts Recording
  ↓
Create New Session (ID: session-123)
  ↓
Clear Chat History
  ↓
User Selects Transcript (Cmd+D)
  ↓
Context Stored: {text, startTime, endTime, speaker}
  ↓
User Sends Message
  ↓
Build Context:
  - Selected Transcript (PRIORITY)
  - Recent Chat History (last 6)
  - Current Session Metadata
  ↓
Send to Groq API (Stream)
  ↓
Display Chunks in Real-Time
  ↓
Save to Database:
  - session_id: session-123
  - user_message
  - ai_response
  - context_used
  - timestamps
  ↓
Conversation Added to Chat History
  ↓
User Stops Recording
  ↓
End Session (update ended_at, duration)
  ↓
Next Recording = New Session
```

---

## Success Criteria

1. ✅ Groq integration working with new API key
2. ✅ Responses stream in real-time (no waiting for full response)
3. ✅ Context includes transcript text + metadata (timestamps, speaker)
4. ✅ Every chat interaction persisted to database
5. ✅ Each recording session has isolated chat history
6. ✅ Starting new recording clears chat and creates new session
7. ✅ Cmd+D selection continues to work

---

## Notes

- Do NOT use Unpuzzle's Groq API key
- User will provide new Groq API key
- Database stored locally in Electron userData directory
- Session switcher UI is optional (can be added later)
- Focus on current session functionality first
- All conversations must save with session linkage

---

## Next Steps After Approval

1. Install dependencies (groq-sdk, better-sqlite3)
2. Create database schema and service
3. Implement Groq service with streaming
4. Update appStore for session management
5. Modify ChatPanel for streaming UI
6. Add Electron IPC handlers
7. Test end-to-end flow
8. Verify data persistence

---

**Ready to execute upon user confirmation.**
