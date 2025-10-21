import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RecordingSession } from '../types';
import logger from '../utils/logger';
import './SessionHistory.css';

const SessionHistory: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<RecordingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<{ sessionId: string; field: 'title' | 'description' } | null>(null);
  const [editText, setEditText] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!hasLoaded) {
      loadSessions();
      setHasLoaded(true);
    }
  }, [hasLoaded]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!window.electronAPI || !(window.electronAPI as any).getAllSessions) {
        throw new Error('Electron API not available');
      }

      const result = await (window.electronAPI as any).getAllSessions();

      if (result.success) {
        setSessions(result.sessions || []);
        logger.debug('✅ Loaded sessions:', result.sessions.length);
      } else {
        throw new Error(result.error || 'Failed to load sessions');
      }
    } catch (err) {
      logger.error('❌ Failed to load sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleEditField = (sessionId: string, field: 'title' | 'description', currentValue: string) => {
    setEditingField({ sessionId, field });
    setEditText(currentValue);
  };

  const handleSaveEdit = async () => {
    if (!editingField) return;

    const { sessionId, field } = editingField;
    const trimmedText = editText.trim();

    if (!trimmedText) {
      setEditingField(null);
      return;
    }

    try {
      // Update in database
      const result = await (window.electronAPI as any).updateSession(sessionId, {
        [field]: trimmedText
      });

      if (result.success) {
        // Update local state
        setSessions(sessions.map(s =>
          s.id === sessionId ? { ...s, [field]: trimmedText } : s
        ));
        logger.debug(`✅ Updated session ${field}:`, sessionId);
      } else {
        throw new Error(result.error || `Failed to update ${field}`);
      }
    } catch (err) {
      logger.error(`❌ Failed to update session ${field}:`, err);
      setError(err instanceof Error ? err.message : `Failed to update ${field}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setEditingField(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditText('');
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
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

  // Group sessions by date category
  const groupSessionsByDate = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const groups: Record<string, RecordingSession[]> = {
      'Today': [],
      'Yesterday': [],
      'Previous 7 Days': [],
      'Previous 30 Days': [],
      'Older': []
    };

    sessions.forEach(session => {
      const sessionDate = new Date(session.startedAt);
      const sessionDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());

      if (sessionDay.getTime() === today.getTime()) {
        groups['Today'].push(session);
      } else if (sessionDay.getTime() === yesterday.getTime()) {
        groups['Yesterday'].push(session);
      } else if (sessionDay >= sevenDaysAgo) {
        groups['Previous 7 Days'].push(session);
      } else if (sessionDay >= thirtyDaysAgo) {
        groups['Previous 30 Days'].push(session);
      } else {
        groups['Older'].push(session);
      }
    });

    // Filter out empty groups
    return Object.entries(groups).filter(([_, sessions]) => sessions.length > 0);
  };

  const sessionGroups = groupSessionsByDate();

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigating to session when clicking delete

    if (!window.confirm('Are you sure you want to delete this session? This will also delete all conversations and transcripts.')) {
      return;
    }

    try {
      setDeletingId(sessionId);

      if (!window.electronAPI || !(window.electronAPI as any).deleteSession) {
        throw new Error('Electron API not available');
      }

      const result = await (window.electronAPI as any).deleteSession(sessionId);

      if (result.success) {
        logger.debug('✅ Session deleted:', sessionId);
        // Remove from local state
        setSessions(sessions.filter(s => s.id !== sessionId));
      } else {
        throw new Error(result.error || 'Failed to delete session');
      }
    } catch (err) {
      logger.error('❌ Failed to delete session:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete session');
      setTimeout(() => setError(null), 5000);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="session-history-container">
      <div className="session-history-content">
        <div className="history-header">
          <button className="back-button" onClick={() => navigate('/')}>
            ← Back to Home
          </button>

          <div className="header-title">
            <h1>📚 Session History</h1>
            <p className="subtitle">View all your past recording sessions and conversations</p>
          </div>

          <button className="refresh-button" onClick={loadSessions} disabled={loading}>
            🔄 Refresh
          </button>
        </div>

        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading sessions...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <p>❌ {error}</p>
            <button onClick={loadSessions}>Try Again</button>
          </div>
        )}

        {!loading && !error && sessions.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No sessions yet</h3>
            <p>Start a recording to create your first session</p>
            <button onClick={() => navigate('/ai-sales-assistant')}>
              Go to AI Sales Assistant
            </button>
          </div>
        )}

        {!loading && !error && sessions.length > 0 && (
          <div className="sessions-list">
            {sessionGroups.map(([groupName, groupSessions]) => (
              <div key={groupName} className="session-group">
                <h2 className="group-header">{groupName}</h2>
                <div className="group-sessions">
                  {groupSessions.map((session) => {
                    const isEditingTitle = editingField?.sessionId === session.id && editingField?.field === 'title';
                    const isEditingDesc = editingField?.sessionId === session.id && editingField?.field === 'description';

                    return (
                      <div
                        key={session.id}
                        className="session-card"
                        onClick={() => {
                          if (!editingField) {
                            navigate(`/ai-sales-assistant?sessionId=${session.id}`);
                          }
                        }}
                      >
                        <div className="session-content">
                          <div className="session-main">
                            {isEditingTitle ? (
                              <input
                                type="text"
                                className="session-title-input"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onBlur={handleSaveEdit}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit();
                                  if (e.key === 'Escape') handleCancelEdit();
                                }}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                              />
                            ) : (
                              <h3
                                className="session-title"
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  handleEditField(session.id, 'title', session.title || 'Untitled Session');
                                }}
                                title="Double-click to edit"
                              >
                                {session.title || 'Untitled Session'}
                              </h3>
                            )}

                            {isEditingDesc ? (
                              <textarea
                                className="session-description-input"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onBlur={handleSaveEdit}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSaveEdit();
                                  }
                                  if (e.key === 'Escape') handleCancelEdit();
                                }}
                                onClick={(e) => e.stopPropagation()}
                                rows={2}
                                autoFocus
                              />
                            ) : (
                              <p
                                className="session-preview"
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  handleEditField(session.id, 'description', session.description || 'No description');
                                }}
                                title="Double-click to edit"
                              >
                                {session.description || 'No description'}
                              </p>
                            )}
                          </div>
                          <div className="session-meta">
                            <span className="session-time">{formatDate(session.startedAt)}</span>
                            {session.duration && (
                              <span className="session-duration">
                                ⏱️ {formatDuration(session.duration)}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          className="delete-button"
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          disabled={deletingId === session.id}
                          title="Delete session"
                        >
                          {deletingId === session.id ? '⏳' : '🗑️'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionHistory;
