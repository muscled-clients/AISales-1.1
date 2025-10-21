import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RecordingSession, AIConversation } from '../types';
import logger from '../utils/logger';
import './SessionDetail.css';

const SessionDetail: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<RecordingSession | null>(null);
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      loadSessionData();
    }
  }, [sessionId]);

  const loadSessionData = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      setError(null);

      if (!window.electronAPI || !(window.electronAPI as any).getSession) {
        throw new Error('Electron API not available');
      }

      // Load session details
      const sessionResult = await (window.electronAPI as any).getSession(sessionId);
      if (!sessionResult.success) {
        throw new Error(sessionResult.error || 'Failed to load session');
      }
      setSession(sessionResult.session);

      // Load conversations
      const conversationsResult = await (window.electronAPI as any).getSessionConversations(sessionId);
      if (!conversationsResult.success) {
        throw new Error(conversationsResult.error || 'Failed to load conversations');
      }
      setConversations(conversationsResult.conversations || []);

      logger.debug('✅ Loaded session and conversations:', {
        session: sessionResult.session,
        conversationCount: conversationsResult.conversations?.length || 0
      });
    } catch (err) {
      logger.error('❌ Failed to load session data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="session-detail-container">
      <div className="session-detail-content">
        {/* Header */}
        <div className="detail-header">
          <button className="back-button" onClick={() => navigate('/session-history')}>
            ← Back to Sessions
          </button>

          {session && (
            <div className="session-info">
              <h1>{session.title || 'Untitled Session'}</h1>
              <div className="session-meta">
                <span className="meta-item">
                  📅 {formatDate(session.startedAt)}
                </span>
                {session.duration && (
                  <span className="meta-item">
                    ⏱️ {formatDuration(session.duration)}
                  </span>
                )}
                <span className="meta-item">
                  💬 {conversations.length} conversations
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading session details...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="error-state">
            <p>❌ {error}</p>
            <button onClick={loadSessionData}>Try Again</button>
          </div>
        )}

        {/* Conversations List */}
        {!loading && !error && conversations.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">💭</div>
            <h3>No conversations yet</h3>
            <p>No AI conversations were recorded in this session</p>
          </div>
        )}

        {!loading && !error && conversations.length > 0 && (
          <div className="conversations-list">
            {conversations.map((conversation, index) => (
              <div key={conversation.id} className="conversation-item">
                <div className="conversation-header">
                  <span className="conversation-number">#{index + 1}</span>
                  <span className="conversation-time">
                    {formatTime(conversation.createdAt)}
                  </span>
                  <span className="conversation-model">{conversation.modelUsed}</span>
                </div>

                {/* User Message */}
                <div className="message user-message">
                  <div className="message-label">
                    <span className="message-icon">👤</span>
                    <span>You asked:</span>
                  </div>
                  <div className="message-content">{conversation.userMessage}</div>
                </div>

                {/* Context Used */}
                {conversation.selectedTranscript && (
                  <div className="context-box">
                    <div className="context-label">
                      <span className="context-icon">📝</span>
                      <span>Transcript Context</span>
                      {conversation.transcriptStartTime !== undefined &&
                       conversation.transcriptEndTime !== undefined && (
                        <span className="context-timestamp">
                          {Math.floor(conversation.transcriptStartTime)}s - {Math.floor(conversation.transcriptEndTime)}s
                        </span>
                      )}
                      {conversation.speakerInfo && (
                        <span className="context-speaker">{conversation.speakerInfo}</span>
                      )}
                    </div>
                    <div className="context-content">{conversation.selectedTranscript}</div>
                  </div>
                )}

                {/* AI Response */}
                <div className="message ai-message">
                  <div className="message-label">
                    <span className="message-icon">🤖</span>
                    <span>AI responded:</span>
                  </div>
                  <div className="message-content">{conversation.aiResponse}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionDetail;
