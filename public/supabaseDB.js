const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

let supabase = null;

/**
 * Initialize Supabase client
 */
function initializeDB() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not found in environment variables');
    }

    supabase = createClient(supabaseUrl, supabaseKey);

    logger.debug('✅ Supabase client initialized');
    logger.debug('📍 Supabase URL:', supabaseUrl);
    return true;
  } catch (error) {
    logger.error('❌ Failed to initialize Supabase:', error);
    throw error;
  }
}

/**
 * Save a new recording session
 */
async function saveSession(session) {
  try {
    const { data, error } = await supabase
      .from('recording_sessions')
      .insert([{
        id: session.id,
        title: session.title || null,
        started_at: session.startedAt instanceof Date ? session.startedAt.toISOString() : session.startedAt,
        ended_at: session.endedAt ? (session.endedAt instanceof Date ? session.endedAt.toISOString() : session.endedAt) : null,
        duration: session.duration || null,
        transcript_count: session.transcriptCount || 0
      }])
      .select();

    if (error) throw error;

    logger.debug('✅ Session saved to Supabase:', session.id);
    return { success: true, id: session.id, data };
  } catch (error) {
    logger.error('❌ Failed to save session:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update session metadata (when recording ends)
 */
async function updateSession(sessionId, updates) {
  try {
    const updateData = {};

    if (updates.title !== undefined) {
      updateData.title = updates.title;
    }
    if (updates.description !== undefined) {
      updateData.description = updates.description;
    }
    if (updates.endedAt !== undefined) {
      updateData.ended_at = updates.endedAt instanceof Date ? updates.endedAt.toISOString() : updates.endedAt;
    }
    if (updates.duration !== undefined) {
      updateData.duration = updates.duration;
    }
    if (updates.transcriptCount !== undefined) {
      updateData.transcript_count = updates.transcriptCount;
    }

    if (Object.keys(updateData).length === 0) {
      return { success: true };
    }

    const { data, error } = await supabase
      .from('recording_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select();

    if (error) throw error;

    logger.debug('✅ Session updated in Supabase:', sessionId);
    return { success: true, data };
  } catch (error) {
    logger.error('❌ Failed to update session:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save an AI conversation
 */
async function saveConversation(conversation) {
  try {
    const { data, error } = await supabase
      .from('ai_conversations')
      .insert([{
        id: conversation.id,
        session_id: conversation.sessionId,
        user_message: conversation.userMessage,
        ai_response: conversation.aiResponse,
        context_used: conversation.contextUsed || null,
        selected_transcript: conversation.selectedTranscript || null,
        transcript_start_time: conversation.transcriptStartTime || null,
        transcript_end_time: conversation.transcriptEndTime || null,
        speaker_info: conversation.speakerInfo || null,
        model_used: conversation.modelUsed || 'llama-3.3-70b-versatile'
      }])
      .select();

    if (error) throw error;

    logger.debug('✅ Conversation saved to Supabase:', conversation.id);
    return { success: true, id: conversation.id, data };
  } catch (error) {
    logger.error('❌ Failed to save conversation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all conversations for a session
 */
async function getSessionConversations(sessionId) {
  try {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Format dates
    const formattedConversations = data.map(conv => ({
      ...conv,
      createdAt: new Date(conv.created_at)
    }));

    logger.debug(`✅ Retrieved ${data.length} conversations for session:`, sessionId);
    return { success: true, conversations: formattedConversations };
  } catch (error) {
    logger.error('❌ Failed to get conversations:', error);
    return { success: false, error: error.message, conversations: [] };
  }
}

/**
 * Get all recording sessions
 */
async function getAllSessions() {
  try {
    const { data, error } = await supabase
      .from('recording_sessions')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    // Format dates
    const formattedSessions = data.map(session => ({
      ...session,
      startedAt: new Date(session.started_at),
      endedAt: session.ended_at ? new Date(session.ended_at) : null
    }));

    logger.debug(`✅ Retrieved ${data.length} sessions from Supabase`);
    return { success: true, sessions: formattedSessions };
  } catch (error) {
    logger.error('❌ Failed to get sessions:', error);
    return { success: false, error: error.message, sessions: [] };
  }
}

/**
 * Get a single session by ID
 */
async function getSession(sessionId) {
  try {
    const { data, error } = await supabase
      .from('recording_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) throw error;

    if (!data) {
      return { success: false, error: 'Session not found' };
    }

    // Format dates
    const formattedSession = {
      ...data,
      startedAt: new Date(data.started_at),
      endedAt: data.ended_at ? new Date(data.ended_at) : null
    };

    return { success: true, session: formattedSession };
  } catch (error) {
    logger.error('❌ Failed to get session:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save a transcript entry
 */
async function saveTranscript(transcript) {
  try {
    const { data, error } = await supabase
      .from('transcripts')
      .insert([{
        id: transcript.id,
        session_id: transcript.sessionId,
        text: transcript.text,
        timestamp: transcript.timestamp instanceof Date ? transcript.timestamp.toISOString() : transcript.timestamp,
        is_interim: transcript.isInterim || false,
        speaker: transcript.speaker || null
      }])
      .select();

    if (error) throw error;

    logger.debug('✅ Transcript saved to Supabase:', transcript.id);
    return { success: true, id: transcript.id, data };
  } catch (error) {
    logger.error('❌ Failed to save transcript:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all transcripts for a session
 */
async function getSessionTranscripts(sessionId) {
  try {
    const { data, error } = await supabase
      .from('transcripts')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });

    if (error) throw error;

    // Format dates
    const formattedTranscripts = data.map(transcript => ({
      ...transcript,
      timestamp: new Date(transcript.timestamp),
      isInterim: transcript.is_interim
    }));

    logger.debug(`✅ Retrieved ${data.length} transcripts for session:`, sessionId);
    return { success: true, transcripts: formattedTranscripts };
  } catch (error) {
    logger.error('❌ Failed to get transcripts:', error);
    return { success: false, error: error.message, transcripts: [] };
  }
}

/**
 * Update transcript text
 */
async function updateTranscript(transcriptId, text) {
  try {
    const { data, error } = await supabase
      .from('transcripts')
      .update({ text: text })
      .eq('id', transcriptId)
      .select();

    if (error) throw error;

    logger.debug('✅ Transcript updated in Supabase:', transcriptId);
    return { success: true, data };
  } catch (error) {
    logger.error('❌ Failed to update transcript:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a session and all its conversations
 */
async function deleteSession(sessionId) {
  try {
    // Delete transcripts first (foreign key constraint)
    const { error: transcriptError } = await supabase
      .from('transcripts')
      .delete()
      .eq('session_id', sessionId);

    if (transcriptError) throw transcriptError;

    // Delete conversations (foreign key constraint)
    const { error: convError } = await supabase
      .from('ai_conversations')
      .delete()
      .eq('session_id', sessionId);

    if (convError) throw convError;

    // Delete session
    const { error: sessionError } = await supabase
      .from('recording_sessions')
      .delete()
      .eq('id', sessionId);

    if (sessionError) throw sessionError;

    logger.debug('✅ Session deleted from Supabase:', sessionId);
    return { success: true };
  } catch (error) {
    logger.error('❌ Failed to delete session:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Close database connection (no-op for Supabase, but kept for compatibility)
 */
function closeDB() {
  logger.debug('📁 Supabase client closed (no action needed)');
}

module.exports = {
  initializeDB,
  saveSession,
  updateSession,
  saveConversation,
  getSessionConversations,
  saveTranscript,
  getSessionTranscripts,
  updateTranscript,
  getAllSessions,
  getSession,
  deleteSession,
  closeDB
};
