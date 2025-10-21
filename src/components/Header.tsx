import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';
import logger from '../utils/logger';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { recording, startRecording, stopRecording, setShowSettings, showTodos, setShowTodos, loadFakeTranscripts, viewingHistoricalSession, profile, signOut } = useAppStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      logger.error('Sign out failed:', error);
    }
  };

  const handleRecordingToggle = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      if (recording.isRecording) {
        // Stop recording
        logger.debug('🛑 Stopping recording...');
        await stopRecording();
        logger.debug('✅ Recording stopped successfully');
      } else {
        // Start recording
        logger.debug('🎬 Starting recording...');
        const started = await startRecording();
        
        if (started) {
          logger.debug('✅ Recording started successfully');
        } else {
          throw new Error('Failed to start recording');
        }
      }
    } catch (error) {
      logger.error('❌ Recording toggle failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      
      // Show error to user temporarily
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsProcessing(false);
    }
  };


  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle menu item click
  const handleMenuItemClick = (action: string) => {
    if (action === 'settings') {
      setShowSettings(true);
    }
    setShowMenu(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // Update duration every second when recording
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (recording.isRecording && recording.startTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recording.startTime!.getTime()) / 1000);
        // We don't call setRecording here to avoid triggering re-renders
        // The duration will be calculated on-demand for display
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [recording.isRecording, recording.startTime]);

  // Calculate current duration for display
  const currentDuration = recording.isRecording && recording.startTime
    ? Math.floor((Date.now() - recording.startTime.getTime()) / 1000)
    : recording.duration;

  return (
    <div className="modern-header" style={{ 
      position: 'relative',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingLeft: '16px',
      zIndex: 1000
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#e0e0e0',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '6px 12px',
            borderRadius: '6px',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          }}
          title="Back to Home"
        >
          ← Home
        </button>

        {/* Hamburger Menu */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#e0e0e0',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'background 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            title="Menu"
          >
            ☰
          </button>
          
          {/* Dropdown Menu */}
          {showMenu && (
            <div style={{
              position: 'fixed',
              top: '60px',
              left: '16px',
              background: 'rgba(30, 41, 59, 0.98)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
              minWidth: '180px',
              zIndex: 99999,
              overflow: 'hidden'
            }}>
              <button
                onClick={() => {
                  navigate('/session-history');
                  setShowMenu(false);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  color: '#e0e0e0',
                  fontSize: '14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                📚 Session History
              </button>

              <button
                onClick={() => handleMenuItemClick('settings')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  color: '#e0e0e0',
                  fontSize: '14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                ⚙️ Settings
              </button>

              <button
                onClick={() => {
                  loadFakeTranscripts();
                  setShowMenu(false);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  color: '#e0e0e0',
                  fontSize: '14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                🎭 Load Test Transcripts
              </button>

              {/* Divider */}
              <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '4px 0' }} />

              {/* User Info */}
              {profile && (
                <div style={{
                  padding: '12px 16px',
                  color: '#888',
                  fontSize: '12px'
                }}>
                  {profile.full_name || profile.email}
                  <div style={{ color: '#666', fontSize: '11px', marginTop: '2px' }}>
                    {profile.role === 'admin' ? '👑 Admin' : '👤 Employee'}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  handleSignOut();
                  setShowMenu(false);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  color: '#dc3545',
                  fontSize: '14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220, 53, 69, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                🚪 Sign Out
              </button>
            </div>
          )}
        </div>

        <h1 style={{
          fontSize: '18px',
          margin: 0,
          padding: 0,
          textAlign: 'left',
          flex: '0 0 auto',
          color: '#ffffff',
          fontWeight: 700
        }}>Muscled Sales AI Assistant</h1>
      </div>
      
      <div className="header-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

        {error && (
          <span style={{
            color: '#dc3545',
            fontSize: '12px',
            marginRight: '12px',
            background: 'rgba(220, 53, 69, 0.1)',
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid rgba(220, 53, 69, 0.3)'
          }}>
            ❌ {error}
          </span>
        )}

        {recording.isRecording && (
          <span style={{
            color: '#dc3545',
            fontSize: '14px',
            fontWeight: '500',
            marginRight: '12px'
          }}>
            🔴 {formatDuration(currentDuration)}
          </span>
        )}

        <button
          onClick={() => navigate('/session-history')}
          style={{
            padding: '6px 12px',
            background: 'transparent',
            border: '1px solid rgba(255, 193, 7, 0.5)',
            borderRadius: '6px',
            color: '#ffc107',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            transition: 'all 0.2s',
            marginRight: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 193, 7, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          title="View all sessions"
        >
          📚 Sessions
        </button>

        <button
          onClick={() => setShowTodos(!showTodos)}
          style={{
            padding: '6px 12px',
            background: showTodos ? 'rgba(0, 122, 204, 0.2)' : 'transparent',
            border: '1px solid rgba(0, 122, 204, 0.5)',
            borderRadius: '6px',
            color: '#007acc',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            transition: 'all 0.2s',
            marginRight: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 122, 204, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = showTodos ? 'rgba(0, 122, 204, 0.2)' : 'transparent'}
          title={showTodos ? "Hide Todos" : "Show Todos"}
        >
          ✅ Todos
        </button>
        
        <button
          className={`btn ${recording.isRecording ? 'recording' : ''}`}
          onClick={handleRecordingToggle}
          disabled={isProcessing || viewingHistoricalSession}
          style={{
            opacity: (isProcessing || viewingHistoricalSession) ? 0.7 : 1,
            cursor: (isProcessing || viewingHistoricalSession) ? 'not-allowed' : 'pointer'
          }}
          title={viewingHistoricalSession ? 'Cannot record while viewing historical session' : ''}
        >
          {isProcessing ? (
            <>⏳ {recording.isRecording ? 'Stopping...' : 'Starting...'}</>
          ) : recording.isRecording ? (
            <>⏹️ Stop Sales AI</>
          ) : (
            <>🎤 Activate Sales AI</>
          )}
        </button>
      </div>
    </div>
  );
};

export default Header;