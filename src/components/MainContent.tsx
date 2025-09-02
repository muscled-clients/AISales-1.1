import React from 'react';
import { useAppStore } from '../stores/appStore';
import TranscriptPanelOptimized from './TranscriptPanelOptimized';
import TodoPanel from './TodoPanel';
import ChatPanel from './ChatPanel';
import SettingsPanel from './SettingsPanel';

const MainContent: React.FC = () => {
  const showSettings = useAppStore((state) => state.showSettings);
  const setShowSettings = useAppStore((state) => state.setShowSettings);
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

          {/* Action Items Panel - Commented out as requested */}
          {/* <div className="modern-panel">
            <div className="modern-panel-header">
              <h3 style={{ flex: 1 }}>
                ✅ Todos
              </h3>
            </div>
            <div className="modern-panel-body">
              <TodoPanel />
            </div>
          </div> */}

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