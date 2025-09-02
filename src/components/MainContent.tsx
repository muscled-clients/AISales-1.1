import React from 'react';
import { useAppStore } from '../stores/appStore';
import TranscriptPanelOptimized from './TranscriptPanelOptimized';
import TodoPanel from './TodoPanel';
import ChatPanel from './ChatPanel';
import SettingsPanel from './SettingsPanel';

const MainContent: React.FC = () => {
  const showSettings = useAppStore((state) => state.showSettings);
  const setShowSettings = useAppStore((state) => state.setShowSettings);
  const showTodos = useAppStore((state) => state.showTodos);
  const recording = useAppStore((state) => state.recording);
  const transcripts = useAppStore((state) => state.transcripts);
  const todos = useAppStore((state) => state.todos);
  const chatHistory = useAppStore((state) => state.chatHistory);

  if (showSettings) {
    return (
      <div className="main-content">
        <div className="settings-overlay">
          <div className="settings-header">
            <h2>⚙️ Settings</h2>
            <button 
              className="close-settings"
              onClick={() => setShowSettings(false)}
            >
              ✕
            </button>
          </div>
          <SettingsPanel />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main Content Area */}
      <div className="main-content">
        {/* Three Equal Panels with Modern UI */}
        <div className="modern-three-panel">
          {/* Transcripts Panel */}
          <div className="modern-panel">
            <div className="modern-panel-header">
              <h3 style={{ flex: 1 }}>
                📝 Live Transcripts
              </h3>
              {recording.isRecording && (
                <span style={{
                  background: '#ef4444',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  animation: 'recordingPulse 2s infinite'
                }}>● LIVE</span>
              )}
            </div>
            <div className="modern-panel-body">
              <TranscriptPanelOptimized />
            </div>
          </div>


          {/* AI Assistant Panel */}
          <div className="modern-panel">
            <div className="modern-panel-header">
              <h3 style={{ flex: 1 }}>
                🤖 AI Assistant
              </h3>
              <span style={{
                fontSize: '11px',
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>Ask Anything</span>
            </div>
            <div className="modern-panel-body">
              <ChatPanel />
            </div>
          </div>
        </div>

      </div>

      {/* Floating Todos Panel */}
      {showTodos && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          width: '350px',
          maxHeight: '500px',
          background: 'rgba(30, 41, 59, 0.98)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backdropFilter: 'blur(10px)'
        }}>
          {/* Todos Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: '600',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              ✅ Action Items
              {todos.length > 0 && (
                <span style={{
                  background: '#007acc',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: '500'
                }}>
                  {todos.filter(t => !t.completed).length}
                </span>
              )}
            </h3>
            <button
              onClick={() => useAppStore.getState().setShowTodos(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#666',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '0 4px',
                lineHeight: '1'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
            >
              ×
            </button>
          </div>
          
          {/* Todos Content */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px'
          }}>
            <TodoPanel />
          </div>
        </div>
      )}

      {/* Modern Footer */}
      <div className="modern-footer">
        <div className="status-live">
          <span className="status-dot"></span>
          <span>{recording.isRecording ? 'Recording' : 'Ready'}</span>
        </div>
        <div>
          AI Sales Assistant v1.0.0
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>© 2024 Muscled Inc</span>
        </div>
      </div>
    </>
  );
};

export default MainContent;