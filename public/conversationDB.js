const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const logger = require('./logger');

let db = null;

/**
 * Initialize the database
 * Creates tables if they don't exist
 */
function initializeDB() {
  try {
    const dbPath = path.join(app.getPath('userData'), 'conversations.db');
    logger.debug('📁 Initializing database at:', dbPath);

    db = new Database(dbPath);

    // Enable WAL mode for better performance
    db.pragma('journal_mode = WAL');

    // Create recording_sessions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS recording_sessions (
        id TEXT PRIMARY KEY,
        title TEXT,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        duration INTEGER,
        transcript_count INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Create ai_conversations table
    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        user_message TEXT NOT NULL,
        ai_response TEXT NOT NULL,
        context_used TEXT,
        selected_transcript TEXT,
        transcript_start_time REAL,
        transcript_end_time REAL,
        speaker_info TEXT,
        model_used TEXT DEFAULT 'llama-3.3-70b-versatile',
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (session_id) REFERENCES recording_sessions(id)
      )
    `);

    // Create indexes for faster queries
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_conversations_session
      ON ai_conversations(session_id);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_started
      ON recording_sessions(started_at DESC);
    `);

    logger.debug('✅ Database initialized successfully');
    return true;
  } catch (error) {
    logger.error('❌ Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Save a new recording session
 */
function saveSession(session) {
  try {
    const stmt = db.prepare(`
      INSERT INTO recording_sessions (id, title, started_at, ended_at, duration, transcript_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      session.id,
      session.title || null,
      session.startedAt instanceof Date ? session.startedAt.getTime() : session.startedAt,
      session.endedAt ? (session.endedAt instanceof Date ? session.endedAt.getTime() : session.endedAt) : null,
      session.duration || null,
      session.transcriptCount || 0
    );

    logger.debug('✅ Session saved:', session.id);
    return { success: true, id: session.id };
  } catch (error) {
    logger.error('❌ Failed to save session:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update session metadata (when recording ends)
 */
function updateSession(sessionId, updates) {
  try {
    const fields = [];
    const values = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.endedAt !== undefined) {
      fields.push('ended_at = ?');
      values.push(updates.endedAt instanceof Date ? updates.endedAt.getTime() : updates.endedAt);
    }
    if (updates.duration !== undefined) {
      fields.push('duration = ?');
      values.push(updates.duration);
    }
    if (updates.transcriptCount !== undefined) {
      fields.push('transcript_count = ?');
      values.push(updates.transcriptCount);
    }

    if (fields.length === 0) {
      return { success: true };
    }

    values.push(sessionId);
    const sql = `UPDATE recording_sessions SET ${fields.join(', ')} WHERE id = ?`;

    const stmt = db.prepare(sql);
    stmt.run(...values);

    logger.debug('✅ Session updated:', sessionId);
    return { success: true };
  } catch (error) {
    logger.error('❌ Failed to update session:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save an AI conversation
 */
function saveConversation(conversation) {
  try {
    const stmt = db.prepare(`
      INSERT INTO ai_conversations (
        id, session_id, user_message, ai_response,
        context_used, selected_transcript,
        transcript_start_time, transcript_end_time,
        speaker_info, model_used
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      conversation.id,
      conversation.sessionId,
      conversation.userMessage,
      conversation.aiResponse,
      conversation.contextUsed || null,
      conversation.selectedTranscript || null,
      conversation.transcriptStartTime || null,
      conversation.transcriptEndTime || null,
      conversation.speakerInfo || null,
      conversation.modelUsed || 'llama-3.3-70b-versatile'
    );

    logger.debug('✅ Conversation saved:', conversation.id);
    return { success: true, id: conversation.id };
  } catch (error) {
    logger.error('❌ Failed to save conversation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all conversations for a session
 */
function getSessionConversations(sessionId) {
  try {
    const stmt = db.prepare(`
      SELECT * FROM ai_conversations
      WHERE session_id = ?
      ORDER BY created_at ASC
    `);

    const conversations = stmt.all(sessionId);

    // Convert timestamps back to Date objects
    const formattedConversations = conversations.map(conv => ({
      ...conv,
      createdAt: new Date(conv.created_at * 1000)
    }));

    logger.debug(`✅ Retrieved ${conversations.length} conversations for session:`, sessionId);
    return { success: true, conversations: formattedConversations };
  } catch (error) {
    logger.error('❌ Failed to get conversations:', error);
    return { success: false, error: error.message, conversations: [] };
  }
}

/**
 * Get all recording sessions
 */
function getAllSessions() {
  try {
    const stmt = db.prepare(`
      SELECT * FROM recording_sessions
      ORDER BY started_at DESC
      LIMIT 100
    `);

    const sessions = stmt.all();

    // Convert timestamps back to Date objects
    const formattedSessions = sessions.map(session => ({
      ...session,
      startedAt: new Date(session.started_at * 1000),
      endedAt: session.ended_at ? new Date(session.ended_at * 1000) : null
    }));

    logger.debug(`✅ Retrieved ${sessions.length} sessions`);
    return { success: true, sessions: formattedSessions };
  } catch (error) {
    logger.error('❌ Failed to get sessions:', error);
    return { success: false, error: error.message, sessions: [] };
  }
}

/**
 * Get a single session by ID
 */
function getSession(sessionId) {
  try {
    const stmt = db.prepare(`
      SELECT * FROM recording_sessions WHERE id = ?
    `);

    const session = stmt.get(sessionId);

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    // Convert timestamps back to Date objects
    const formattedSession = {
      ...session,
      startedAt: new Date(session.started_at * 1000),
      endedAt: session.ended_at ? new Date(session.ended_at * 1000) : null
    };

    return { success: true, session: formattedSession };
  } catch (error) {
    logger.error('❌ Failed to get session:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a session and all its conversations
 */
function deleteSession(sessionId) {
  try {
    // Delete conversations first (foreign key constraint)
    const deleteConvs = db.prepare('DELETE FROM ai_conversations WHERE session_id = ?');
    deleteConvs.run(sessionId);

    // Delete session
    const deleteSession = db.prepare('DELETE FROM recording_sessions WHERE id = ?');
    deleteSession.run(sessionId);

    logger.debug('✅ Session deleted:', sessionId);
    return { success: true };
  } catch (error) {
    logger.error('❌ Failed to delete session:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Close database connection
 */
function closeDB() {
  if (db) {
    db.close();
    logger.debug('📁 Database closed');
  }
}

module.exports = {
  initializeDB,
  saveSession,
  updateSession,
  saveConversation,
  getSessionConversations,
  getAllSessions,
  getSession,
  deleteSession,
  closeDB
};
